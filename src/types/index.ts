export interface LinkTarget {
  url: string;
  weight?: number; // For URL rotation
}

export interface LinkItem {
  id: string;
  originalUrl: string; // Or multiple for rotation
  targets: LinkTarget[];
  shortUrl: string;
  slug: string;
  clickCount: number;
  createdAt: string; // ISO date string
  customDomain?: string;
  isCloaked?: boolean;
  deepLinkConfig?: Record<string, string>; // e.g., { ios: "yourapp://path", android: "yourapp://path" }
  abTestConfig?: { variantA: string; variantB: string; split: number };
  retargetingPixels?: { platform: string; pixelId: string }[];
  tags?: string[];
  title?: string;
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
