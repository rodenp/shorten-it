// src/app/(app)/links/[id]/layout.tsx
'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLinkParams } from '@/context/LinkParamsContext';
import { debugLog } from '@/lib/logging';

export default function LinkIdLayout({ children }: { children: ReactNode }) {
  const { id } = useParams() as { id: string };
  const { linkItem, initialize, getCurrentLinkItem } = useLinkParams();

  const [contextReady, setContextReady] = useState(false);
  const initializedRef = useRef(false);

  // Fetch and initialize context once per ID
  useEffect(() => {
    if (!initializedRef.current && id) {
      debugLog('src/app/links/[id]:LinkIdLayout - fetching link data for ID:', id);
      (async () => {
        try {
          const res = await fetch(`/api/links/${id}`);
          if (!res.ok) throw new Error('Failed to fetch link');
          const data = await res.json();

          initialize(data); // sets all context state
          initializedRef.current = true;
          setContextReady(true);

          console.log('✅ Initialized link context:', data);
        } catch (err) {
          console.error('Error loading link for context:', err);
        }
      })();
    }
  }, [id, initialize]);

  // Log the current context after it has been initialized and state has updated
  useEffect(() => {
    if (contextReady) {
      const current = getCurrentLinkItem();
      console.log('📦 LinkIdLayout:linkItem=', current);
      debugLog('src/app/links/[id]:LinkIdLayout:linkItem=', current);
    }
  }, [contextReady, getCurrentLinkItem]);

  return <>{children}</>;
}