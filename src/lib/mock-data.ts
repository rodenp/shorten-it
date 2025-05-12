import type { LinkItem, AnalyticEvent, CustomDomain, TeamMember } from '@/types';

let linksDB: LinkItem[] = [
  {
    id: '1',
    originalUrl: 'https://example.com/very-long-url-that-needs-shortening',
    targets: [{ url: 'https://example.com/very-long-url-that-needs-shortening' }],
    shortUrl: 'https://lnk.wiz/abc12',
    slug: 'abc12',
    clickCount: 1256,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'My Example Link',
    customDomain: 'brand.co',
    isCloaked: false,
    tags: ['marketing', 'promo'],
  },
  {
    id: '2',
    originalUrl: 'https://another-example.io/another-long-feature-page',
    targets: [{ url: 'https://another-example.io/another-long-feature-page' }],
    shortUrl: 'https://lnk.wiz/def34',
    slug: 'def34',
    clickCount: 872,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'Feature Page Q2',
    isCloaked: true,
    deepLinkConfig: { ios: 'myapp://product/123', android: 'myapp://product/123' },
    tags: ['product', 'mobile'],
  },
];

let analyticsEventsDB: AnalyticEvent[] = [
  {
    id: 'evt1',
    linkId: '1',
    timestamp: new Date().toISOString(),
    country: 'USA',
    deviceType: 'desktop',
    browser: 'Chrome',
    referrer: 'google.com',
  },
   {
    id: 'evt2',
    linkId: '2',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    country: 'Canada',
    deviceType: 'mobile',
    browser: 'Safari',
    referrer: 'twitter.com',
  },
];

let customDomainsDB: CustomDomain[] = [
  { id: 'cd1', domainName: 'brand.co', verified: true, createdAt: new Date().toISOString() },
  { id: 'cd2', domainName: 'my.links', verified: false, createdAt: new Date().toISOString() },
];

let teamMembersDB: TeamMember[] = [
  { id: 'tm1', name: 'Alice Wonderland', email: 'alice@example.com', role: 'admin' },
  { id: 'tm2', name: 'Bob The Builder', email: 'bob@example.com', role: 'editor' },
];

// --- Link Functions ---
export const getMockLinks = (): LinkItem[] => {
  return JSON.parse(JSON.stringify(linksDB)); // Return a deep copy
};

export const getLinksCount = (): number => {
  return linksDB.length;
};

export const getTotalClicks = (): number => {
  return linksDB.reduce((sum, link) => sum + link.clickCount, 0);
};

const generateSlug = () => {
  let slug = Math.random().toString(36).substring(2, 8);
  while (linksDB.some(l => l.slug === slug)) {
    slug = Math.random().toString(36).substring(2, 8);
  }
  return slug;
}

