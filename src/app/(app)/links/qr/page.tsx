// src/app/(app)/links/cloak/page.tsx
'use client';
import React, { useEffect } from 'react';
import { QRCodePage } from '@/components/links/QRCodePage';
import { debugLog  } from '@/lib/logging';

export default function NewQRPage() {

useEffect(() => {
  debugLog('NewQRCodePage', 'Rendering NewQRCodePage');
  console.log('NewQRCodePage mounted');
}, []);

  // no fetch, context stays at defaults
  return <QRCodePage />;
}