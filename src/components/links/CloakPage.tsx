// src/components/links/CloakPage.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLinkParams } from '@/context/LinkParamsContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import  { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { LinkSettingsSidebar } from '@/components/layout/link-settings-side-bar';
import { ChevronLeft, Copy, ExternalLink, BarChart2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generatePayloadFromContext, normalizeUrl } from '@/lib/utils';
import { debugLog  } from '@/lib/logging';
import type { LinkItem } from '@/types'; 


export function CloakPage() {

  const pathname = usePathname() || '';
  const router = useRouter();
  const toast = useToast();
  const originalRef = useRef<LinkItem | null>(null);

  const {
      id,
      originalUrl,
      shortUrl,
      isCloaked,
      setIsCloaked,
      getCurrentLinkItem,
    } = useLinkParams();

  const ctx = getCurrentLinkItem();

  useEffect(() => {
    const current = getCurrentLinkItem();

    // If no ID or mismatched ID, update originalRef
    if (current.id && originalRef.current?.id !== current.id) {
      originalRef.current = structuredClone(current);
      console.log('✅ CloakPage:Reinitialized original context for new link:', originalRef.current);
    }
  }, [id]);

  const handleSave = async () => {

    const original = originalRef.current;
    const current = getCurrentLinkItem();

    const method = id ? 'PATCH' : 'POST';
    const url = id ? `/api/links/${id}` : '/api/links';

    debugLog(`src/components/links/CloakPage:handleSave: original=${JSON.stringify(original, null, 2)}`);
    console.log(`src/components/links/CloakPage:handleSave: original=`, original);
    debugLog(`src/components/links/CloakPage:handleSave: current=${JSON.stringify(current, null, 2)}`);
    console.log(`src/components/links/CloakPage:handleSave: current=`, current);

    const hasChanged =
      current.id.trim() === '' || JSON.stringify(current) !== JSON.stringify(original);

    if (!hasChanged) {
      toast.toast({ title: 'No changes to save.' });
      return;
    }

    const payload = generatePayloadFromContext({
      method: method,
      context: ctx,
      original: original!,
      current
    });

    try {
      // persist cloaking setting
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      originalRef.current = JSON.parse(JSON.stringify({ ...current, id: data.isCloaked }));
      toast.toast({ title: id ? 'Cloaking settings updated!' : 'Cloaking settings created' });
    } catch (err: any) {
      toast.toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

return (
  <div className="flex items-start">
    <LinkSettingsSidebar linkId={id} active={pathname} />

    <main className="flex-1 p-8 space-y-6 overflow-auto">
        <header className="flex items-center justify-between">
          <Link href="/links" className="flex items-center text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5 mr-2" /> LINK LIST
          </Link>
        </header>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Link cloaking</CardTitle>
          <CardDescription>Hide original URL so that your customers can see only the short URL in their browser's address bar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-center space-x-3 text-muted-foreground">
              <Link href={shortUrl} className="underline text-primary">
                {shortUrl}
              </Link>
              <Copy className="cursor-pointer hover:text-primary" />
              <ExternalLink className="cursor-pointer hover:text-primary" />
              <BarChart2 className="cursor-pointer hover:text-primary" />
              <Trash2 className="cursor-pointer hover:text-destructive" />
            </div>
          <div className="flex items-center space-x-4">
            <Switch
              id="cloak-switch"
              checked={isCloaked}
              onCheckedChange={(val) => setIsCloaked(val)}
            />
            <span className="font-medium">Cloaking enabled</span>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Visitor will see</label>
            <Textarea
              value={originalUrl}
              disabled
              className="h-24"
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <Button onClick={handleSave}>SAVE</Button>
            <Button variant="outline" onClick={() => router.back()}>CANCEL</Button>
          </div>
        </CardContent>
      </Card>

    </main>
  </div>
  );
}