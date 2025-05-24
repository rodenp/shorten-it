// src/app/(app)/links/basic/page.tsx
'use client';
import React, { useEffect } from 'react';
import { BasicLinkPage } from '@/components/links/BasicLinkPage';
import { debugLog  } from '@/lib/logging';

export default function NewBasicPage() {

useEffect(() => {
  debugLog('NewBasicPage', 'Rendering NewBasicPage');
  console.log('NewBasicPage mounted');
}, []);

  // no fetch, context stays at defaults
  return <BasicLinkPage />;
}