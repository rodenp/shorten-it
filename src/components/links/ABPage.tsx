'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLinkParams } from '@/context/LinkParamsContext';
import { useRouter, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { LinkSettingsSidebar } from '@/components/layout/link-settings-side-bar';
import { ChevronLeft, Copy, ExternalLink, BarChart2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generatePayloadFromContext, normalizeUrl } from '@/lib/utils';
import Link from 'next/link';
import { debugLog } from '@/lib/logging';
import type { LinkItem } from '@/types';

export function ABPage() {
  const {
    id,
    originalUrl,
    shortUrl,
    abTestConfig,
    setTargets,
    setAbTestConfig,
    getCurrentLinkItem,
  } = useLinkParams();
  const ctx = getCurrentLinkItem();

  const router = useRouter();
  const pathname = usePathname()!;
  const toast = useToast();

  const originalRef = useRef<LinkItem | null>(null);
  const [variantB, setVariantB] = useState('');
  const [split, setSplit] = useState(50);
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    const current = getCurrentLinkItem();

    if (current.id && originalRef.current?.id !== current.id) {
      originalRef.current = structuredClone(current);
      setVariantB(current.abTestConfig?.variantBUrl ?? '');
      setSplit(current.abTestConfig?.splitPercentage ?? 50);
      setHasChanged(false);
      console.log('✅ ABPage: Snapshot original context', originalRef.current);
    }
  }, [id]);

  useEffect(() => {
    const original = originalRef.current;
    if (!original) return;

    const origAb = original.abTestConfig ?? { variantBUrl: '', splitPercentage: 50 };
    const hasDiff = variantB !== origAb.variantBUrl || split !== origAb.splitPercentage;
    setHasChanged(hasDiff);
  }, [variantB, split]);

  const handleSave = async () => {
    const ab = {
      variantAUrl: originalUrl,
      variantBUrl: normalizeUrl(variantB),
      splitPercentage: split,
    };
    setAbTestConfig(ab);

    const targets = [
      { url: originalUrl, weight: split || 50 },
      { url: normalizeUrl(variantB), weight: 100 - split || 50 },
    ];
    setTargets(targets);

    const current = getCurrentLinkItem();
    const original = originalRef.current;

    if (JSON.stringify(current) === JSON.stringify(original)) {
      toast.toast({ title: 'No changes to save.' });
      return;
    }

    const method = id ? 'PATCH' : 'POST';
    const url = id ? `/api/links/${id}` : '/api/links';

    const payload = generatePayloadFromContext({
      method,
      context: ctx,
      original: original!,
      current,
    });

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      originalRef.current = JSON.parse(JSON.stringify(current));
      toast.toast({ title: id ? 'A/B settings updated!' : 'Link created with A/B test!' });
      setHasChanged(false);
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

        <Card>
          <CardHeader>
            <CardTitle>A/B Testing</CardTitle>
            <CardDescription>Test which variation of a web page delivers the best result.</CardDescription>
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
            <div>
              <label className="block text-sm font-medium mb-1">Original page</label>
              <Input value={originalUrl} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Variation page</label>
              <Input
                value={variantB}
                onChange={e => setVariantB(e.currentTarget.value)}
              />
            </div>
            <div className="space-y-2">
              <Slider
                value={[split]}
                onValueChange={([v]) => setSplit(v)}
                min={0}
                max={100}
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>0%</span>
                <span>{split}%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button onClick={handleSave} disabled={!hasChanged}>
                {id ? 'Save' : 'Create'}
              </Button>
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}