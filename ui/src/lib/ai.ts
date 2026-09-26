import type { Home } from "@/lib/types";

export interface AnalysisResult {
  homes: Home[];
  explanation: string;
}

export function analyzeHomesQuery(query: string, allHomes: Home[], lastShownHomes?: Home[]): AnalysisResult {
  const lowerQuery = query.toLowerCase();

  // Check if asking about specific home analysis (pros/cons, details, etc)
  if (isAskingAboutSpecificHome(lowerQuery)) {
    return analyzeSpecificHome(query, lowerQuery, allHomes, lastShownHomes);
  }

  // Determine if they want ONE thing or MULTIPLE things
  const wantsSingle = detectSingularIntent(lowerQuery);

  // Parse what they're looking for
  const priceRange = extractPriceRange(lowerQuery);
  const filters = {
    cities: extractCities(lowerQuery),
    maxPrice: priceRange.max || extractMaxPrice(lowerQuery),
    minPrice: priceRange.min || extractMinPrice(lowerQuery),
    beds: extractBeds(lowerQuery),
    baths: extractBaths(lowerQuery),
    minSqft: extractMinSqft(lowerQuery),
    maxSqft: extractMaxSqft(lowerQuery),
    builders: extractBuilders(lowerQuery, allHomes),
    count: wantsSingle ? 1 : extractCount(lowerQuery),
  };

  let filtered = [...allHomes];
  let explanationParts: string[] = [];

  // Apply city filter
  if (filters.cities.length > 0) {
    filtered = filtered.filter(h =>
      filters.cities.some(city => h.city.toLowerCase().includes(city))
    );
    explanationParts.push(`in ${filters.cities.join(", ")}`);
  }

  // Apply price filters
  if (filters.maxPrice) {
    filtered = filtered.filter(h => h.price <= filters.maxPrice!);
    explanationParts.push(`under $${(filters.maxPrice / 1000).toFixed(0)}K`);
  }
  if (filters.minPrice) {
    filtered = filtered.filter(h => h.price >= filters.minPrice!);
    explanationParts.push(`over $${(filters.minPrice / 1000).toFixed(0)}K`);
  }

  // Apply bedroom filter
  if (filters.beds) {
    filtered = filtered.filter(h => h.beds >= filters.beds!);
    explanationParts.push(`${filters.beds}+ beds`);
  }

  // Apply bathroom filter
  if (filters.baths) {
    filtered = filtered.filter(h => {
      const bathNum = parseFloat(h.baths);
      return !isNaN(bathNum) && bathNum >= filters.baths!;
    });
    explanationParts.push(`${filters.baths}+ baths`);
  }

  // Apply builder filter
  if (filters.builders.length > 0) {
    filtered = filtered.filter(h =>
      filters.builders.some(builder => h.builder.toLowerCase().includes(builder))
    );
    explanationParts.push(`by ${filters.builders.join(", ")}`);
  }

  // Apply sqft filters
  if (filters.minSqft) {
    filtered = filtered.filter(h => h.sqft >= filters.minSqft!);
    explanationParts.push(`at least ${filters.minSqft.toLocaleString()} sqft`);
  }
  if (filters.maxSqft) {
    filtered = filtered.filter(h => h.sqft > 0 && h.sqft <= filters.maxSqft!);
  }

  // Determine what they're asking for
  let sortedHomes = [...filtered];
  let intent = determineIntent(lowerQuery);

  switch (intent) {
    case "price_drops":
      sortedHomes = sortedHomes.filter(h => h.price_drop === 1 && h.price_drop_amt > 0);
      sortedHomes.sort((a, b) => b.price_drop_amt - a.price_drop_amt);
      break;

    case "best_value":
      sortedHomes = sortedHomes.filter(h => h.sqft > 0 && h.price > 0);
      sortedHomes.sort((a, b) => (a.price / a.sqft) - (b.price / b.sqft));
      break;

    case "largest":
      sortedHomes = sortedHomes.filter(h => h.sqft > 0);
      sortedHomes.sort((a, b) => b.sqft - a.sqft);
      break;

    case "cheapest":
      sortedHomes.sort((a, b) => a.price - b.price);
      break;

    case "most_expensive":
      sortedHomes.sort((a, b) => b.price - a.price);
      break;

    case "move_in_ready":
      sortedHomes = sortedHomes.filter(h =>
        h.status === "MOVE_IN_READY" || h.status === "QUICK_MOVE_IN"
      );
      break;

    case "new_listings":
      sortedHomes = sortedHomes.filter(h => h.new_listing === 1);
      break;

    default:
      // Default to best value
      sortedHomes = sortedHomes.filter(h => h.sqft > 0 && h.price > 0);
      sortedHomes.sort((a, b) => (a.price / a.sqft) - (b.price / b.sqft));
  }

  // Limit results
  const limit = filters.count || (wantsSingle ? 1 : 5);
  const topResults = sortedHomes.slice(0, limit);

  // Generate smart explanation
  const explanation = generateSmartExplanation(topResults, explanationParts, intent, query, wantsSingle);

  return {
    homes: topResults,
    explanation,
  };
}

