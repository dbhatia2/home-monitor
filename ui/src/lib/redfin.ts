/**
 * Generate Redfin search URL from home address
 * Uses direct search format for better reliability
 * Address format: "123 Main St, Tracy, CA" -> extract street address only
 */
export function generateRedfinUrl(address: string, city: string, state: string): string {
  // Extract just the street address (before first comma)
  const streetAddress = address.split(',')[0].trim();

  // Format: https://www.redfin.com/city/[state]/[city]/[address]
  // Convert address for URL: "123 Main St" -> "123-Main-St"
  const urlAddress = streetAddress.replace(/\s+/g, '-').replace(/\./g, '');

  // Use simple search URL format
  const searchQuery = encodeURIComponent(`${streetAddress}, ${city}, ${state}`);
  return `https://www.redfin.com/?searchQuery=${searchQuery}`;
}
