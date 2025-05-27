// src/components/links/BasicLinkPage.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
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
import { debugLog } from '@/lib/logging';
import type { LinkItem } from '@/types';
import { generatePayloadFromContext, normalizeUrl } from '@/lib/utils';

export function BasicLinkPage() {
  const {
    id,
    setShortUrl,
    domain,
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
    shortUrl,
    getCurrentLinkItem,
    setId,
  } = useLinkParams();

  const router = useRouter();
  const pathname = usePathname() || '';
  const toast = useToast();

  const originalRef = useRef<LinkItem | null>(null);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [hasChanged, setHasChanged] = useState(false);

  const ctx = getCurrentLinkItem();

  const markAsChanged = () => setHasChanged(true);

  useEffect(() => {
    fetch('/api/folders')
      .then(r => r.ok ? r.json() : Promise.reject('Could not load'))
      .then(setFolders)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const current = getCurrentLinkItem();

    // If no ID or mismatched ID, update originalRef
    if (current.id && originalRef.current?.id !== current.id) {
      originalRef.current = structuredClone(current);
      setHasChanged(false);
      console.log('✅ BasicLinkPage:Reinitialized original context for new link:', originalRef.current);
    }
  }, [id]);

  useEffect(() => {
    const newShort = `${normalizeUrl(domain!)}/${slug}`;
    setShortUrl(newShort);
  }, [domain, slug, setShortUrl]);

  const handleSave = async () => {
    const current = getCurrentLinkItem();
    const original = originalRef.current;

    debugLog(`src/components/links/BasicLinkPage:handleSave: original=${JSON.stringify(original, null, 2)}`);
    console.log(`src/components/links/BasicLinkPage:handleSave: original=`, original);
    debugLog(`src/components/links/BasicLinkPage:handleSave: current=${JSON.stringify(current, null, 2)}`);
    console.log(`src/components/links/BasicLinkPage:handleSave: current=`, current);

    const hasChanged =
      current.id.trim() === '' || JSON.stringify(current) !== JSON.stringify(original);

    if (!hasChanged) {
      toast.toast({ title: 'No changes to save.' });
      return;
    }

    const method = id ? 'PATCH' : 'POST';
    const url = id ? `/api/links/${id}` : '/api/links';

    const payload = generatePayloadFromContext({
      method: method,
      context: ctx,
      original: original!,
      current
    });

    debugLog('Saving link payload:', payload);
    console.log('Saving link payload:', payload);

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      if (!id) {
        setId(data.id);
        originalRef.current = JSON.parse(JSON.stringify({ ...current, id: data.id }));
      } else {
        originalRef.current = JSON.parse(JSON.stringify(getCurrentLinkItem()));
      }

      setHasChanged(false);
      toast.toast({ title: id ? 'Link updated!' : 'Link created!' });
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
            <CardTitle>{id ? 'Edit Short URL' : 'Create Short URL'}</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-4">
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
              <label className="block text-sm font-medium mb-1">Link slug</label>
              <Input value={slug} onChange={e => { setSlug(e.currentTarget.value); markAsChanged(); }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Link title</label>
              <Input value={title} onChange={e => { setTitle(e.currentTarget.value); markAsChanged(); }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Original URL</label>
              <Input value={originalUrl} onChange={e => { setOriginalUrl(e.currentTarget.value); markAsChanged(); }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Link in folder</label>
              <select
                value={folderId ?? ''}
                onChange={e => { setFolderId(e.target.value || null); markAsChanged(); }}
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
                onChange={e => {
                  setTags(e.currentTarget.value.split(/\s+/).filter(Boolean));
                  markAsChanged();
                }}
              />
            </div>
            <div className="flex justify-end space-x-4 pt-4">
              <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button onClick={handleSave} disabled={!hasChanged}>{id ? 'Save' : 'Create'}</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}