function detectSingularIntent(query: string): boolean {
  // Patterns that indicate they want ONE thing
  const singularPatterns = [
    /\b(the|which is|what's|whats)\s+(best|biggest|largest|cheapest|most expensive|top)\b/i,
    /\bgive me (the|a)\b/i,
    /\bshow me (the|a)\b/i,
    /\bfind (the|a)\b/i,
    /\bwhat (is|has)\s+(the)\b/i,
    /\bwhich (one|home|house)\b/i,
  ];

  // Words that indicate singular
  const singularWords = ['the best', 'the biggest', 'the largest', 'the cheapest', 'which one', 'what is'];

  return singularPatterns.some(pattern => pattern.test(query)) ||
         singularWords.some(word => query.includes(word));
}

function isAskingAboutSpecificHome(query: string): boolean {
  const specificPatterns = [
    /\b(this|that|the first|the second|number \d+)\s+(home|house|property|listing|one)/i,
    /\b(pros?|cons?|advantage|disadvantage|good|bad|worth)\s+(and|&)?\s*(cons?|pros?|advantage|disadvantage)?/i,
    /tell me (more )?about/i,
    /what (do you think|are your thoughts)/i,
    /should (i|we|he|she|they)/i,
    /is (this|it|that) (worth|good|bad)/i,
    /compare (this|that|it)/i,
    /details? (about|on|for)/i,
  ];

  return specificPatterns.some(pattern => pattern.test(query));
}

function analyzeSpecificHome(
  originalQuery: string,
  lowerQuery: string,
  allHomes: Home[],
  lastShownHomes?: Home[]
): AnalysisResult {
  let targetHome: Home | null = null;

  // Check if they mentioned a specific community, address, or builder
  for (const home of allHomes) {
    if (lowerQuery.includes(home.community.toLowerCase()) ||
        lowerQuery.includes(home.address.toLowerCase()) ||
        (home.plan_name && lowerQuery.includes(home.plan_name.toLowerCase()))) {
      targetHome = home;
      break;
    }
  }

  // If no specific home found, use the first from last shown homes
  if (!targetHome && lastShownHomes && lastShownHomes.length > 0) {
    targetHome = lastShownHomes[0];
  }

  if (!targetHome && allHomes.length > 0) {
    targetHome = allHomes.find(h => h.price_drop === 1) ||
                 allHomes.filter(h => h.sqft > 0 && h.price > 0)
                         .sort((a, b) => (a.price / a.sqft) - (b.price / b.sqft))[0];
  }

  if (!targetHome) {
    return {
      homes: [],
      explanation: "I don't see any homes to analyze right now. Could you ask me to find some homes first?"
    };
  }

  const analysis = generateDetailedAnalysis(targetHome, lowerQuery);

  return {
    homes: [targetHome],
    explanation: analysis
  };
}

function generateDetailedAnalysis(home: Home, query: string): string {
  const ppsf = home.sqft > 0 ? Math.round(home.price / home.sqft) : 0;

  let response = `Alright, let's talk about **${home.community}** in ${home.city}.\n\n`;

  response += `**The basics:**\n`;
  response += `💰 ${formatPrice(home.price)}`;
  if (home.price_drop === 1 && home.price_drop_amt > 0) {
    response += ` (dropped from ${formatPrice(home.prev_price || home.was_price || 0)})`;
  }
  response += `\n`;
  response += `🏠 ${home.beds} beds, ${home.baths} baths`;
  if (home.sqft > 0) {
    response += ` • ${home.sqft.toLocaleString()} sqft (${formatPrice(ppsf)}/sqft)`;
  }
  response += `\n`;
  response += `🏗️ ${home.builder}\n`;
  response += `📍 ${home.status.replace(/_/g, ' ')}\n\n`;

  // Pros
  response += `**What's good:**\n`;
  const pros: string[] = [];

  if (home.price_drop === 1 && home.price_drop_amt > 0) {
    pros.push(`Just dropped ${formatPrice(home.price_drop_amt)} - seller's motivated`);
  }

  if (home.status === "MOVE_IN_READY" || home.status === "QUICK_MOVE_IN") {
    pros.push("Move in now, no waiting");
  }

  if (ppsf > 0 && ppsf < 350) {
    pros.push(`Solid value at ${formatPrice(ppsf)}/sqft for this area`);
  }

  if (home.sqft >= 2500) {
    pros.push("Spacious - won't feel cramped");
  }

  if (home.beds >= 4) {
    pros.push(`${home.beds} bedrooms - room for everyone`);
  }

  if (home.new_listing === 1) {
    pros.push("Fresh listing - not sitting on market");
  }

  if (pros.length === 0) {
    pros.push("Decent option for the location");
  }

  pros.forEach(pro => response += `• ${pro}\n`);

  // Cons
  response += `\n**Watch out for:**\n`;
  const cons: string[] = [];

  if (home.status === "UNDER_CONSTRUCTION") {
    cons.push("Still building - gonna be a wait");
  }

  if (home.status === "COMING_SOON") {
    cons.push("Not available yet - could be months");
  }

  if (ppsf > 0 && ppsf > 450) {
    cons.push(`${formatPrice(ppsf)}/sqft is steep for this market`);
  }

  if (home.beds < 3) {
    cons.push("Only 2 beds - could feel tight");
  }

  if (home.sqft > 0 && home.sqft < 1500) {
    cons.push("On the smaller side");
  }

  if (home.is_55_plus === 1) {
    cons.push("55+ community - age restricted");
  }

  if (!home.price_drop && home.price > 800000) {
    cons.push("No price drop yet - might have room to negotiate");
  }

  if (cons.length === 0) {
    cons.push("Nothing major that I can see");
  }

  cons.forEach(con => response += `• ${con}\n`);

  // Bottom line
  response += `\n**Bottom line:** `;

  if (home.price_drop === 1 && home.price_drop_amt > 0 && ppsf < 400) {
    response += `Worth looking at. Price drop + decent value = worth your time to visit.`;
  } else if (home.status === "MOVE_IN_READY" && ppsf < 400) {
    response += `If timing matters, this works. Good value and you can close quick.`;
  } else if (ppsf > 450) {
    response += `You're paying premium pricing here. Better make sure you really love it.`;
  } else {
    response += `Middle of the pack. Not amazing, not terrible. Depends what matters to you.`;
  }

  return response;
}

function generateSmartExplanation(
  homes: Home[],
  filterParts: string[],
  intent: string,
  originalQuery: string,
  wantsSingle: boolean
): string {
  if (homes.length === 0) {
    return "Nothing matches that. Try loosening up the requirements?";
  }

  const filterText = filterParts.length > 0 ? ` ${filterParts.join(", ")}` : "";

  let intro = "";

  if (wantsSingle && homes.length === 1) {
    const h = homes[0];
    const ppsf = h.sqft > 0 ? Math.round(h.price / h.sqft) : 0;

    switch (intent) {
      case "price_drops":
        intro = `**The biggest price drop${filterText}:**\n`;
        intro += `${h.community} in ${h.city} dropped ${formatPrice(h.price_drop_amt)} `;
        intro += `(now ${formatPrice(h.price)})`;
        if (ppsf > 0) intro += ` - that's ${formatPrice(ppsf)}/sqft`;
        intro += `\n\n${h.beds} bed, ${h.baths} bath`;
        if (h.sqft > 0) intro += ` • ${h.sqft.toLocaleString()} sqft`;
        intro += `\nBuilt by ${h.builder}`;
        return intro;

      case "best_value":
        intro = `**Best value home${filterText}:**\n`;
        intro += `${h.community} in ${h.city} at ${formatPrice(ppsf)}/sqft `;
        intro += `(${formatPrice(h.price)} total)`;
        intro += `\n\n${h.beds} bed, ${h.baths} bath • ${h.sqft.toLocaleString()} sqft`;
        intro += `\nBuilt by ${h.builder}`;
        if (h.price_drop === 1) intro += `\n\nBonus: Just dropped ${formatPrice(h.price_drop_amt)}`;
        return intro;

      case "largest":
        intro = `**Biggest home${filterText}:**\n`;
        intro += `${h.community} in ${h.city} - ${h.sqft.toLocaleString()} sqft of space\n`;
        intro += `${formatPrice(h.price)} • ${h.beds} bed, ${h.baths} bath`;
        if (ppsf > 0) intro += ` • ${formatPrice(ppsf)}/sqft`;
        intro += `\nBuilt by ${h.builder}`;
        return intro;

      case "cheapest":
        intro = `**Cheapest option${filterText}:**\n`;
        intro += `${h.community} in ${h.city} for ${formatPrice(h.price)}\n`;
        intro += `${h.beds} bed, ${h.baths} bath`;
        if (h.sqft > 0) intro += ` • ${h.sqft.toLocaleString()} sqft (${formatPrice(ppsf)}/sqft)`;
        intro += `\nBuilt by ${h.builder}`;
        return intro;

      default:
        intro = `**Top pick${filterText}:**\n`;
        intro += `${h.community} in ${h.city}\n`;
        intro += `${formatPrice(h.price)} • ${h.beds} bed, ${h.baths} bath`;
        if (h.sqft > 0) intro += ` • ${h.sqft.toLocaleString()} sqft`;
        intro += `\nBuilt by ${h.builder}`;
        if (h.price_drop === 1) intro += `\n\nJust dropped ${formatPrice(h.price_drop_amt)}`;
        return intro;
    }
  }

  // Multiple homes
  switch (intent) {
    case "price_drops":
      intro = `Got ${homes.length} with price drops${filterText}:\n\n`;
      break;
    case "best_value":
      const avgPpsf = Math.round(homes.reduce((sum, h) => sum + (h.price / h.sqft), 0) / homes.length);
      intro = `${homes.length} good deals${filterText} (avg ${formatPrice(avgPpsf)}/sqft):\n\n`;
      break;
    case "largest":
      const avgSqft = Math.round(homes.reduce((sum, h) => sum + h.sqft, 0) / homes.length);
      intro = `${homes.length} big ones${filterText} (avg ${avgSqft.toLocaleString()} sqft):\n\n`;
      break;
    case "move_in_ready":
      intro = `${homes.length} ready now${filterText}:\n\n`;
      break;
    default:
      intro = `Found ${homes.length}${filterText}:\n\n`;
  }

  const homesList = homes.map((h, i) => {
    const ppsf = h.sqft > 0 ? Math.round(h.price / h.sqft) : 0;
    let line = `${i + 1}. **${h.community}** - ${h.city}\n`;
    line += `   ${formatPrice(h.price)} • ${h.beds} bed, ${h.baths} bath`;

    if (h.sqft > 0) {
      line += ` • ${h.sqft.toLocaleString()} sqft`;
      if (ppsf > 0) line += ` (${formatPrice(ppsf)}/sqft)`;
    }

    if (h.price_drop === 1 && h.price_drop_amt > 0) {
      line += `\n   📉 Dropped ${formatPrice(h.price_drop_amt)}`;
    }

    if (h.status === "MOVE_IN_READY" || h.status === "QUICK_MOVE_IN") {
      line += `\n   ✓ Move-in ready`;
    }

    return line;
  }).join("\n\n");

  let suggestions = "\n\nWant details on any of these? Just ask.";

  return intro + homesList + suggestions;
}

function formatPrice(num: number): string {
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(0)}K`;
  }
  return `$${num}`;
}

function extractCities(query: string): string[] {
  const cities = ["tracy", "dublin", "roseville", "mountain house"];
  return cities.filter(city => query.includes(city));
}

function extractPriceRange(query: string): { min: number | null; max: number | null } {
  // Handle "between X and Y" pattern
  const betweenPattern = /between\s+\$?([\d,]+)k?\s+and\s+\$?([\d,]+)k?/i;
  const match = query.match(betweenPattern);

  if (match) {
    let min = parseInt(match[1].replace(/,/g, ""));
    let max = parseInt(match[2].replace(/,/g, ""));

    // If numbers are small (like 700), multiply by 1000 to get 700K
    if (min < 10000) min *= 1000;
    if (max < 10000) max *= 1000;

    return { min, max };
  }

  return { min: null, max: null };
}

function extractBuilders(query: string, allHomes: Home[]): string[] {
  // Get unique builders from all homes
  const allBuilders = [...new Set(allHomes.map(h => h.builder.toLowerCase()))];

  // Common builder abbreviations and variations
  const builderMap: Record<string, string> = {
    'kb': 'kb home',
    'dr horton': 'dr horton',
    'lennar': 'lennar',
    'pulte': 'pulte',
    'richmond': 'richmond american',
    'toll': 'toll brothers',
    'taylor morrison': 'taylor morrison',
    'brookfield': 'brookfield',
  };

  const found: string[] = [];

  // Check if query mentions any builder
  for (const [key, value] of Object.entries(builderMap)) {
    if (query.includes(key)) {
      // Find the actual builder name from available homes
      const matchingBuilder = allBuilders.find(b => b.includes(value));
      if (matchingBuilder) {
        found.push(matchingBuilder);
      }
    }
  }

  // Also check for exact builder names in the query
  for (const builder of allBuilders) {
    if (query.includes(builder) && !found.includes(builder)) {
      found.push(builder);
    }
  }

  return found;
}

function extractBaths(query: string): number | null {
  // Match patterns like "3 bath", "3 bathroom", "3+ baths", "3.5 bathrooms"
  const patterns = [
    /(\d+(?:\.\d+)?)\+?\s*(bath(?:room)?s?)/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  return null;
}

function extractMaxPrice(query: string): number | null {
  const patterns = [
    /under\s+\$?([\d,]+)k/i,
    /below\s+\$?([\d,]+)k/i,
    /less than\s+\$?([\d,]+)k/i,
    /max\s+\$?([\d,]+)k/i,
    /maximum\s+\$?([\d,]+)k/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      return parseInt(match[1].replace(/,/g, "")) * 1000;
    }
  }

  const fullMatch = query.match(/under\s+\$?([\d,]+)/i);
  if (fullMatch) {
    const num = parseInt(fullMatch[1].replace(/,/g, ""));
    if (num > 100000) return num;
  }

  return null;
}

function extractMinPrice(query: string): number | null {
  const patterns = [
    /over\s+\$?([\d,]+)k/i,
    /above\s+\$?([\d,]+)k/i,
    /more than\s+\$?([\d,]+)k/i,
    /min\s+\$?([\d,]+)k/i,
    /minimum\s+\$?([\d,]+)k/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      return parseInt(match[1].replace(/,/g, "")) * 1000;
    }
  }

  return null;
}

function extractBeds(query: string): number | null {
  const match = query.match(/(\d+)\+?\s*(bed|br)/i);
  return match ? parseInt(match[1]) : null;
}

function extractMinSqft(query: string): number | null {
  const patterns = [
    /over\s+([\d,]+)\s*sqft/i,
    /above\s+([\d,]+)\s*sqft/i,
    /at least\s+([\d,]+)\s*sqft/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      return parseInt(match[1].replace(/,/g, ""));
    }
  }

  return null;
}

function extractMaxSqft(query: string): number | null {
  const patterns = [
    /under\s+([\d,]+)\s*sqft/i,
    /below\s+([\d,]+)\s*sqft/i,
    /less than\s+([\d,]+)\s*sqft/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      return parseInt(match[1].replace(/,/g, ""));
    }
  }

  return null;
}

function extractCount(query: string): number | null {
  const numberWords: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10
  };

  for (const [word, num] of Object.entries(numberWords)) {
    const wordPattern = new RegExp(`\\b${word}\\s+(home|house|listing|propert(y|ies))`, 'i');
    if (wordPattern.test(query)) {
      return num;
    }
  }

  const digitPatterns = [
    /\b(\d+)\s+(home|house|listing|propert(y|ies))/i,
    /(?:show|give|find|get)\s+(?:me\s+)?(\d+)/i,
    /top\s+(\d+)/i,
  ];

  for (const pattern of digitPatterns) {
    const match = query.match(pattern);
    if (match) {
      const num = parseInt(match[1]);
      if (num > 0 && num <= 20) {
        return num;
      }
    }
  }

  return null;
}

function determineIntent(query: string): string {
  if (query.includes("price drop") || query.includes("discount") || query.includes("reduced")) {
    return "price_drops";
  }
  if (query.includes("best value") || query.includes("best deal") || query.includes("bang for buck") ||
      query.includes("$/sqft") || query.includes("dollar per square")) {
    return "best_value";
  }
  if (query.includes("largest") || query.includes("biggest") || query.includes("most space") ||
      query.includes("spacious")) {
    return "largest";
  }
  if (query.includes("cheapest") || query.includes("lowest price") || query.includes("most affordable")) {
    return "cheapest";
  }
  if (query.includes("most expensive") || query.includes("luxury") || query.includes("premium")) {
    return "most_expensive";
  }
  if (query.includes("move-in ready") || query.includes("quick move") || query.includes("ready now")) {
    return "move_in_ready";
  }
  if (query.includes("new listing") || query.includes("just listed") || query.includes("newest")) {
    return "new_listings";
  }
  return "general";
}
