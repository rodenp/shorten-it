// src/components/links/CampaignTemplateModal.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface CampaignTemplateData {
  name: string;
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
}

interface CampaignTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortUrl: string;
  onSave: (data: CampaignTemplateData) => void;
}

export default function CampaignTemplateModal({
  open,
  onOpenChange,
  shortUrl,
  onSave,
}: CampaignTemplateModalProps) {
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [medium, setMedium] = useState('');
  const [campaign, setCampaign] = useState('');
  const [term, setTerm] = useState('');
  const [content, setContent] = useState('');

  const generatedUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (source) params.set('utm_source', source);
    if (medium) params.set('utm_medium', medium);
    if (campaign) params.set('utm_campaign', campaign);
    if (term) params.set('utm_term', term);
    if (content) params.set('utm_content', content);
    const qs = params.toString();
    return qs ? `${shortUrl}?${qs}` : shortUrl;
  }, [shortUrl, source, medium, campaign, term, content]);

  const handleSave = () => {
    onSave({ name, source, medium, campaign, term, content });
    // reset
    setName('');
    setSource('');
    setMedium('');
    setCampaign('');
    setTerm('');
    setContent('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Campaign Template</DialogTitle>
        </DialogHeader>
        <Card>
          <CardContent className="space-y-4">
            <Input
              placeholder="Template name *"
              value={name}
              onChange={e => setName(e.currentTarget.value)}
              className="w-full"
            />
            <div className="flex space-x-4">
              <Input
                placeholder="Source"
                value={source}
                onChange={e => setSource(e.currentTarget.value)}
                className="flex-1"
              />
              <Input
                placeholder="Medium"
                value={medium}
                onChange={e => setMedium(e.currentTarget.value)}
                className="flex-1"
              />
              <Input
                placeholder="Campaign"
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
              <label className="block text-sm font-medium mb-1">
                Generated URL
              </label>
              <Input readOnly value={generatedUrl} className="h-24" />
            </div>
          </CardContent>
          <CardContent className="flex space-x-4 pt-4">
            <Button onClick={handleSave} disabled={!name}>
              Save Template
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}