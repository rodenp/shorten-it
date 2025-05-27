export interface ConsentPreferences {
  analytics: boolean;
  functional: boolean;
  // marketing?: boolean; // Future consideration
}

// Could also include specific cookie names or script IDs if needed for finer control
// export type CookieCategory = 'essential' | 'analytics' | 'functional' | 'marketing';
// export type ConsentStatus = Record<CookieCategory, boolean>;
