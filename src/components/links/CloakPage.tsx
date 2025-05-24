// src/components/links/CloakPage.tsx
'use client';

import React, { useState } from 'react';
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
import { Copy, ExternalLink, BarChart2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function CloakPage() {

  const pathname = usePathname() || '';
  const router = useRouter();
  const toast = useToast();

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
      rotationStart,
      rotationEnd,
      clickLimit,
      setIsCloaked,
    } = useLinkParams();

  const handleSave = async () => {

  let payload: any;
  const method = id ? 'PATCH' : 'POST';
  const url = id ? `/api/links/${id}` : '/api/links';

  const basePayload: any = {
      isCloaked: isCloaked
  };

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
        ...(rotationStart != null && { rotationStart }),
        ...(rotationEnd != null && { rotationEnd }),
        ...(clickLimit != null && { clickLimit }),
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
    // persist cloaking setting
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    toast.toast({ title: id ? 'Cloaking settings updated!' : 'Cloaking settings created' });
  } catch (err: any) {
    toast.toast({ title: 'Error', description: err.message, variant: 'destructive' });
  }
};

return (
  <div className="flex items-start">
    <LinkSettingsSidebar linkId={id} active={pathname} />

    <main className="flex-1 p-8 space-y-6 overflow-auto">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Link cloaking</h1>
        <div className="flex items-center space-x-3 text-muted-foreground">
          <Link href={shortUrl} className="underline text-primary">
            {shortUrl}
          </Link>
          <Copy className="cursor-pointer hover:text-primary" />
          <ExternalLink className="cursor-pointer hover:text-primary" />
          <BarChart2 className="cursor-pointer hover:text-primary" />
          <Trash2 className="cursor-pointer hover:text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground">
          Hide original URL so that your customers can see only the short URL in their browser&apos;s address bar.
        </p>
      </header>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Link cloaking</CardTitle>
          <CardDescription>Enable or disable URL cloaking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
              value={shortUrl}
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

      <div className="text-right">
        <Link href="/links" className="text-primary hover:underline">
          LINK LIST [ESC]
        </Link>
      </div>
    </main>
  </div>
  );
}