import type { LinkItem, AnalyticEvent, CustomDomain, TeamMember, LinkTarget, LinkGroup, ApiKey, RetargetingPixel, UserProfile } from '@/types';

let shortenerDomain = process.env.NEXT_PUBLIC_SHORTENER_DOMAIN || 'linkyle.com'; 

export const getShortenerDomain = (): string => {
  return shortenerDomain;
};

export const setShortenerDomain = (domain: string) => {
  shortenerDomain = domain || 'linkyle.com';
};

const generateMockId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

// --- Current User Profile ---
let mockCurrentUserProfile: UserProfile = {
  id: 'user1',
  fullName: "Current User",
  email: "user@linkyle.com",
  avatarUrl: `https://picsum.photos/seed/user-avatar-${generateMockId()}/100/100`,
};

export const getMockCurrentUserProfile = (): UserProfile => {
  return JSON.parse(JSON.stringify(mockCurrentUserProfile));
};

export const updateMockCurrentUserProfile = (data: Partial<Omit<UserProfile, 'id'>>): UserProfile => {
  mockCurrentUserProfile = { ...mockCurrentUserProfile, ...data };
  // Simulate updating related team member entry if current user is also a team member
  const teamMemberIndex = teamMembersDB.findIndex(tm => tm.id === mockCurrentUserProfile.id);
  if (teamMemberIndex !== -1) {
    teamMembersDB[teamMemberIndex] = {
      ...teamMembersDB[teamMemberIndex], // keep role
      ...mockCurrentUserProfile, // update with new profile data
    };
  }
  return getMockCurrentUserProfile();
};


let linksDB: LinkItem[] = [
  {
    id: '1',
    originalUrl: 'https://example.com/very-long-url-that-needs-shortening',
    targets: [{ url: 'https://example.com/very-long-url-that-needs-shortening', weight: 100 }],
    shortUrl: `https://brand.co/abc12`, 
    slug: 'abc12',
    clickCount: 1256,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'My Example Link',
    customDomain: 'brand.co',
    isCloaked: false,
    tags: ['marketing', 'promo'],
    groupId: 'group1',
    retargetingPixels: [{ name: 'Main FB Pixel', type: 'Facebook Pixel', pixelIdValue: '1234567890' }]
  },
  {
    id: '2',
    originalUrl: 'https://another-example.io/another-long-feature-page',
    targets: [{ url: 'https://another-example.io/another-long-feature-page', weight: 100 }],
    shortUrl: `https://${getShortenerDomain()}/def34`, 
    slug: 'def34',
    clickCount: 872,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'Feature Page Q2',
    isCloaked: true,
    deepLinkConfig: { iosAppUriScheme: 'myapp://product/123', androidAppUriScheme: 'myapp://product/123', fallbackUrl: 'https://example.com/fallback' },
    tags: ['product', 'mobile'],
    groupId: 'group2',
  },
   {
    id: '3',
    originalUrl: 'https://yet-another-site.org/blog/article-variant-a', // Variant A
    targets: [
      { url: 'https://yet-another-site.org/blog/article-variant-a', weight: 50 },
      { url: 'https://some-other-site.net/blog/article-variant-b', weight: 50 } // Variant B
    ],
    shortUrl: `https://${getShortenerDomain()}/ghi56`,
    slug: 'ghi56',
    clickCount: 3045,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'Blog Post A/B Test',
    abTestConfig: { 
        variantAUrl: 'https://yet-another-site.org/blog/article-variant-a', 
        variantBUrl: 'https://some-other-site.net/blog/article-variant-b', 
        splitPercentage: 50 
    },
    tags: ['blog', 'ab-test'],
  },
  {
    id: '4',
    originalUrl: 'https://company.com/product-a', 
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
    groupId: 'group1',
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
  { ...mockCurrentUserProfile, id: 'user1', role: 'admin' }, // Current user is an admin team member
  { id: 'tm2', fullName: 'Bob The Builder', email: 'bob@example.com', role: 'editor', avatarUrl: `https://picsum.photos/seed/bob-avatar-${generateMockId()}/40/40` },
];


let linkGroupsDB: LinkGroup[] = [
    { id: 'group1', name: 'Marketing Campaigns', description: 'All links related to marketing efforts.', createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), linkCount: linksDB.filter(l => l.groupId === 'group1').length },
    { id: 'group2', name: 'Product Launches', description: 'Links for new product announcements.', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), linkCount: linksDB.filter(l => l.groupId === 'group2').length },
];

