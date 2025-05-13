export interface LinkTarget {
  url: string;
  weight?: number; // For URL rotation or A/B testing split
}

export interface LinkGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: string; // ISO date string
  linkCount?: number; // Optional: to display how many links are in this group
}

export interface RetargetingPixel {
  id: string;
  name: string;
  type: 'Facebook Pixel' | 'Google Ads Tag' | 'LinkedIn Insight Tag' | 'Custom';
  pixelIdValue: string; // The actual ID/tag from the platform
  createdAt: string; // ISO date string
}


export interface LinkItem {
  id: string;
  originalUrl: string; // Represents the primary destination or Variant A in an A/B test.
  targets: LinkTarget[]; // Holds all destination URLs, including variants for A/B testing or rotation.
  shortUrl: string;
  slug: string;
  clickCount: number;
  createdAt: string; // ISO date string
  customDomain?: string;
  isCloaked?: boolean;
  deepLinkConfig?: { iosAppUriScheme: string; androidAppUriScheme: string; fallbackUrl?: string };
  abTestConfig?: { variantAUrl: string; variantBUrl: string; splitPercentage: number };
  // Storing an array of pixel objects directly associated with the link
  retargetingPixels?: { name: string; type: RetargetingPixel['type']; pixelIdValue: string }[];
  tags?: string[];
  title?: string;
  groupId?: string; 
}

export interface AnalyticEvent {
  id: string;
  linkId: string;
  timestamp: string; // ISO date string
  ipAddress?: string; // Anonymized or hashed
  userAgent?: string;
  country?: string;
  city?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  referrer?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

export interface CustomDomain {
  id: string;
  domainName: string;
  verified: boolean;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string; // The actual API key string (only shown on creation)
  prefix: string; // First few chars of the key for display
  createdAt: string; // ISO date string
  lastUsedAt?: string; // ISO date string, optional
  permissions?: string[]; // e.g., ['links:read', 'links:write']
}

