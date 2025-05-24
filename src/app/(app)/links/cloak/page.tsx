// src/app/(app)/links/cloak/page.tsx
'use client';
import React, { useEffect } from 'react';
import { CloakPage } from '@/components/links/CloakPage';
import { debugLog  } from '@/lib/logging';

export default function NewCloakPage() {

useEffect(() => {
  debugLog('NewCloakPage', 'Rendering NewCloakPage');
  console.log('NewCloakPage mounted');
}, []);

  // no fetch, context stays at defaults
  return <CloakPage />;
}