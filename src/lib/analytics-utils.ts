import { UAParser } from 'ua-parser-js';

/**
 * Anonymizes an IP address.
 * For IPv4, it removes the last octet.
 * For IPv6, it zeroes out the last 64 bits (four hextets).
 * @param ip The IP address string.
 * @returns The anonymized IP address string, or the original if format is unrecognized.
 */
export function anonymizeIp(ip: string | undefined | null): string | undefined | null {
  if (!ip) {
    return ip;
  }

  if (ip.includes('.')) { // Likely IPv4
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  } else if (ip.includes(':')) { // Likely IPv6
    const parts = ip.split(':');
    if (parts.length === 8) {
      // Zero out the last four hextets (64 bits)
      return `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}:0:0:0:0`;
    }
    // Handle IPv6 shorthand (e.g., ::1) - this basic example doesn't fully expand/normalize yet.
    // For more robust IPv6 anonymization with shorthand, a library might be better or more complex logic.
    // This basic approach works for full IPv6 addresses.
    // A common approach is to truncate to /48 or /56, which means keeping the first 3 or 3.5 groups.
    // For simplicity, if it's a short IPv6, we might just keep the first few parts or return as is if too complex.
    // Let's try a slightly more robust IPv6 anonymization by ensuring we have at least 4 parts.
     if (parts.length >= 4) {
        return `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}:0:0:0:0`.split(':').slice(0,8).join(':');
     }
  }
  return ip; // Return original if not a recognized IPv4 or IPv6 format
}

/**
 * Parses a User-Agent string to extract device type, browser, and OS.
 * @param userAgentString The User-Agent string.
 * @returns An object with browser name, OS name, and device type/vendor/model.
 */
export function parseUserAgent(userAgentString: string | undefined | null): {
  browserName?: string;
  osName?: string;
  deviceType?: string;
  deviceVendor?: string;
  deviceModel?: string;
} {
  if (!userAgentString) {
    return {};
  }
  const parser = new UAParser(userAgentString);
  const result = parser.getResult();
  return {
    browserName: result.browser.name,
    osName: result.os.name,
    deviceType: result.device.type || 'desktop', // Default to desktop if type is undefined
    deviceVendor: result.device.vendor,
    deviceModel: result.device.model,
  };
}

/**
 * Extracts the hostname from a referrer URL.
 * @param referrerUrl The full referrer URL.
 * @returns The hostname of the referrer, or the original URL if parsing fails.
 */
export function getReferrerHostname(referrerUrl: string | undefined | null): string | undefined | null {
  if (!referrerUrl) {
    return referrerUrl;
  }
  try {
    const url = new URL(referrerUrl);
    return url.hostname;
  } catch (error) {
    // If URL parsing fails (e.g., malformed URL), return a truncated or null version.
    // For simplicity, returning null for malformed referrers to avoid storing potentially problematic strings.
    console.warn(`[Analytics Utils] Failed to parse referrer URL: ${referrerUrl}`, error);
    return null; 
  }
}

// Example GeoService interface (conceptual)
// In a real application, this would call a GeoIP database or service.
export interface GeoLocation {
  country?: string;
  city?: string;
}

export const geoService = {
  /**
   * Gets geolocation data from an IP address.
   * THIS IS A MOCK IMPLEMENTATION.
   * @param ip The original IP address.
   * @returns A promise that resolves to geolocation data.
   */
  async getGeoFromIp(ip: string | undefined | null): Promise<GeoLocation> {
    if (!ip) {
      return {};
    }
    // In a real implementation, you would use a service like MaxMind GeoIP
    // or an external API call here.
    // For GDPR, ensure this service is compliant and you have DPA if needed.
    // Example:
    // const response = await fetch(`https://your-geoip-service.com/json/${ip}`);
    // const data = await response.json();
    // return { country: data.country_code, city: data.city_name };

    // Mocked response for this example:
    if (ip.startsWith("192.168")) return { country: "XX", city: "Private Network" }; // Example private IP
    if (ip.startsWith("8.8.8")) return { country: "US", city: "Mountain View" }; // Example Google DNS
    return { country: "ZZ", city: "Unknown" }; // Default unknown
  }
};
