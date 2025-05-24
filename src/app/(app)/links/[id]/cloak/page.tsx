// src/app/(app)/links/[id]/cloak/page.tsx
'use client';
import React, { useEffect } from 'react';
import { CloakPage } from '@/components/links/CloakPage';
import { debugLog  } from '@/lib/logging';

export default function EditCloakPage() {

useEffect(() => {
  debugLog('EditCloakPage', 'Rendering EditCloakPage');
  console.log('EditCloakPage mounted');
}, []);

  // no fetch, context stays at defaults
  return <CloakPage />;
}