'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLinkParams } from '@/context/LinkParamsContext';
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
import {
  ChevronLeft,
  Save,
  Trash2,
  Plus,
  Copy,
  ExternalLink,
  BarChart2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { nanoid } from 'nanoid';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableTargetItem } from '@/components/links/SortableTargetItem';

type Target = { id: string; url: string; weight: number };

export function URLRotatePage() {
  const router = useRouter();
  const pathname = usePathname() || '';
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
    abTestConfig,
    isCloaked,
    rotationStart,
    rotationEnd,
    clickLimit,
    targets,
    setTargets,
    setRotationStart,
    setRotationEnd,
    setClickLimit,
  } = useLinkParams();

  const [localTargets, setLocalTargets] = useState<Target[]>([]);

  useEffect(() => {
    setLocalTargets(prev => {
      return targets.map((t, i) => {
        const existing = prev[i];
        return {
          id: existing?.id ?? nanoid(), // reuse previous id if available
          ...t,
        };
      });
    });
  }, [targets]);

  const syncTargets = (updatedLocal: Target[]) => {
    setLocalTargets(updatedLocal);
    setTargets(updatedLocal.map(({ id, ...rest }) => rest));
  };

  const normalizeUrl = (url: string): string => {
  const trimmed = url.trim();

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('localhost') ||
    trimmed.startsWith('http://localhost') ||
    trimmed.startsWith('https://localhost')
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
  };

  const addTarget = () => {
    const updated = [...localTargets, { id: nanoid(), url: '', weight: 1 }];
    syncTargets(updated);
  };

  const removeTarget = (targetId: string) => {
    const updated = localTargets.filter(t => t.id !== targetId);
    syncTargets(updated);
  };

  const updateTarget = (
    targetId: string,
    field: 'url' | 'weight',
    value: string | number
  ) => {
    const updated = localTargets.map(t =>
      t.id === targetId ? { ...t, [field]: value } : t
    );
    syncTargets(updated);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localTargets.findIndex(t => t.id === active.id);
      const newIndex = localTargets.findIndex(t => t.id === over.id);
      const updated = arrayMove(localTargets, oldIndex, newIndex);
      syncTargets(updated);
    }
  }, [localTargets]);

  const formatForInput = (value: string | null): string => {
    if (!value) return '';
    const date = new Date(value);
    return date.toISOString().slice(0, 16);
  };

  const handleSave = async () => {
    const method = id ? 'PATCH' : 'POST';
    const url = id ? `/api/links/${id}` : '/api/links';

    try {
      const urlLines = localTargets.map(t => t.url.trim()).filter(Boolean);
      if (urlLines.length === 0) throw new Error('At least one URL is required');

      const numUrls = urlLines.length;
      const baseWeight = Math.floor(100 / numUrls);
      const remainder = 100 % numUrls;

      const linkTargets = urlLines.map((url, idx) => ({
        url: normalizeUrl(url.trim()),
        weight: baseWeight + (idx < remainder ? 1 : 0),
      }));

      const basePayload = {
        targets: linkTargets,
        rotationStart,
        rotationEnd,
        clickLimit: clickLimit || null,
      };

      const payload = method === 'POST'
        ? {
            ...(originalUrl != null && { originalUrl }),
            ...(slug != null && { slug }),
            ...(title != null && { title }),
            ...(tags != null && { tags }),
            ...(folderId != null && { folderId }),
            ...(domainId != null && { domainId }),
            ...(abTestConfig != null && { abTestConfig }),
            ...(isCloaked != null && { isCloaked }),
            ...(shortUrl != null && { shortUrl }),
            ...basePayload,
          }
        : {
            originalUrl,
            slug,
            title,
            tags,
            folderId,
            domainId,
            ...basePayload,
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      toast.toast({ title: id ? 'URL Rotation updated!' : 'URL Rotation created' });
    } catch (err: any) {
      toast.toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex space-x-6 p-6">
      <LinkSettingsSidebar linkId={id} active={pathname} />

      <div className="flex-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>URL Rotation</CardTitle>
            <div className="flex items-center space-x-3 text-muted-foreground">
              <Link href={shortUrl} className="underline text-primary">{shortUrl}</Link>
              <Copy className="cursor-pointer hover:text-primary" />
              <ExternalLink className="cursor-pointer hover:text-primary" />
              <BarChart2 className="cursor-pointer hover:text-primary" />
              <Trash2 className="cursor-pointer hover:text-destructive" />
            </div>
            <CardDescription>Specify multiple targets and when to rotate them.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-6">

            {/* Rotate Targets */}
            <div className="space-y-2">
              <div>
                <h3 className="text-sm font-semibold">Original Url</h3>
                <Input value={originalUrl} readOnly />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Rotate Targets</h3>
                <Button size="sm" variant="outline" onClick={addTarget}>
                  <Plus className="w-4 h-4 mr-1" /> Add URL
                </Button>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={localTargets.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {localTargets.map(t => (
                    <SortableTargetItem
                      key={t.id}
                      id={t.id}
                      url={t.url}
                      onUrlChange={val => updateTarget(t.id, 'url', val)}
                      onRemove={() => removeTarget(t.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            {/* Time Restriction */}
            <div>
              <h3 className="text-sm font-semibold">Active Time Window</h3>
              <div className="flex space-x-4 mt-2">
                <Input
                  type="datetime-local"
                  value={formatForInput(rotationStart)}
                  onChange={e => setRotationStart(e.currentTarget.value)}
                  className="flex-1"
                />
                <Input
                  type="datetime-local"
                  value={formatForInput(rotationEnd)}
                  onChange={e => setRotationEnd(e.currentTarget.value)}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank for always active.
              </p>
            </div>

            {/* Click Limit */}
            <div>
              <label className="block text-sm font-medium mb-1">Click Limit</label>
              <Input
                type="number"
                placeholder="Stop after N clicks"
                value={clickLimit ?? ''}
                onChange={e =>
                  setClickLimit(e.currentTarget.value ? parseInt(e.currentTarget.value, 10) : null)
                }
                className="w-48"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Rotation will pause once this many clicks have occurred.
              </p>
            </div>

            {/* Save / Cancel */}
            <div className="flex justify-end space-x-4 pt-4">
              <Button variant="outline" onClick={() => router.back()}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-1" /> Save Rotation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}