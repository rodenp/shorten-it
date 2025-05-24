// src/components/ABPage.tsx
'use client';

import React, { useState } from 'react';
import { useLinkParams } from '@/context/LinkParamsContext';
import { useRouter, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { LinkSettingsSidebar } from '@/components/layout/link-settings-side-bar';
import { Copy, ExternalLink, BarChart2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export function ABPage() {
  const {
    id,
    originalUrl,
    shortUrl,
    slug,
    title,
    tags,
    folderId,
    domainId,
    targets,
    abTestConfig,
    isCloaked,
    clear,
  } = useLinkParams();

  const router   = useRouter();
  const pathname = usePathname()!;
  const toast    = useToast();

  // initialize local state from context only once
  const [variantB, setVariantB] = useState(() => abTestConfig?.variantBUrl ?? '');
  const [split,    setSplit]    = useState(() => abTestConfig?.splitPercentage ?? 50);

  // if somehow context is empty, bail
  if (!originalUrl) return null;

  const normalize = (u: string) => {
    const t = u.trim();
    return t.startsWith('http') ? t : 'https://' + t;
  };

  const handleSave = async () => {

  const basePayload: any = {
    targets: [
        { url: normalize(originalUrl), weight: split || 50},
        { url: normalize(variantB),  weight: 100 - split || 50 },
    ],
      abTestConfig: {
        variantAUrl: normalize(originalUrl),
        variantBUrl: normalize(variantB),
        splitPercentage: split,
      },
    };
    const method = id ? 'PATCH' : 'POST';
    const url = id ? `/api/links/${id}` : '/api/links';

    let payload: any;

    if (method === 'POST') {
      payload = {
        ...(originalUrl != null && { originalUrl }),
        ...(slug != null && { slug }),
        ...(title != null && { title }),
        ...(tags != null && { tags }),
        ...(folderId != null && { folderId }),
        ...(domainId != null && { domainId }),
        ...(targets != null && { targets }),
        ...(abTestConfig != null && { abTestConfig }),
        ...(isCloaked != null && { isCloaked }),
        ...(shortUrl != null && { shortUrl }),
        ...basePayload,
      };
    } else {
      // For PATCH, send everything, including nulls to explicitly clear fields
      payload = {
        originalUrl,
        slug,
        title,
        tags,
        folderId,
        domainId,
        ...basePayload,
      };
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      toast.toast({ title: id ? 'A/B settings updated!' : 'Link created with A/B test!' });
    } catch (err: any) {
      toast.toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex items-start">
      <LinkSettingsSidebar linkId={id} active={pathname} />

      <main className="flex-1 p-8 space-y-6 overflow-auto">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">A/B Testing</h1>
          <div className="flex items-center space-x-3 text-muted-foreground">
            <Link href={shortUrl} className="underline text-primary">
              {shortUrl}
            </Link>
            <ExternalLink className="cursor-pointer" />
            <Copy className="cursor-pointer" />
            <BarChart2 className="cursor-pointer" />
            <Trash2 className="cursor-pointer" />
          </div>
          <p className="text-sm text-muted-foreground">
            Test which variation of a web page delivers the best result.
          </p>
        </header>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle>Experiments</CardTitle>
            <CardDescription>Configure your A/B test</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Original URL (read-only) */}
            <div>
              <label className="block text-sm font-medium mb-1">Original page</label>
              <Input value={originalUrl} readOnly />
            </div>

            {/* Variation URL */}
            <div>
              <label className="block text-sm font-medium mb-1">Variation page</label>
              <Input
                value={variantB}
                onChange={e => setVariantB(e.currentTarget.value)}
              />
            </div>

            {/* Traffic split */}
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

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-4">
              <Button onClick={handleSave}>
                {id ? 'Save changes' : 'Create & Save'}
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