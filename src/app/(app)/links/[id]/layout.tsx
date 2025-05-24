// src/app/links/[id]/layout.tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useLinkParams } from '@/context/LinkParamsContext';
import { debugLog } from '@/lib/logging';

export default function LinkIdLayout({ children }: { children: ReactNode }) {
  const { id } = useParams() as { id: string };
  const { linkItem, initialize } = useLinkParams();

  useEffect(() => {
    debugLog('src/app/links/[id]:LinkIdLayout called to populate context');
    // Only fetch & initialize if we don't already have the correct link in context
    if (!linkItem || linkItem.id !== id) {
      (async () => {
        try {
          const res = await fetch(`/api/links/${id}`);
          if (!res.ok) throw new Error('Failed to fetch link');
          const data = await res.json();
          initialize(data);
        } catch (err) {
          console.error('Error loading link for context:', err);
        }
      })();
    }
  }, [id, linkItem, initialize]);

  // This layout doesn't render anything itself—just populates context if needed.
  return <>{children}</>;
}