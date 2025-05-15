export interface LinkTarget {
  url: string;
  weight?: number; // For URL rotation or A/B testing split
}

export interface LinkGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
  linkCount?: number; // Optional: to display how many links are in this group
}

export interface RetargetingPixel {
  id: string;
  userId?: string; // Foreign key to User table
  name: string;
  type: 'Facebook Pixel' | 'Google Ads Tag' | 'LinkedIn Insight Tag' | 'Custom';
  pixelIdValue: string; // The actual ID/tag from the platform
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
}


export interface LinkItem {
  id:string;
  userId?: string; // Added userId for clarity on ownership
  originalUrl: string; 
  targets: LinkTarget[]; 
  shortUrl: string;
  slug: string;
  clickCount: number;
  createdAt: string; 
  updatedAt?: string; 
  customDomain?: string; // This is the domain NAME, not ID
  customDomainId?: string; // Keep the ID for linking if needed separately
  isCloaked?: boolean;
  deepLinkConfig?: { iosAppUriScheme: string; androidAppUriScheme: string; fallbackUrl?: string };
  abTestConfig?: { variantAUrl: string; variantBUrl: string; splitPercentage: number };
  retargetingPixels?: RetargetingPixel[]; // Changed to full RetargetingPixel objects
  tags?: string[];
  title?: string;
  groupId?: string; 
  groupName?: string; // Added for displaying group name directly
}

export interface AnalyticEvent {
  id: string;
  linkId: string;
  timestamp: string; 
  ipAddress?: string; 
  userAgent?: string;
  country?: string;
  city?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  referrer?: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string; 
}

export interface TeamMember extends UserProfile {
  role: 'admin' | 'editor' | 'viewer';
  teamMembershipId?: string; // Optional: if fetched via teamService, this might be populated
  membershipCreatedAt?: string;
  membershipUpdatedAt?: string;
}


export interface CustomDomain {
  id: string;
  userId?: string; // Added userId for clarity on ownership
  domainName: string;
  verified: boolean;
  createdAt: string;
  updatedAt?: string; 
}

export interface ApiKey {
  id: string;
  userId?: string; // Added userId for clarity on ownership
  name: string;
  key?: string; // The actual API key string (only shown on creation)
  prefix: string; 
  createdAt: string; 
  updatedAt?: string; 
  lastUsedAt?: string; 
  permissions?: string[]; 
}
