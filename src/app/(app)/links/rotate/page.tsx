// src/app/(app)/links/rotate/page.tsx
'use client';
import React, { useEffect } from 'react';
import { URLRotatePage } from '@/components/links/URLRotatePage';
import { debugLog  } from '@/lib/logging';

export default function NewURLRotatePage() {

useEffect(() => {
  debugLog('NewURLRotatePage', 'Rendering NewURLRotatePage');
  console.log('NewURLRotatePage mounted');
}, []);

  // no fetch, context stays at defaults
  return <URLRotatePage />;
}