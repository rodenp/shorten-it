// src/components/links/CampaignTemplatesSettings.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2 } from 'lucide-react';
import CampaignTemplateModal, { CampaignTemplateData } from '@/components/links/CampaignTemplateModal';

interface TemplateItem extends CampaignTemplateData {
  id: string;
}

export function CampaignTemplatesSettings() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateItem | null>(null);

  // Load templates on mount
  useEffect(() => {
    fetch('/api/campaign-templates')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTemplates(data);
      })
      .catch(err => toast({ title: 'Error loading templates', description: err.message, variant: 'destructive' }));
  }, [toast]);

  // Create or update
  const handleSave = async (data: CampaignTemplateData) => {
    try {
      let res;
      if (editing) {
        res = await fetch(`/api/campaign-templates/${editing.id}`, {
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
        editing ? ts.map(t => (t.id === saved.id ? saved : t)) : [...ts, saved]
      );
      toast({ title: editing ? 'Template updated' : 'Template created' });
      setEditing(null);
      setIsModalOpen(false);
    } catch (err: any) {
      toast({ title: 'Error saving template', description: err.message, variant: 'destructive' });
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/campaign-templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      setTemplates(ts => ts.filter(t => t.id !== id));
      toast({ title: 'Template deleted' });
    } catch (err: any) {
      toast({ title: 'Error deleting template', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Templates</CardTitle>
        <CardDescription>Define reusable UTM parameter sets</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button size="sm" onClick={() => setIsModalOpen(true)}>
          New Template
        </Button>

        {templates.map(t => (
          <div key={t.id} className="border p-4 rounded-md flex justify-between items-center">
            <div>
              <div className="font-medium">{t.name}</div>
              <div className="text-sm text-muted-foreground">
                {t.source && `Source: ${t.source}`} {t.medium && `• Medium: ${t.medium}`} {' '}
                {t.campaign && `• Campaign: ${t.campaign}`} {t.term && `• Term: ${t.term}`} {' '}
                {t.content && `• Content: ${t.content}`}
              </div>
            </div>
            <div className="flex space-x-2">
              <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setIsModalOpen(true); }}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <CampaignTemplateModal
        open={isModalOpen}
        onOpenChange={open => {
          setIsModalOpen(open);
          if (!open) setEditing(null);
        }}
        shortUrl={'' /* not used here */}
        onSave={handleSave}
      />
    </Card>
  );
}