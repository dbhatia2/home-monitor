/**
 * Generate property listing URLs for various platforms
 * Zillow is the primary platform as it has the best sold homes data
 */

export interface PropertyLinks {
  zillow: string;
  realtor: string;
  redfin: string;
}

/**
 * Generate Zillow URL (primary platform for sold homes)
 * Format: https://www.zillow.com/homes/{address}-{city}-{state}_rb/
 */
export function generateZillowUrl(address: string, city: string, state: string): string {
  // Extract street address (before first comma)
  const streetAddress = address.split(',')[0].trim();

  // Clean and format for URL
  const cleanAddr = streetAddress.replace(/[.,]/g, '');
  const cleanCity = city.replace(/[.,]/g, '');

  // Create URL slug: "123 Main St" -> "123-Main-St"
  const urlSlug = `${cleanAddr} ${cleanCity} ${state}`
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '');

  return `https://www.zillow.com/homes/${urlSlug}_rb/`;
}

/**
 * Generate Realtor.com URL (alternative platform)
 * Format: https://www.realtor.com/realestateandhomes-search/{City}_{ST}/{address}
 */
export function generateRealtorUrl(address: string, city: string, state: string): string {
  const streetAddress = address.split(',')[0].trim();
  const cleanAddr = streetAddress.replace(/[.,]/g, '');
  const cleanCity = city.replace(/\s+/g, '-').replace(/[.,]/g, '');

  const addrSlug = cleanAddr.replace(/\s+/g, '-');

  return `https://www.realtor.com/realestateandhomes-search/${cleanCity}_${state}/${addrSlug}`;
}

/**
 * Generate Redfin search URL (fallback option)
 * Uses simple search format
 */
export function generateRedfinUrl(address: string, city: string, state: string): string {
  const streetAddress = address.split(',')[0].trim();
  const searchQuery = encodeURIComponent(`${streetAddress}, ${city}, ${state}`);
  return `https://www.redfin.com/?searchQuery=${searchQuery}`;
}

/**
 * Get all property links for a given address
 */
export function getPropertyLinks(address: string, city: string, state: string): PropertyLinks {
  return {
    zillow: generateZillowUrl(address, city, state),
    realtor: generateRealtorUrl(address, city, state),
    redfin: generateRedfinUrl(address, city, state),
  };
}

/**
 * Get primary property URL (Zillow)
 * This is the recommended default for sold homes data
 */
export function getPrimaryPropertyUrl(address: string, city: string, state: string): string {
  return generateZillowUrl(address, city, state);
}
