// components/CreateLinkBar.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { useLinkParams } from '@/context/LinkParamsContext';

export function CreateLinkBar() {
  const [url, setUrl] = useState('');
  const router = useRouter();
  const { originalUrl, setOriginalUrl, setSlug } = useLinkParams();

  const handleGo = () => {
    const trimmed = originalUrl.trim();
    if (!trimmed) return;

    // 1) Set the original URL in context
    setOriginalUrl(trimmed);

    // 2) Generate and set a random slug (6 characters)
    const newSlug = Math.random().toString(36).substring(2, 8);
    setSlug(newSlug);

    // 3) Navigate to the edit page
    router.push('/links/basic');
  };

  return (
    <div className="mt-6 mb-8 flex justify-center">
      <div className="flex items-stretch border border-muted rounded-lg overflow-hidden max-w-3xl w-full">
        <Input
          className="flex-1 placeholder:text-muted-foreground px-4 py-3"
          placeholder="Paste URL here…"
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGo()}
        />
        <Button onClick={handleGo} variant="default" className="px-4">
          <Plus className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}