export const addMockLink = (
  linkData: {
    originalUrl: string;
    customAlias?: string;
    title?: string;
    tags?: string; // comma-separated
    enableRotation?: boolean; // Not fully implemented for mock
    enableCloaking?: boolean;
    enableDeepLinking?: boolean;
    deepLinkIOS?: string;
    deepLinkAndroid?: string;
    enableABTesting?: boolean;
    abTestVariantBUrl?: string;
    enableRetargeting?: boolean;
    retargetingPixelId?: string;
    // customDomain?: string; // Not used in form yet directly
  }
): LinkItem => {
  const slug = linkData.customAlias || generateSlug();

  // Check for slug collision if customAlias is provided
  if (linkData.customAlias && linksDB.some(l => l.slug === linkData.customAlias)) {
    // In a real app, you'd throw an error or handle this more gracefully
    // For mock purposes, we can append a random suffix or just let it be (user will see duplicate slugs)
    // For now, let's assume the form validation or user is aware.
    console.warn(`Custom alias ${linkData.customAlias} already exists. Proceeding, but this might cause issues.`);
  }
  
  const newLink: LinkItem = {
    id: Date.now().toString() + Math.random().toString(16).substring(2), // More robust mock ID
    originalUrl: linkData.originalUrl,
    targets: [{ url: linkData.originalUrl }], // Simplified: one target
    shortUrl: `https://lnk.wiz/${slug}`, // Assuming a default domain
    slug: slug,
    clickCount: 0,
    createdAt: new Date().toISOString(),
    title: linkData.title,
    isCloaked: linkData.enableCloaking,
    tags: linkData.tags ? linkData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    deepLinkConfig: linkData.enableDeepLinking 
      ? { ios: linkData.deepLinkIOS || '', android: linkData.deepLinkAndroid || '' } 
      : undefined,
    abTestConfig: linkData.enableABTesting 
      ? { variantA: linkData.originalUrl, variantB: linkData.abTestVariantBUrl || '', split: 50 } // Simplified A/B
      : undefined,
    retargetingPixels: linkData.enableRetargeting && linkData.retargetingPixelId 
      ? [{ platform: 'custom', pixelId: linkData.retargetingPixelId }] // Simplified
      : undefined,
  };
  linksDB.unshift(newLink); // Add to the beginning to show up as recent
  return JSON.parse(JSON.stringify(newLink));
};

export const deleteMockLink = (linkId: string): boolean => {
  const initialLength = linksDB.length;
  linksDB = linksDB.filter(link => link.id !== linkId);
  return linksDB.length < initialLength;
};

export const getMockLinkBySlugOrId = (slugOrId: string): LinkItem | undefined => {
  const link = linksDB.find(l => l.slug === slugOrId || l.id === slugOrId);
  return link ? JSON.parse(JSON.stringify(link)) : undefined;
};

// --- Analytics Event Functions ---
export const getMockAnalyticsEvents = (): AnalyticEvent[] => {
  return JSON.parse(JSON.stringify(analyticsEventsDB));
};

export const getAnalyticsForLink = (linkId: string): AnalyticEvent[] => {
  return JSON.parse(JSON.stringify(analyticsEventsDB.filter(event => event.linkId === linkId)));
};

// --- Custom Domain Functions ---
export const getMockCustomDomains = (): CustomDomain[] => {
  return JSON.parse(JSON.stringify(customDomainsDB));
};

// --- Team Member Functions ---
export const getMockTeamMembers = (): TeamMember[] => {
  return JSON.parse(JSON.stringify(teamMembersDB));
};

// --- Chart Data Function (uses current linksDB) ---
export const getMockAnalyticsChartDataForLink = (linkId: string, days: number = 7): { date: string; clicks: number }[] => {
  const data: { date: string; clicks: number }[] = [];
  const link = linksDB.find(l => l.id === linkId);
  const baseClicks = link ? Math.floor(link.clickCount / (days > 0 ? days : 1)) : 20;

  if (days <= 0) {
    return [];
  }
  const numPoints = Math.max(1, Math.min(days, 30));

  for (let i = 0; i < numPoints; i++) {
    const currentDate = new Date();
    const dayOffset = Math.floor((days / numPoints) * i);
    currentDate.setDate(currentDate.getDate() - dayOffset);
    
    data.push({
      date: currentDate.toISOString().split('T')[0],
      clicks: Math.max(0, baseClicks + Math.floor(Math.random() * 20) - 10 + Math.floor(Math.random() * (parseInt(linkId, 10) % 5))),
    });
  }
  return data.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()); 
};

// Expose the original mockLinks array for pages that might still be using it directly,
// but encourage use of new functions.
export const mockLinks = linksDB; 
export const mockAnalyticsEvents = analyticsEventsDB;
export const mockCustomDomains = customDomainsDB;
export const mockTeamMembers = teamMembersDB;
// Keep the old function name for compatibility if some components still use it, 
// but it now calls the new chart data function.
export const getMockAnalyticsForLink = getMockAnalyticsChartDataForLink;
