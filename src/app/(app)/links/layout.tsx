// src/app/(app)/links/layout.tsx
'use client';

import { ReactNode } from 'react';
import { LinkParamsProvider } from '@/context/LinkParamsContext';

export default function LinksLayout({ children }: { children: ReactNode }) {
  return (
    <LinkParamsProvider>
      {children}
    </LinkParamsProvider>
  );
}