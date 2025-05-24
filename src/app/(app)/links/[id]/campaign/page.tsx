// src/app/(app)/links/[id]/cloak/page.tsx
'use client';
import React, { useEffect } from 'react';
import { CampaignPage } from '@/components/links/CampaignPage';
import { debugLog  } from '@/lib/logging';

export default function EditCampaignPage() {

useEffect(() => {
  debugLog('EditCampaignPage', 'Rendering EditCampaignPage');
  console.log('EditCampaignPage mounted');
}, []);

  // no fetch, context stays at defaults
  return <CampaignPage />;
}