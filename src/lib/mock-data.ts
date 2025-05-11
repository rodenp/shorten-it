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
  {
    id: '3',
    originalUrl: 'https://yet-another-site.org/blog/exciting-article-post',
    targets: [
      { url: 'https://yet-another-site.org/blog/article-variant-a', weight: 50 },
      { url: 'https://yet-another-site.org/blog/article-variant-b', weight: 50 },
    ],
    shortUrl: 'https://lnk.wiz/ghi56',
    slug: 'ghi56',
    clickCount: 3045,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'Blog Post A/B Test',
    abTestConfig: { variantA: 'Variant A URL', variantB: 'Variant B URL', split: 50 },
    tags: ['blog', 'ab-test'],
  },
  {
    id: '4',
    originalUrl: 'https://platform.net/signup-special-offer',
    targets: [{ url: 'https://platform.net/signup-special-offer' }],
    shortUrl: 'https://brand.co/offer',
    slug: 'offer',
    clickCount: 550,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'Special Signup Offer',
    customDomain: 'brand.co',
    retargetingPixels: [{ platform: 'Facebook', pixelId: 'fb-12345' }],
    tags: ['campaign', 'signup'],
  },
];

export const mockAnalyticsEvents: AnalyticEvent[] = [
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
    linkId: '1',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    country: 'Canada',
    deviceType: 'mobile',
    browser: 'Safari',
    referrer: 'twitter.com',
  },
  {
    id: 'evt3',
    linkId: '2',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    country: 'UK',
    deviceType: 'tablet',
    browser: 'Firefox',
    referrer: 'linkedin.com',
  },
];

export const mockCustomDomains: CustomDomain[] = [
  { id: 'cd1', domainName: 'brand.co', verified: true, createdAt: new Date().toISOString() },
  { id: 'cd2', domainName: 'my.links', verified: false, createdAt: new Date().toISOString() },
];

export const mockTeamMembers: TeamMember[] = [
  { id: 'tm1', name: 'Alice Wonderland', email: 'alice@example.com', role: 'admin' },
  { id: 'tm2', name: 'Bob The Builder', email: 'bob@example.com', role: 'editor' },
  { id: 'tm3', name: 'Charlie Brown', email: 'charlie@example.com', role: 'viewer' },
];

export const getMockAnalyticsForLink = (linkId: string, days: number = 7): { date: string; clicks: number }[] => {
  const data = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      clicks: Math.floor(Math.random() * (linkId === '1' ? 100 : linkId === '2' ? 50 : 200) + 10),
    });
  }
  return data.reverse();
};