let apiKeysDB: ApiKey[] = [
    { 
        id: 'key1', 
        name: 'My Main Integration', 
        key: `lwiz_sk_${generateMockId()}${generateMockId()}`.slice(0,32), // Ensure fixed length for example display
        prefix: 'lwiz_sk_xxxx',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), 
        lastUsedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        permissions: ['links:read', 'links:write', 'analytics:read'] 
    },
    { 
        id: 'key2', 
        name: 'Read-Only Analytics Key', 
        key: `lwiz_pk_${generateMockId()}${generateMockId()}`.slice(0,32), // Ensure fixed length
        prefix: 'lwiz_pk_yyyy',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        permissions: ['analytics:read']
    },
];

let retargetingPixelsDB: RetargetingPixel[] = [
  { id: 'px1', name: 'Main FB Pixel', type: 'Facebook Pixel', pixelIdValue: '123456789012345', createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()},
  { id: 'px2', name: 'Google Ads Campaign X', type: 'Google Ads Tag', pixelIdValue: 'AW-987654321', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()},
  { id: 'px3', name: 'LinkedIn General', type: 'LinkedIn Insight Tag', pixelIdValue: 'LNKD-9876', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() }
];


// --- Retargeting Pixel Functions ---
export const getMockRetargetingPixels = (): RetargetingPixel[] => {
  return JSON.parse(JSON.stringify(retargetingPixelsDB.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())));
}

export const addMockRetargetingPixel = (name: string, type: RetargetingPixel['type'], pixelIdValue: string): RetargetingPixel | { error: string } => {
  if (!name.trim()) return { error: "Pixel name cannot be empty." };
  if (!pixelIdValue.trim()) return { error: "Pixel ID cannot be empty." };
  if (retargetingPixelsDB.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
    return { error: "A pixel with this name already exists." };
  }
  const newPixel: RetargetingPixel = {
    id: generateMockId(),
    name: name.trim(),
    type,
    pixelIdValue: pixelIdValue.trim(),
    createdAt: new Date().toISOString(),
  };
  retargetingPixelsDB.unshift(newPixel);
  return JSON.parse(JSON.stringify(newPixel));
}

export const updateMockRetargetingPixel = (pixelId: string, name: string, type: RetargetingPixel['type'], pixelIdValue: string): RetargetingPixel | { error: string } => {
  if (!name.trim()) return { error: "Pixel name cannot be empty." };
  if (!pixelIdValue.trim()) return { error: "Pixel ID cannot be empty." };
  
  const pixelIndex = retargetingPixelsDB.findIndex(p => p.id === pixelId);
  if (pixelIndex === -1) {
    return { error: "Pixel not found." };
  }
  if (retargetingPixelsDB.some(p => p.name.toLowerCase() === name.trim().toLowerCase() && p.id !== pixelId)) {
    return { error: "Another pixel with this name already exists." };
  }
  retargetingPixelsDB[pixelIndex] = {
    ...retargetingPixelsDB[pixelIndex],
    name: name.trim(),
    type,
    pixelIdValue: pixelIdValue.trim(),
  };
  return JSON.parse(JSON.stringify(retargetingPixelsDB[pixelIndex]));
}

