// src/app/(app)/links/[id]/campaign/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LinkSettingsSidebar } from '@/components/layout/link-settings-side-bar';
import { useLinkParams } from '@/context/LinkParamsContext';
import { Link as LinkIcon, Copy, ExternalLink, BarChart2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function CampaignPage() {
  const router = useRouter();
  const pathname = usePathname() || '';
  const toast = useToast();
  const { id, shortUrl } = useLinkParams();

  // campaign tracking fields
  const [source, setSource] = useState('');
  const [medium, setMedium] = useState('');
  const [campaign, setCampaign] = useState('');
  const [term, setTerm] = useState('');
  const [content, setContent] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');

  // rebuild generated URL on input change
  useEffect(() => {
    const params = new URLSearchParams();
    if (source) params.set('utm_source', source);
    if (medium) params.set('utm_medium', medium);
    if (campaign) params.set('utm_campaign', campaign);
    if (term) params.set('utm_term', term);
    if (content) params.set('utm_content', content);
    const base = shortUrl || '';
    setGeneratedUrl(params.toString() ? `${base}?${params.toString()}` : base);
  }, [source, medium, campaign, term, content, shortUrl]);

  const handleSave = async () => {
    toast.toast({ title: 'Campaign parameters saved' });
  };

  return (
    <div className="flex space-x-6 p-6">
      <LinkSettingsSidebar linkId={id} active={pathname} />
      <div className="flex-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Tracking</CardTitle>
            {/* Short URL & actions */}
            <div className="flex items-center space-x-2">
              <LinkIcon className="h-4 w-4 text-primary" />
              <Link
                href={`/links/${id}`}
                className="text-primary underline hover:text-primary/80"
              >
                {shortUrl}
              </Link>
              <Copy className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer" />
              <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer" />
              <BarChart2 className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer" />
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive cursor-pointer" />
            </div>
            <CardDescription>
              Track online marketing campaigns using short URL. Add UTM tags to see traffic data in Google Analytics.
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-6">
            {/* Templates section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Templates</h3>
              <div className="border rounded-lg p-6 text-center text-muted-foreground">
                You don't have any templates to use.
                <div className="mt-4">
                  <Button variant="outline">Create Template</Button>
                </div>
              </div>
            </div>

            {/* UTM Form */}
            <div className="space-y-4">
              <div className="flex space-x-4">
                <Input
                  placeholder="Source (e.g., twitter, facebook)"
                  value={source}
                  onChange={e => setSource(e.currentTarget.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Medium (e.g., banner, email)"
                  value={medium}
                  onChange={e => setMedium(e.currentTarget.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Campaign (e.g., acme_campaign)"
                  value={campaign}
                  onChange={e => setCampaign(e.currentTarget.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex space-x-4">
                <Input
                  placeholder="Campaign term (identify the paid keywords)"
                  value={term}
                  onChange={e => setTerm(e.currentTarget.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Campaign content (use to differentiate ads)"
                  value={content}
                  onChange={e => setContent(e.currentTarget.value)}
                  className="flex-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Generated long URL with UTM tags</label>
                <Textarea
                  value={generatedUrl}
                  readOnly
                  className="h-24"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-4 pt-4">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
