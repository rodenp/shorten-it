
import type { LinkItem, AnalyticEvent, CustomDomain, TeamMember, LinkTarget } from '@/types';

const getShortenerDomain = (): string => {
  // Ensure this runs only on the client or in a server environment where process.env is available
  if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SHORTENER_DOMAIN) {
    return process.env.NEXT_PUBLIC_SHORTENER_DOMAIN;
  }
  // Fallback if NEXT_PUBLIC_SHORTENER_DOMAIN is not set or not in a Node.js environment
  return 'lnk.wiz'; 
};


let linksDB: LinkItem[] = [
  {
    id: '1',
    originalUrl: 'https://example.com/very-long-url-that-needs-shortening',
    targets: [{ url: 'https://example.com/very-long-url-that-needs-shortening' }],
    shortUrl: `https://brand.co/abc12`, 
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
    shortUrl: `https://${getShortenerDomain()}/def34`,
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
    originalUrl: 'https://yet-another-site.org/blog/exciting-article-post', // This effectively becomes variantA
    targets: [
      { url: 'https://yet-another-site.org/blog/article-variant-a', weight: 50 },
      { url: 'https://yet-another-site.org/blog/article-variant-b', weight: 50 }
    ],
    shortUrl: `https://${getShortenerDomain()}/ghi56`,
    slug: 'ghi56',
    clickCount: 3045,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'Blog Post A/B Test',
    abTestConfig: { variantA: 'https://yet-another-site.org/blog/article-variant-a', variantB: 'https://yet-another-site.org/blog/article-variant-b', split: 50 },
    tags: ['blog', 'ab-test'],
  },
  {
    id: '4',
    originalUrl: 'https://company.com/product-a', // This will be one of the rotation targets
    targets: [
        { url: 'https://company.com/product-a', weight: 34 },
        { url: 'https://company.com/product-b', weight: 33 },
        { url: 'https://company.com/product-c', weight: 33 },
    ],
    shortUrl: `https://${getShortenerDomain()}/jkl78`,
    slug: 'jkl78',
    clickCount: 550,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'Product Page Rotation',
    tags: ['ecommerce', 'rotation'],
    // No abTestConfig for pure rotation
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
   {
    id: 'evt4',
    linkId: '4',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    country: 'Germany',
    deviceType: 'mobile',
    browser: 'Chrome',
    referrer: 'facebook.com',
  },
];

let customDomainsDB: CustomDomain[] = [
  { id: 'cd1', domainName: 'brand.co', verified: true, createdAt: new Date().toISOString() },
  { id: 'cd2', domainName: 'my.links', verified: false, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'cd3', domainName: 'personal.click', verified: true, createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
];

let teamMembersDB: TeamMember[] = [
  { id: 'tm1', name: 'Alice Wonderland', email: 'alice@example.com', role: 'admin' },
  { id: 'tm2', name: 'Bob The Builder', email: 'bob@example.com', role: 'editor' },
];

const generateMockId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// --- Link Functions ---
export const getMockLinks = (): LinkItem[] => {
  const currentDomain = getShortenerDomain();
  return JSON.parse(JSON.stringify(linksDB.map(link => ({
    ...link,
    shortUrl: `https://${link.customDomain || currentDomain}/${link.slug}`
  }))));
};

export const getLinksCount = (): number => {
  return linksDB.length;
};

export const getTotalClicks = (): number => {
  return linksDB.reduce((sum, link) => sum + (link.clickCount || 0), 0);
};

const generateSlug = (domain?: string) => {
  let slug = Math.random().toString(36).substring(2, 8);
  const targetDomain = domain || getShortenerDomain();
  while (linksDB.some(l => l.slug === slug && (l.customDomain || getShortenerDomain()) === targetDomain)) {
    slug = Math.random().toString(36).substring(2, 8);
  }
  return slug;
}

interface AddMockLinkParams {
  destinationUrls: string[]; 
  isRotation?: boolean;
  isABTest?: boolean;
  customAlias?: string;
  title?: string;
  tags?: string; 
  isCloaked?: boolean;
  enableDeepLinking?: boolean; // This can be simplified, use deepLinkConfig directly
  deepLinkIOS?: string;
  deepLinkAndroid?: string;
  enableRetargeting?: boolean; // This can be simplified
  retargetingPixelId?: string;
  customDomain?: string;
}

export const addMockLink = (params: AddMockLinkParams): LinkItem => {
  const domain = params.customDomain || getShortenerDomain();
  const slug = params.customAlias || generateSlug(params.customDomain);

  if (params.customAlias && linksDB.some(l => l.slug === params.customAlias && (l.customDomain || getShortenerDomain()) === domain)) {
    throw new Error(`Custom alias "${params.customAlias}" on domain "${domain}" already exists.`);
  }
  
  const newLink: LinkItem = {
    id: generateMockId(),
    originalUrl: params.destinationUrls[0], 
    shortUrl: `https://${domain}/${slug}`,
    slug: slug,
    clickCount: 0,
    createdAt: new Date().toISOString(),
    title: params.title,
    tags: params.tags ? params.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    isCloaked: params.isCloaked,
    targets: [], 
    // Set abTestConfig to undefined initially, it will be populated only if isABTest is true and not rotation
    abTestConfig: undefined, 
    deepLinkConfig: (params.deepLinkIOS || params.deepLinkAndroid)
      ? { ios: params.deepLinkIOS || '', android: params.deepLinkAndroid || '' }
      : undefined,
    retargetingPixels: params.retargetingPixelId
      ? [{ platform: 'custom', pixelId: params.retargetingPixelId }] // Simplified from enableRetargeting
      : undefined,
    customDomain: params.customDomain,
  };

  if (params.isRotation && params.destinationUrls.length > 0) { // Prioritize rotation if both flags somehow true
    const numUrls = params.destinationUrls.length;
    let baseWeight = Math.floor(100 / numUrls);
    let remainder = 100 % numUrls;
    newLink.targets = params.destinationUrls.map((url, index) => {
      let weight = baseWeight + (index < remainder ? 1 : 0);
      return { url, weight };
    });
    // Ensure abTestConfig is not set if it's a rotation link
    newLink.abTestConfig = undefined; 
  } else if (params.isABTest && params.destinationUrls.length >= 2) {
    newLink.targets = [
      { url: params.destinationUrls[0], weight: 50 },
      { url: params.destinationUrls[1], weight: 50 },
    ];
    newLink.abTestConfig = { variantA: params.destinationUrls[0], variantB: params.destinationUrls[1], split: 50 };
  } else {
    newLink.targets = [{ url: params.destinationUrls[0] }];
  }
  
  linksDB.unshift(newLink); 
  return JSON.parse(JSON.stringify(newLink));
};


export const deleteMockLink = (linkId: string): boolean => {
  const initialLength = linksDB.length;
  linksDB = linksDB.filter(link => link.id !== linkId);
  analyticsEventsDB = analyticsEventsDB.filter(event => event.linkId !== linkId);
  return linksDB.length < initialLength;
};

export const getMockLinkBySlugOrId = (slugOrId: string): LinkItem | undefined => {
  const currentDomain = getShortenerDomain();
  const link = linksDB.find(l => l.slug === slugOrId || l.id === slugOrId);
  if (link) {
    return JSON.parse(JSON.stringify({
      ...link,
      shortUrl: `https://${link.customDomain || currentDomain}/${link.slug}`
    }));
  }
  return undefined;
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
  return JSON.parse(JSON.stringify(customDomainsDB.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())));
};

export const addMockCustomDomain = (domainName: string): CustomDomain | { error: string } => {
  if (!domainName.trim() || !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domainName.trim())) {
    return { error: "Invalid domain name format." };
  }
  if (customDomainsDB.some(d => d.domainName === domainName.trim())) {
    return { error: "This domain name already exists." };
  }
  const newDomain: CustomDomain = {
    id: generateMockId(),
    domainName: domainName.trim(),
    verified: false, 
    createdAt: new Date().toISOString(),
  };
  customDomainsDB.push(newDomain);
  return JSON.parse(JSON.stringify(newDomain));
};

