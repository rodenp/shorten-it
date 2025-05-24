// src/app/(app)/links/basic/page.tsx
'use client';
import React, { useEffect } from 'react';
import { BasicLinkPage } from '@/components/links/BasicLinkPage';
import { debugLog  } from '@/lib/logging';
import { useLinkParams } from '@/context/LinkParamsContext';
import { debug } from 'console';

export default function EditBasicPage() {

  const {
    id,
    domainId,
    domain,
    originalUrl,
    setOriginalUrl,
    slug, setSlug,
    title, setTitle,
    folderId, setFolderId,
    tags, setTags,
    targets,
    clear,
  } = useLinkParams();

  useEffect(() => {
    debugLog('EditBasicPage', 'Rendering NewBasicPage');
    debugLog('EditBasicPage:originalUrl=', originalUrl, ',domain=', domain);

    console.log('EditBasicPage mounted');
    console.log('EditBasicPage:originalUrl=', originalUrl, ',domain=', domain);
    
  }, []);

  // no fetch, context stays at defaults
  return <BasicLinkPage />;
}