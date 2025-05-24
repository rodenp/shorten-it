// src/components/links/BasicLinkPage.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLinkParams } from '@/context/LinkParamsContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LinkSettingsSidebar } from '@/components/layout/link-settings-side-bar';
import { ChevronLeft, Copy, ExternalLink, BarChart2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function BasicLinkPage() {
  // ── 1) Hooks first ──────────────────────────────────────────
  const {
    id,
    setShortUrl,
    domain,
    domainId,
    originalUrl,
    setOriginalUrl,
    slug,
    setSlug,
    title,
    setTitle,
    folderId,
    setFolderId,
    tags,
    setTags,
    targets,
    shortUrl,
    clear,
    abTestConfig,
    isCloaked,
    rotationStart,
    rotationEnd,
    clickLimit,
  } = useLinkParams();

  const router = useRouter();
  const pathname = usePathname() || '';
  const toast = useToast();

  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch('/api/folders')
      .then(r => r.ok ? r.json() : Promise.reject('Could not load'))
      .then(setFolders)
      .catch(console.error);
  }, []);

  /*
  useEffect(() => {
    if (id && !originalUrl) {
      router.replace('/links');
    }
  }, [id, originalUrl, router]);
  */

  useEffect(() => {
    const newShort = domain
      ? `${domain.replace(/^https?:\/\//, '')}/${slug}`
      : slug;
    setShortUrl(newShort);
  }, [domain, slug, setShortUrl]);

  function normalizeUrl(u: string) {
    const t = u.trim();
    return t.startsWith('http://') || t.startsWith('https://')
      ? t
      : 'https://' + t;
  }

  const handleSave = async () => {
    const norm = normalizeUrl(originalUrl);
    setOriginalUrl(norm);
    const computedTargets =
      targets != null
        ? targets
        : [{ url: normalizeUrl(norm), weight: 100 }];

    const basePayload = {
      originalUrl: norm,
      slug,
      title,
      tags,
      folderId,
      domainId,
      computedTargets
    };
    const method = id ? 'PATCH' : 'POST';
    const url = id ? `/api/links/${id}` : '/api/links';

    let payload: any;

    if (method === 'POST') {
      payload = {
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
      toast.toast({ title: id ? 'Link updated!' : 'Link created!' });
    } catch (err: any) {
      toast.toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // ── 2) Now render ──────────────────────────────────────────
  return (
    <div className="flex items-start">
      <LinkSettingsSidebar linkId={id} active={pathname} />

      <main className="flex-1 p-8 space-y-6 overflow-auto">
        <header className="flex items-center justify-between">
          <Link href="/links" className="flex items-center text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5 mr-2" /> LINK LIST
          </Link>
          <div className="flex space-x-3">
            <ExternalLink className="cursor-pointer" />
            <Copy className="cursor-pointer" />
            <BarChart2 className="cursor-pointer" />
            <Trash2 className="cursor-pointer" />
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>{id ? 'Edit Short URL' : 'Create Short URL'}</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Short URL</label>
              <p className="text-primary truncate">{shortUrl}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Link slug</label>
              <Input value={slug} onChange={e => setSlug(e.currentTarget.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Link title</label>
              <Input value={title} onChange={e => setTitle(e.currentTarget.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Original URL</label>
              <Input value={originalUrl} onChange={e => setOriginalUrl(e.currentTarget.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Link in folder</label>
              <select
                value={folderId ?? ''}
                onChange={e => setFolderId(e.target.value || null)}
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">No folder</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tags</label>
              <Input
                placeholder="space-separated tags"
                value={tags.join(' ')}
                onChange={e => setTags(e.currentTarget.value.split(/\s+/).filter(Boolean))}
              />
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button onClick={handleSave}>{id ? 'Save' : 'Create'}</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}