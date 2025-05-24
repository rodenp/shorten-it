// src/app/(app)/links/rotate/page.tsx
'use client';
import React, { useEffect } from 'react';
import { URLRotatePage } from '@/components/links/URLRotatePage';
import { debugLog  } from '@/lib/logging';

export default function EditURLRotatePage() {

useEffect(() => {
  debugLog('EditURLRotatePage', 'Rendering EditURLRotatePage');
  console.log('EditURLRotatePage mounted');
}, []);

  // no fetch, context stays at defaults
  return <URLRotatePage />;
}