export const deleteMockCustomDomain = (domainId: string): boolean => {
  const initialLength = customDomainsDB.length;
  customDomainsDB = customDomainsDB.filter(domain => domain.id !== domainId);
  return customDomainsDB.length < initialLength;
};

export const toggleVerifyMockCustomDomain = (domainId: string): CustomDomain | undefined => {
  const domainIndex = customDomainsDB.findIndex(d => d.id === domainId);
  if (domainIndex > -1) {
    customDomainsDB[domainIndex].verified = !customDomainsDB[domainIndex].verified;
    return JSON.parse(JSON.stringify(customDomainsDB[domainIndex]));
  }
  return undefined;
};

export const updateMockCustomDomainName = (domainId: string, newName: string): CustomDomain | { error: string } => {
  if (!newName.trim() || !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(newName.trim())) {
    return { error: "Invalid domain name format." };
  }
  const domainIndex = customDomainsDB.findIndex(d => d.id === domainId);
  if (domainIndex === -1) {
    return { error: "Domain not found." };
  }
  if (customDomainsDB.some(d => d.domainName === newName.trim() && d.id !== domainId)) {
    return { error: "This domain name already exists." };
  }
  customDomainsDB[domainIndex].domainName = newName.trim();
  return JSON.parse(JSON.stringify(customDomainsDB[domainIndex]));
};


// --- Team Member Functions ---
export const getMockTeamMembers = (): TeamMember[] => {
  return JSON.parse(JSON.stringify(teamMembersDB));
};

// --- Chart Data Function (uses current linksDB) ---
export const getMockAnalyticsChartDataForLink = (linkId: string, days: number = 7): { date: string; clicks: number }[] => {
  const data: { date: string; clicks: number }[] = [];
  const link = linksDB.find(l => l.id === linkId);
  
  if (!link) return [];

  const baseClicks = Math.floor((link.clickCount || 0) / (days > 0 ? Math.min(days, (link.clickCount || 1)) : 1));

  if (days <= 0) {
    return [];
  }
  const numPoints = Math.max(1, Math.min(days, 30)); 

  for (let i = 0; i < numPoints; i++) {
    const currentDate = new Date();
    const dayOffset = Math.floor((days / numPoints) * (numPoints - 1 - i));
    currentDate.setDate(currentDate.getDate() - dayOffset);
    
    data.push({
      date: currentDate.toISOString().split('T')[0],
      clicks: Math.max(0, baseClicks + Math.floor(Math.random() * (baseClicks * 0.5)) - Math.floor(baseClicks * 0.25) + (i % 5 - 2)),
    });
  }
  return data.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()); 
};

export const mockLinks = linksDB; 
export const mockAnalyticsEvents = analyticsEventsDB;
export const mockCustomDomains = customDomainsDB;
export const mockTeamMembers = teamMembersDB;
export const getMockAnalyticsForLink = getMockAnalyticsChartDataForLink;
