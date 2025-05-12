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
  const data = [];
  // Cap the maximum number of data points to avoid performance issues with large 'days' values.
  // For mock data, 30-50 points should be sufficient for visualization.
  const maxDataPoints = days > 60 ? 30 : (days > 30 ? 20 : days); 
  const step = Math.max(1, Math.floor(days / maxDataPoints));

  for (let i = 0; i < days; i += step) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      // Simulate varied click counts based on linkId for visual distinction
      clicks: Math.floor(Math.random() * (linkId === '1' ? 100 : linkId === '2' ? 70 : 50) + (days - i) / (days/10) + 5),
    });
    if (data.length >= maxDataPoints) {
      break; 
    }
  }
  
  // If no data was generated (e.g., days is very small, step is too large), ensure at least a few points.
  if (data.length === 0 && days > 0) {
    const fallbackPoints = Math.min(days, 5); // Generate up to 5 fallback points
    for (let i = 0; i < fallbackPoints; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (i * Math.floor(days/fallbackPoints))); // Distribute points over the period
        data.push({
            date: date.toISOString().split('T')[0],
            clicks: Math.floor(Math.random() * (linkId === '1' ? 100 : 50) + 10),
        });
    }
  }


  return data.reverse();
};
