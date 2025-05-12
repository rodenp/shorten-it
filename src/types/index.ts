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
  deepLinkConfig?: Record<string, string>; // e.g., { ios: "yourapp://path", android: "yourapp://path" }
  abTestConfig?: { variantAUrl: string; variantBUrl: string; splitPercentage: number };
  retargetingPixels?: { platform: string; pixelId: string }[];
  tags?: string[];
  title?: string;
  groupId?: string; // Added for link groups
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
