// src/context/LinkParamsContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { LinkItem, LinkTarget, RetargetingPixel } from '@/types';

interface ABTestConfig {
  variantAUrl: string;
  variantBUrl: string;
  splitPercentage: number;
}

interface LinkParamsContextType {
  linkItem: LinkItem | null;
  id: string;
  userId: string;
  originalUrl: string;
  shortUrl: string;
  domainId: string;
  slug: string;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
  customDomain: string;
  isCloaked: boolean;
  deepLinkConfig: LinkItem['deepLinkConfig'] | null;
  abTestConfig: ABTestConfig;
  retargetingPixels: RetargetingPixel[];
  tags: string[];
  title: string;
  groupId: string;
  groupName: string;
  lastUsedTargetIndex: number | null;
  targets: LinkTarget[];
  folderId: string | null;
  domain?: string;
  rotationStart: string | null;
  rotationEnd: string | null;
  clickLimit: number | null;
  isLoading: boolean;

  // setters for editable fields
  setDomain: (d?: string) => void;
  setOriginalUrl: (val: string) => void;
  setShortUrl: (val: string) => void;
  setSlug: (val: string) => void;
  setTitle: (val: string) => void;
  setFolderId: (val: string | null) => void;
  setTags: (val: string[]) => void;
  setIsCloaked: (val: boolean) => void;
  setDeepLinkConfig: (val: LinkItem['deepLinkConfig'] | null) => void;
  setAbTestConfig: (val: ABTestConfig) => void;
  setRetargetingPixels: (val: RetargetingPixel[]) => void;
  setClickLimit: (val: number | null) => void;
  setRotationStart: (val: string | null) => void;
  setRotationEnd: (val: string | null) => void;
  setClickCount: (val: number) => void;
  initialize: (item: LinkItem) => void;
  setTargets: (targets: LinkTarget[]) => void;
  clear: () => void;
}

const defaultABConfig: ABTestConfig = {
  variantAUrl: '',
  variantBUrl: '',
  splitPercentage: 50,
};

const LinkParamsContext = createContext<LinkParamsContextType | undefined>(undefined);

export function LinkParamsProvider({ children }: { children: ReactNode }) {
  const [linkItem, setLinkItemState] = useState<LinkItem | null>(null);
  const [id, setId] = useState('');
  const [userId, setUserId] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [domainId, setDomainId] = useState('');
  const [slug, setSlug] = useState('');
  const [clickCount, setClickCount] = useState(0);
  const [createdAt, setCreatedAt] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [isCloaked, setIsCloaked] = useState(false);
  const [deepLinkConfig, setDeepLinkConfig] = useState<LinkItem['deepLinkConfig'] | null>(null);
  const [abTestConfig, setAbTestConfig] = useState<ABTestConfig>(defaultABConfig);
  const [retargetingPixels, setRetargetingPixels] = useState<RetargetingPixel[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [groupId, setGroupId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [lastUsedTargetIndex, setLastUsedTargetIndex] = useState<number | null>(null);
  const [targets, setTargets] = useState<LinkTarget[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [domain, setDomain] = useState<string | undefined>(undefined);
  const [rotationStart, setRotationStart] = useState<string | null>(null);
  const [rotationEnd, setRotationEnd] = useState<string | null>(null);
  const [clickLimit, setClickLimit] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const initialize = (item: LinkItem) => {
    setLinkItemState(item);
    setId(item.id);
    setUserId(item.userId || '');
    setOriginalUrl(item.originalUrl || '');
    setShortUrl(item.shortUrl || '');
    setDomainId(item.domainId || '');
    setSlug(item.slug || '');
    setClickCount(item.clickCount || 0);
    setCreatedAt(item.createdAt || '');
    setUpdatedAt(item.updatedAt || '');
    setCustomDomain(item.customDomain || '');
    setIsCloaked(item.isCloaked ?? false);
    setDeepLinkConfig(item.deepLinkConfig || null);
    setAbTestConfig(item.abTestConfig || defaultABConfig);
    setRetargetingPixels(item.retargetingPixels || []);
    setTags(item.tags || []);
    setTitle(item.title || '');
    setGroupId(item.groupId || '');
    setGroupName(item.groupName || '');
    setLastUsedTargetIndex(item.lastUsedTargetIndex ?? null);
    setTargets(item.targets || []);
    setFolderId(item.folderId ?? null);
    setDomain(item.domain || undefined);
    setRotationStart(item.rotationStart || null);
    setRotationEnd(item.rotationEnd || null);
    setClickLimit(item.clickLimit || null);
    // domain remains driven by page logic
  };

  const clear = () => {
    setLinkItemState(null);
    setId('');
    setUserId('');
    setOriginalUrl('');
    setShortUrl('');
    setDomainId('');
    setSlug('');
    setClickCount(0);
    setCreatedAt('');
    setUpdatedAt('');
    setCustomDomain('');
    setIsCloaked(false);
    setDeepLinkConfig(null);
    setAbTestConfig(defaultABConfig);
    setRetargetingPixels([]);
    setTags([]);
    setTitle('');
    setGroupId('');
    setGroupName('');
    setLastUsedTargetIndex(null);
    setTargets([]);
    setFolderId(null);
    setShortUrl('');
    setDomain(undefined);
    setRotationStart(null);
    setRotationEnd(null);
    setClickLimit(null);
    setIsLoading(false);
  };

  return (
    <LinkParamsContext.Provider
      value={{
        linkItem,
        id,
        userId,
        originalUrl,
        shortUrl,
        domainId,
        slug,
        clickCount,
        createdAt,
        updatedAt,
        customDomain,
        isCloaked,
        deepLinkConfig,
        abTestConfig,
        retargetingPixels,
        tags,
        title,
        groupId,
        groupName,
        lastUsedTargetIndex,
        targets,
        folderId,
        domain,
        rotationStart,
        rotationEnd,
        clickLimit,
        isLoading,
        setClickCount,
        setRotationStart,
        setRotationEnd,
        setClickLimit,
        setDomain,
        setOriginalUrl,
        setShortUrl,
        setTargets,
        setSlug,
        setTitle,
        setFolderId,
        setTags,
        setIsCloaked,
        initialize,
        clear,
      }}
    >
      {children}
    </LinkParamsContext.Provider>
  );
}

export function useLinkParams(): LinkParamsContextType {
  const context = useContext(LinkParamsContext);
  if (!context) throw new Error('useLinkParams must be used within LinkParamsProvider');
  return context;
}
