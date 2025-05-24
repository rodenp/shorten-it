// src/app/(app)/links/cloak/page.tsx
'use client';
import React, { useEffect } from 'react';
import { CampaignPage } from '@/components/links/CampaignPage';
import { debugLog  } from '@/lib/logging';

export default function NewCampaignPage() {

useEffect(() => {
  debugLog('NewCampaignPage', 'Rendering NewCampaignPage');
  console.log('NewCampaignPage mounted');
}, []);

  // no fetch, context stays at defaults
  return <CampaignPage />;
}