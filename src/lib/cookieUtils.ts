import { ConsentPreferences } from '@/types/consent'; // Assuming a type definition

const CONSENT_COOKIE_NAME = 'cookie_consent_preferences';
const CONSENT_COOKIE_MAX_AGE_DAYS = 180; // Approx 6 months

/**
 * Sets the cookie consent preferences.
 * @param preferences - An object with consent status for different categories.
 * @param maxAgeDays - Optional: Max age of the cookie in days. Defaults to CONSENT_COOKIE_MAX_AGE_DAYS.
 */
export function setConsentCookie(preferences: ConsentPreferences, maxAgeDays: number = CONSENT_COOKIE_MAX_AGE_DAYS): void {
  if (typeof window === 'undefined') {
    return; // Cannot set cookies on the server side directly this way
  }
  const expires = new Date();
  expires.setDate(expires.getDate() + maxAgeDays);
  const cookieValue = `json=${JSON.stringify(preferences)}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
  document.cookie = `${CONSENT_COOKIE_NAME}=${cookieValue}`;
}

/**
 * Gets the cookie consent preferences.
 * @returns An object with consent preferences, or null if the cookie is not set or not valid JSON.
 */
export function getConsentCookie(): ConsentPreferences | null {
  if (typeof window === 'undefined') {
    return null; // No document.cookie on server
  }
  const nameEQ = `${CONSENT_COOKIE_NAME}=json=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.startsWith(nameEQ)) {
      const jsonString = c.substring(nameEQ.length, c.length);
      try {
        return JSON.parse(jsonString) as ConsentPreferences;
      } catch (e) {
        console.error("Error parsing consent cookie JSON:", e);
        return null;
      }
    }
  }
  return null;
}

/**
 * Deletes the cookie consent preferences cookie.
 */
export function deleteConsentCookie(): void {
  if (typeof window === 'undefined') {
    return;
  }
  document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

/**
 * Gets the initial consent state, ensuring all defined categories have a boolean value.
 * Defaults to false for any category not explicitly set in the cookie.
 * Essential cookies are implicitly always true and not managed by this state for granting consent.
 * @returns ConsentPreferences object with all categories initialized.
 */
export function getInitialConsentState(): ConsentPreferences {
    const cookie = getConsentCookie();
    // Define all known controllable categories
    const defaultPreferences: ConsentPreferences = {
        analytics: false,
        functional: false,
        // marketing: false, // Add if marketing cookies are introduced
    };
    if (cookie) {
        return {
            ...defaultPreferences, // Ensure all keys are present
            ...cookie,             // Override with stored values
        };
    }
    return defaultPreferences;
}
