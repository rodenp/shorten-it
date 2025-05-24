// src/app/(app)/links/ab/layout.tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { useLinkParams } from '@/context/LinkParamsContext';

export default function AbCreateLayout({ children }: { children: ReactNode }) {
  const { clear, originalUrl, slug } = useLinkParams();

  // Only clear context on true “direct hit” (no URL & no slug).
  // Don’t clear if CreateLinkBar already populated them.
  useEffect(() => {
    if (!originalUrl && !slug) {
      clear();
    }
  }, []);

  return <>{children}</>;
}