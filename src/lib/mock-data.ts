import type { LinkItem, AnalyticEvent, CustomDomain, TeamMember, LinkTarget } from '@/types';

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
   {
    id: '3',
    originalUrl: 'https://yet-another-site.org/blog/exciting-article-post',
    targets: [
      { url: 'https://yet-another-site.org/blog/article-variant-a', weight: 50 },
      { url: 'https://yet-another-site.org/blog/article-variant-b', weight: 50 }
    ],
    shortUrl: 'https://lnk.wiz/ghi56',
    slug: 'ghi56',
    clickCount: 3045,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'Blog Post A/B Test',
    abTestConfig: { variantA: 'https://yet-another-site.org/blog/article-variant-a', variantB: 'https://yet-another-site.org/blog/article-variant-b', split: 50 },
    tags: ['blog', 'ab-test'],
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
  {
    id: 'evt3',
    linkId: '3',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    country: 'UK',
    deviceType: 'desktop',
    browser: 'Firefox',
    referrer: 'linkedin.com',
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
  return linksDB.reduce((sum, link) => sum + (link.clickCount || 0), 0);
};

const generateMockId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

const generateSlug = () => {
  let slug = Math.random().toString(36).substring(2, 8);
  while (linksDB.some(l => l.slug === slug)) {
    slug = Math.random().toString(36).substring(2, 8);
  }
  return slug;
}

interface AddMockLinkParams {
  destinationUrls: string[]; // URLs for this specific link item. If A/B, [A, B]. If rotation, [url1, url2, ...]. Else [singleUrl]
  isRotation?: boolean;
  isABTest?: boolean;
  customAlias?: string;
  title?: string;
  tags?: string; // comma-separated
  isCloaked?: boolean;
  enableDeepLinking?: boolean;
  deepLinkIOS?: string;
  deepLinkAndroid?: string;
  enableRetargeting?: boolean;
  retargetingPixelId?: string;
}

export const addMockLink = (params: AddMockLinkParams): LinkItem => {
  const slug = params.customAlias || generateSlug();

  if (params.customAlias && linksDB.some(l => l.slug === params.customAlias)) {
    // This case should ideally be prevented by form validation or handled by appending to slug.
    // For mock, we'll proceed, potentially creating a duplicate slug if not handled by caller.
    console.warn(`Custom alias ${params.customAlias} may already exist or lead to conflicts if multiple links are created with the same alias.`);
  }
  
  const newLink: LinkItem = {
    id: generateMockId(),
    originalUrl: params.destinationUrls[0], // Primary URL for display
    shortUrl: `https://lnk.wiz/${slug}`,
    slug: slug,
    clickCount: 0,
    createdAt: new Date().toISOString(),
    title: params.title,
    tags: params.tags ? params.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    isCloaked: params.isCloaked,
    targets: [], // Will be populated below
    deepLinkConfig: params.enableDeepLinking && (params.deepLinkIOS || params.deepLinkAndroid)
      ? { ios: params.deepLinkIOS || '', android: params.deepLinkAndroid || '' }
      : undefined,
    abTestConfig: undefined, // Will be populated if isABTest is true
    retargetingPixels: params.enableRetargeting && params.retargetingPixelId
      ? [{ platform: 'custom', pixelId: params.retargetingPixelId }]
      : undefined,
  };

  if (params.isABTest && params.destinationUrls.length >= 2) {
    newLink.targets = [
      { url: params.destinationUrls[0], weight: 50 },
      { url: params.destinationUrls[1], weight: 50 },
    ];
    newLink.abTestConfig = { variantA: params.destinationUrls[0], variantB: params.destinationUrls[1], split: 50 };
  } else if (params.isRotation && params.destinationUrls.length > 0) {
    const numUrls = params.destinationUrls.length;
    let baseWeight = Math.floor(100 / numUrls);
    let remainder = 100 % numUrls;
    newLink.targets = params.destinationUrls.map((url, index) => {
      let weight = baseWeight + (index < remainder ? 1 : 0);
      return { url, weight };
    });
  } else {
    // Single destination URL
    newLink.targets = [{ url: params.destinationUrls[0] }];
  }
  
  linksDB.unshift(newLink);
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
  
  if (!link) return []; // If link not found, return empty data

  const baseClicks = Math.floor((link.clickCount || 0) / (days > 0 ? Math.min(days, (link.clickCount || 1)) : 1));


  if (days <= 0) {
    return [];
  }
  // Ensure numPoints is reasonable, especially if days is large. Max 30 points for chart.
  const numPoints = Math.max(1, Math.min(days, 30)); 

  for (let i = 0; i < numPoints; i++) {
    const currentDate = new Date();
    // Distribute points somewhat evenly over the 'days' period
    const dayOffset = Math.floor((days / numPoints) * (numPoints - 1 - i));
    currentDate.setDate(currentDate.getDate() - dayOffset);
    
    data.push({
      date: currentDate.toISOString().split('T')[0],
       // Make clicks vary a bit, ensure non-negative
      clicks: Math.max(0, baseClicks + Math.floor(Math.random() * (baseClicks * 0.5)) - Math.floor(baseClicks * 0.25) + (i % 5 - 2)),
    });
  }
  // Sort by date ascending for the chart
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

