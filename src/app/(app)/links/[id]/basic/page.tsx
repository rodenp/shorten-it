// src/app/(app)/links/basic/page.tsx
'use client';
import React, { useEffect, useRef } from 'react';
import { BasicLinkPage } from '@/components/links/BasicLinkPage';
import { debugLog  } from '@/lib/logging';

export default function EditBasicPage() {

  useEffect(() => {
    debugLog('EditBasicPage', 'Rendering EditBasicPage');
    console.log('EditBasicPage mounted');
  }, []);

  return <BasicLinkPage />;
}