// src/app/(app)/links/basic/page.tsx
'use client';
import React, { useEffect } from 'react';
import { BasicLinkPage } from '@/components/links/BasicLinkPage';
import { debugLog  } from '@/lib/logging';
import { useLinkParams } from '@/context/LinkParamsContext';

export default function NewBasicPage() {

  const { getCurrentLinkItem } = useLinkParams();

  useEffect(() => {
    debugLog('NewBasicPage', 'Rendering NewBasicPage');
    console.log('NewBasicPage mounted');
    debugLog('NewBasicPage:context(all)=', getCurrentLinkItem());
    console.log('NewBasicPage context(all))=',getCurrentLinkItem());

}, []);

  // no fetch, context stays at defaults
  return <BasicLinkPage />;
}