export const deleteMockRetargetingPixel = (pixelId: string): boolean => {
  const initialLength = retargetingPixelsDB.length;
  const pixelToDelete = retargetingPixelsDB.find(p => p.id === pixelId);
  if (!pixelToDelete) return false;

  retargetingPixelsDB = retargetingPixelsDB.filter(pixel => pixel.id !== pixelId);
  
  linksDB.forEach(link => {
    if (link.retargetingPixels) {
      link.retargetingPixels = link.retargetingPixels.filter(rp => rp.pixelIdValue !== pixelToDelete.pixelIdValue || rp.type !== pixelToDelete.type);
       if (link.retargetingPixels.length === 0) {
        delete link.retargetingPixels;
      }
    }
  });
  return retargetingPixelsDB.length < initialLength;
}


// --- API Key Functions ---
export const getMockApiKeys = (): ApiKey[] => {
  return JSON.parse(JSON.stringify(apiKeysDB.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())));
}

export const addMockApiKey = (name: string): ApiKey | { error: string } => {
  if (!name.trim()) {
    return { error: "API Key name cannot be empty." };
  }
  if (apiKeysDB.some(key => key.name.toLowerCase() === name.trim().toLowerCase())) {
    return { error: "An API Key with this name already exists." };
  }
  const newKeyValue = `lwiz_sk_${generateMockId()}${generateMockId()}`.slice(0,32);
  const newApiKey: ApiKey = {
    id: generateMockId(),
    name: name.trim(),
    key: newKeyValue,
    prefix: newKeyValue.substring(0, 12).replace(/.(?=.{4})/g, 'x'), // e.g. lwiz_sk_xxxxxxxx
    createdAt: new Date().toISOString(),
    permissions: ['links:read', 'links:write', 'analytics:read'], 
  };
  apiKeysDB.unshift(newApiKey);
  return JSON.parse(JSON.stringify(newApiKey)); 
}

export const deleteMockApiKey = (apiKeyId: string): boolean => {
  const initialLength = apiKeysDB.length;
  apiKeysDB = apiKeysDB.filter(key => key.id !== apiKeyId);
  return apiKeysDB.length < initialLength;
}

// --- Link Group Functions ---
export const getMockLinkGroups = (): LinkGroup[] => {
    return JSON.parse(JSON.stringify(linkGroupsDB.map(group => ({
        ...group,
        linkCount: linksDB.filter(link => link.groupId === group.id).length
    })).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())));
};

export const getMockLinkGroupById = (groupId: string): LinkGroup | undefined => {
    const group = linkGroupsDB.find(g => g.id === groupId);
    if (group) {
        return JSON.parse(JSON.stringify({
            ...group,
            linkCount: linksDB.filter(link => link.groupId === group.id).length
        }));
    }
    return undefined;
};

export const addMockLinkGroup = (name: string, description?: string): LinkGroup | { error: string } => {
    if (!name.trim()) {
        return { error: "Group name cannot be empty." };
    }
    if (linkGroupsDB.some(g => g.name.toLowerCase() === name.trim().toLowerCase())) {
        return { error: "A group with this name already exists." };
    }
    const newGroup: LinkGroup = {
        id: generateMockId(),
        name: name.trim(),
        description: description?.trim(),
        createdAt: new Date().toISOString(),
        linkCount: 0,
    };
    linkGroupsDB.unshift(newGroup);
    return JSON.parse(JSON.stringify(newGroup));
};

export const updateMockLinkGroup = (groupId: string, name: string, description?: string): LinkGroup | { error: string } => {
    if (!name.trim()) {
        return { error: "Group name cannot be empty." };
    }
    const groupIndex = linkGroupsDB.findIndex(g => g.id === groupId);
    if (groupIndex === -1) {
        return { error: "Group not found." };
    }
    if (linkGroupsDB.some(g => g.name.toLowerCase() === name.trim().toLowerCase() && g.id !== groupId)) {
        return { error: "Another group with this name already exists." };
    }
    linkGroupsDB[groupIndex].name = name.trim();
    linkGroupsDB[groupIndex].description = description?.trim();
    linkGroupsDB[groupIndex].linkCount = linksDB.filter(link => link.groupId === groupId).length;
    return JSON.parse(JSON.stringify(linkGroupsDB[groupIndex]));
};

