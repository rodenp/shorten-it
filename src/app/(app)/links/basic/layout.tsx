// src/app/(app)/links/basic/layout.tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { useLinkParams } from '@/context/LinkParamsContext';

export default function BasicCreateLayout({ children }: { children: ReactNode }) {
  const { clear, originalUrl } = useLinkParams();

  // Only clear if no originalUrl has already been set
  useEffect(() => {
    if (!originalUrl) {
      //clear();
    }
  }, []);

  return <>{children}</>;
}