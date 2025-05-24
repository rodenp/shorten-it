// src/app/(app)/links/[id]/campaign/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LinkSettingsSidebar } from '@/components/layout/link-settings-side-bar';
import { useLinkParams } from '@/context/LinkParamsContext';
import {
  Link as LinkIcon,
  Copy,
  ExternalLink,
  BarChart2,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CampaignTemplateModal, { CampaignTemplateData } from '@/components/links/CampaignTemplateModal';

export function CampaignPage() {
  const router   = useRouter();
  const pathname = usePathname() || '';
  const toast    = useToast();
  const { id, shortUrl } = useLinkParams();

  // UTM inputs
  const [source, setSource]   = useState('');
  const [medium, setMedium]   = useState('');
  const [campaign, setCampaign] = useState('');
  const [term, setTerm]       = useState('');
  const [content, setContent] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CampaignTemplateData | null>(null);

  interface Template extends CampaignTemplateData { id: string }

  // Load templates
  useEffect(() => {
    fetch('/api/campaign-templates')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setTemplates)
      .catch(() => {});
  }, []);

  // Recompute the generated URL whenever inputs change
  useEffect(() => {
    const params = new URLSearchParams();
    if (source)   params.set('utm_source', source);
    if (medium)   params.set('utm_medium', medium);
    if (campaign) params.set('utm_campaign', campaign);
    if (term)     params.set('utm_term', term);
    if (content)  params.set('utm_content', content);
    setGeneratedUrl(params.toString() ? `${shortUrl}?${params.toString()}` : shortUrl);
  }, [source, medium, campaign, term, content, shortUrl]);

  // Apply an existing template
  const applyTemplate = (tmpl: Template) => {
    setSource(tmpl.source);
    setMedium(tmpl.medium);
    setCampaign(tmpl.campaign);
    setTerm(tmpl.term);
    setContent(tmpl.content);
  };

  // Save campaign config
  const handleSaveCampaign = () => {
    toast.toast({ title: 'Campaign parameters saved' });
  };

  // When modal saves or updates a template:
  const handleTemplateSave = async (data: CampaignTemplateData) => {
    try {
      let res;
      if (editingTemplate && 'id' in editingTemplate) {
        res = await fetch(`/api/campaign-templates/${(editingTemplate as any).id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else {
        res = await fetch('/api/campaign-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      setTemplates(ts =>
        editingTemplate
          ? ts.map(t => (t.id === saved.id ? saved : t))
          : [...ts, saved]
      );
      setEditingTemplate(null);
      setModalOpen(false);
      toast.toast({ title: editingTemplate ? 'Template updated' : 'Template created' });
    } catch (err: any) {
      toast.toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <div className="flex space-x-6 p-6">
        <LinkSettingsSidebar linkId={id} active={pathname} />
        <div className="flex-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Tracking</CardTitle>
              <CardDescription>
                Track online marketing campaigns using your short URL. Add UTM tags to see data in Google Analytics.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="space-y-6">
              {/* Short URL & Actions */}
              <div className="flex items-center space-x-2">
                <LinkIcon className="h-4 w-4 text-primary" />
                <Link href={`/links/${id}`} className="text-primary underline hover:text-primary/80">
                  {shortUrl}
                </Link>
                <Copy className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer" />
                <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer" />
                <BarChart2 className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer" />
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive cursor-pointer" />
              </div>

              {/* Templates Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Templates</h3>
                  <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
                    Create Template
                  </Button>
                </div>
                {templates.length > 0 ? (
                  <div className="flex space-x-4 overflow-x-auto">
                    {templates.map(t => (
                      <div key={t.id} className="flex-shrink-0 border rounded-lg p-4 w-48 space-y-2">
                        <div className="text-sm font-medium">{t.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.source} / {t.medium}
                        </div>
                        <Button size="sm" onClick={() => applyTemplate(t)}>Use</Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border rounded-lg p-6 text-center text-muted-foreground">
                    You don’t have any templates.
                  </div>
                )}
              </div>

              {/* UTM Form */}
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <Input
                    placeholder="Source (e.g., twitter)"
                    value={source}
                    onChange={e => setSource(e.currentTarget.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Medium (e.g., banner)"
                    value={medium}
                    onChange={e => setMedium(e.currentTarget.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Campaign (e.g., summer_sale)"
                    value={campaign}
                    onChange={e => setCampaign(e.currentTarget.value)}
                    className="flex-1"
                  />
                </div>
                <div className="flex space-x-4">
                  <Input
                    placeholder="Campaign term"
                    value={term}
                    onChange={e => setTerm(e.currentTarget.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Campaign content"
                    value={content}
                    onChange={e => setContent(e.currentTarget.value)}
                    className="flex-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Generated campaign template</label>
                  <Input
                    value={generatedUrl}
                    readOnly
                    className="h-24"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-4 pt-4">
                <Button onClick={handleSaveCampaign}>Save</Button>
                <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Campaign Template Modal */}
      <CampaignTemplateModal
        open={modalOpen}
        onOpenChange={open => {
          setModalOpen(open);
          if (!open) setEditingTemplate(null);
        }}
        shortUrl={generatedUrl}
        onSave={handleTemplateSave}
      />
    </>
  );
}