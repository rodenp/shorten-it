
import type { LinkItem, AnalyticEvent, CustomDomain, TeamMember } from '@/types';

export const mockLinks: LinkItem[] = [
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

export const mockAnalyticsEvents: AnalyticEvent[] = [
  {
    id: 'evt1',
    linkId: '1', // Ensure this linkId exists in mockLinks
    timestamp: new Date().toISOString(),
    country: 'USA',
    deviceType: 'desktop',
    browser: 'Chrome',
    referrer: 'google.com',
  },
   {
    id: 'evt2',
    linkId: '2', // Ensure this linkId exists in mockLinks
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    country: 'Canada',
    deviceType: 'mobile',
    browser: 'Safari',
    referrer: 'twitter.com',
  },
];

export const mockCustomDomains: CustomDomain[] = [
  { id: 'cd1', domainName: 'brand.co', verified: true, createdAt: new Date().toISOString() },
  { id: 'cd2', domainName: 'my.links', verified: false, createdAt: new Date().toISOString() },
];

export const mockTeamMembers: TeamMember[] = [
  { id: 'tm1', name: 'Alice Wonderland', email: 'alice@example.com', role: 'admin' },
  { id: 'tm2', name: 'Bob The Builder', email: 'bob@example.com', role: 'editor' },
];

export const getMockAnalyticsForLink = (linkId: string, days: number = 7): { date: string; clicks: number }[] => {
  const data: { date: string; clicks: number }[] = [];
  
  // Ensure days is a positive number
  if (days <= 0) {
    return [];
  }

  // Cap the number of data points to a reasonable maximum (e.g., 30)
  // and ensure at least 1 point if days > 0
  const numPoints = Math.max(1, Math.min(days, 30));

  for (let i = 0; i < numPoints; i++) {
    const currentDate = new Date();
    // Calculate the date offset to spread points across the `days` period
    // This ensures that even if numPoints is small, the dates span the requested range.
    const dayOffset = Math.floor((days / numPoints) * i);
    currentDate.setDate(currentDate.getDate() - dayOffset);
    
    data.push({
      date: currentDate.toISOString().split('T')[0],
      // Simplified click calculation
      clicks: Math.floor(Math.random() * 80) + Math.floor(Math.random() * (parseInt(linkId) * 10)) + 5,
    });
  }
  
  // Recharts expects data to be in chronological order for line charts
  return data.reverse(); 
};