export const deleteMockLinkGroup = (groupId: string): boolean => {
    const initialLength = linkGroupsDB.length;
    linkGroupsDB = linkGroupsDB.filter(group => group.id !== groupId);
    linksDB.forEach(link => {
        if (link.groupId === groupId) {
            link.groupId = undefined;
        }
    });
    return linkGroupsDB.length < initialLength;
};


// --- Link Functions ---
export const getMockLinks = (): LinkItem[] => {
  const currentGlobalDomain = getShortenerDomain();
  return JSON.parse(JSON.stringify(linksDB.map(link => ({
    ...link,
    shortUrl: `https://${link.customDomain || currentGlobalDomain}/${link.slug}`
  })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())));
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
  variantBUrl?: string; 
  isRotation?: boolean;
  isABTest?: boolean;
  customAlias?: string;
  title?: string;
  tags?: string;
  isCloaked?: boolean;
  deepLinkIOSAppUriScheme?: string;
  deepLinkAndroidAppUriScheme?: string;
  deepLinkFallbackUrl?: string;
  selectedRetargetingPixelId?: string; 
  customDomain?: string;
  abTestSplitPercentage?: number; 
  groupId?: string;
}

export const addMockLink = (params: AddMockLinkParams): LinkItem => {
  const effectiveDomain = params.customDomain || getShortenerDomain();
  const slug = params.customAlias || generateSlug(params.customDomain);

  if (params.customAlias && linksDB.some(l => l.slug === params.customAlias && (l.customDomain || getShortenerDomain()) === effectiveDomain)) {
    throw new Error(`Custom alias "${params.customAlias}" on domain "${effectiveDomain}" already exists.`);
  }
  
  const primaryUrl = params.destinationUrls[0];

  let linkRetargetingPixels: LinkItem['retargetingPixels'] = undefined;
  if (params.selectedRetargetingPixelId) {
    const pixel = retargetingPixelsDB.find(p => p.id === params.selectedRetargetingPixelId);
    if (pixel) {
      linkRetargetingPixels = [{ name: pixel.name, type: pixel.type, pixelIdValue: pixel.pixelIdValue }];
    }
  }

  const newLink: LinkItem = {
    id: generateMockId(),
    originalUrl: primaryUrl, 
    shortUrl: `https://${effectiveDomain}/${slug}`,
    slug: slug,
    clickCount: 0,
    createdAt: new Date().toISOString(),
    title: params.title,
    tags: params.tags ? params.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    isCloaked: params.isCloaked,
    targets: [],
    abTestConfig: undefined,
    deepLinkConfig: (params.deepLinkIOSAppUriScheme || params.deepLinkAndroidAppUriScheme)
      ? { 
          iosAppUriScheme: params.deepLinkIOSAppUriScheme || '', 
          androidAppUriScheme: params.deepLinkAndroidAppUriScheme || '',
          fallbackUrl: params.deepLinkFallbackUrl || ''
        }
      : undefined,
    retargetingPixels: linkRetargetingPixels,
    customDomain: params.customDomain,
    groupId: params.groupId || undefined,
  };

  if (params.isABTest && params.variantBUrl && params.destinationUrls.length > 0) {
     const variantA = primaryUrl;
     const variantB = params.variantBUrl;
     const split = params.abTestSplitPercentage || 50;
    newLink.targets = [
      { url: variantA, weight: split },
      { url: variantB, weight: 100 - split },
    ];
    newLink.abTestConfig = { variantAUrl: variantA, variantBUrl: variantB, splitPercentage: split };
    newLink.originalUrl = variantA; 
  } else if (params.isRotation && params.destinationUrls.length > 0) {
    const numUrls = params.destinationUrls.length;
    let baseWeight = Math.floor(100 / numUrls);
    let remainder = 100 % numUrls;
    newLink.targets = params.destinationUrls.map((url, index) => {
      let weight = baseWeight + (index < remainder ? 1 : 0);
      return { url, weight };
    });
    newLink.originalUrl = params.destinationUrls[0]; 
  } else {
    newLink.targets = [{ url: primaryUrl, weight: 100 }];
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
  const currentGlobalDomain = getShortenerDomain();
  const link = linksDB.find(l => l.slug === slugOrId || l.id === slugOrId);
  if (link) {
    return JSON.parse(JSON.stringify({
      ...link,
      shortUrl: `https://${link.customDomain || currentGlobalDomain}/${link.slug}`
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
  const currentUser = getMockCurrentUserProfile(); // Get potentially updated current user
  const currentUserInTeamIndex = teamMembersDB.findIndex(tm => tm.id === currentUser.id);

  if (currentUserInTeamIndex !== -1) {
    // Update the current user's details in the team list if they exist
    teamMembersDB[currentUserInTeamIndex] = {
      ...teamMembersDB[currentUserInTeamIndex], // keep role
      fullName: currentUser.fullName,
      email: currentUser.email,
      avatarUrl: currentUser.avatarUrl,
    };
  } else {
    // This case should ideally not happen if the current user is always part of the team.
    // If it can, you might want to add them here:
    // teamMembersDB.push({ ...currentUser, role: 'admin' }); 
  }
  return JSON.parse(JSON.stringify(teamMembersDB.sort((a, b) => a.fullName.localeCompare(b.fullName))));
};

export const addMockTeamMember = (email: string, role: TeamMember['role'] = 'viewer'): TeamMember | { error: string } => {
  if (teamMembersDB.some(tm => tm.email.toLowerCase() === email.toLowerCase())) {
    return { error: "A team member with this email already exists." };
  }
  const newMember: TeamMember = {
    id: generateMockId(),
    fullName: email.split('@')[0] || `User ${teamMembersDB.length + 1}`, // Simple name generation
    email: email,
    avatarUrl: `https://picsum.photos/seed/${email}-${generateMockId()}/40/40`,
    role: role,
  };
  teamMembersDB.push(newMember);
  return JSON.parse(JSON.stringify(newMember));
};

export const deleteMockTeamMember = (memberId: string): boolean | { error: string } => {
  if (memberId === mockCurrentUserProfile.id) {
    return { error: "You cannot remove yourself from the team." };
  }
  const initialLength = teamMembersDB.length;
  teamMembersDB = teamMembersDB.filter(member => member.id !== memberId);
  return teamMembersDB.length < initialLength;
};

export const updateMockTeamMemberRole = (memberId: string, newRole: TeamMember['role']): TeamMember | { error: string } => {
  const memberIndex = teamMembersDB.findIndex(tm => tm.id === memberId);
  if (memberIndex === -1) {
    return { error: "Team member not found." };
  }
  // Prevent demoting the last admin if it's the current user (or generally)
  if (teamMembersDB[memberIndex].role === 'admin' && newRole !== 'admin') {
    const adminCount = teamMembersDB.filter(tm => tm.role === 'admin').length;
    if (adminCount <= 1) {
      return { error: "Cannot remove the last admin. Assign another admin first." };
    }
  }
  teamMembersDB[memberIndex].role = newRole;
  return JSON.parse(JSON.stringify(teamMembersDB[memberIndex]));
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
export const mockLinkGroups = linkGroupsDB;
export const mockApiKeys = apiKeysDB;
export const mockRetargetingPixels = retargetingPixelsDB; 
export const getMockAnalyticsForLink = getMockAnalyticsChartDataForLink;
