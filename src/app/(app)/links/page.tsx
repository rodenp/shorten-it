// src/app/(app)/links/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Plus, RefreshCw, Copy, ExternalLink, BarChart2,
  Trash2, Pencil, Tag, Filter,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CreateLinkBar } from '@/components/dashboard/create-linker-bar';
import { useLinkParams } from '@/context/LinkParamsContext';

interface LinkItem {
  id: string;
  createdAt: string;
  shortUrl: string;
  originalUrl: string;
  title?: string;
  clickCount: number;
  conversionCount: number;
  tags: string[];
  domainId: string;
  folderId?: string;
  rotationStart?: string;
  rotationEnd?: string;
  clickLimit?: number;
}

interface Folder {
  id: string;
  name: string;
}

interface DomainOption {
  id: string;
  name: string;
  type: 'custom' | 'sub';
}

export default function LinksPage() {
  const { toast } = useToast();

  // Domains dropdown
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('');

  // Folder tabs
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  // Links table
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [allLinks, setAllLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New folder modal
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Context for selected domain host
  const { domain, setDomain } = useLinkParams();

  // Fetch custom + sub domains
  const fetchDomains = useCallback(async () => {
    try {
      const res = await fetch('/api/domains?types=local,custom');
      if (!res.ok) throw new Error('Could not fetch domains');
      const list = await res.json() as { id: string; domainName: string; type: 'local' | 'custom' }[];

      const opts = list.map(d => ({ id: d.id, name: d.domainName, type: d.type }));
      setDomains(opts);
      if (opts.length) {
        const first = opts[0];
        setSelectedDomain(first.id);
        const host = first.name.replace(/^https?:\/\//, '');
        setDomain(host);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }, [toast, setDomain]);

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch('/api/folders');
      if (!res.ok) throw new Error('Could not fetch folders');
      setFolders(await res.json());
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }, [toast]);

  // Fetch links by domain & folder
  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDomain) params.set('domainId', selectedDomain);
      if (activeFolder) params.set('folderId', activeFolder);
      const res = await fetch(`/api/links?${params.toString()}`);
      if (!res.ok) throw new Error('Could not fetch links');
      setAllLinks(await res.json());
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [selectedDomain, activeFolder, toast]);

  // Filter links by selected domain
  useEffect(() => {
    if (!selectedDomain) {
      setLinks(allLinks);
      return;
    }
    setLinks(allLinks.filter(link => link.domainId === selectedDomain));
  }, [allLinks, selectedDomain]);

  // Delete link
  const handleLinkDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/links/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).message);
      toast({ title: 'Deleted', description: 'Link removed.', variant: 'default' });
      setLinks(l => l.filter(link => link.id !== id));
    } catch (err: any) {
      toast({ title: 'Error Deleting Link', description: err.message, variant: 'destructive' });
    }
  }, [toast]);

  // Create new folder
  const createFolder = async () => {
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      if (!res.ok) throw new Error('Could not create folder');
      const f = await res.json() as Folder;
      setFolders(fs => [...fs, f]);
      setActiveFolder(f.id);
      setNewFolderName('');
      setShowNewFolder(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Handle domain selection change
  function handleDomainChange(val: string) {
    console.log('LinksPage:handleDomainChange — selected id:', val);
    setSelectedDomain(val);

    const match = domains.find(d => d.id === val);
    const newDomain = match ? match.name.replace(/^https?:\/\//, '') : undefined;
    console.log('LinksPage:handleDomainChange — computed domain:', newDomain);
    setDomain(newDomain);
  }

  // Initial load
  useEffect(() => {
    fetchDomains();
    fetchFolders();
  }, [fetchDomains, fetchFolders]);

  // Sync context domain whenever selectedDomain or domains list changes
  useEffect(() => {
    if (selectedDomain) {
      const match = domains.find(d => d.id === selectedDomain);
      const host = match ? match.name.replace(/^https?:\/\//, '') : undefined;
      setDomain(host);
      console.log('LinksPage: context.domain set to', host);
    }
  }, [selectedDomain, domains, setDomain]);

  // Reload links when domain or folder changes
  useEffect(() => {
    if (selectedDomain) fetchLinks();
  }, [selectedDomain, activeFolder, fetchLinks]);

  return (
    <div className="p-6 space-y-6">
      {/* Domain selector + refresh */}
      <div className="flex items-center space-x-0">
        <Select
          value={selectedDomain}
          onValueChange={handleDomainChange}
        >
          <SelectTrigger className="inline-flex w-auto h-10 items-center text-sm border border-muted rounded-l-lg px-3">
            <SelectValue placeholder="Select domain…" />
          </SelectTrigger>
          <SelectContent className="w-auto min-w-[8rem]">
            {domains.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button onClick={fetchLinks} className="h-10 w-10 flex items-center justify-center border border-l-0 border-muted rounded-r-lg hover:bg-muted/50">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Folder tabs */}
      <div className="flex border-b">
        <button
          className={`px-4 py-2 -mb-px ${activeFolder === null ? 'border-b-2 border-primary font-semibold' : ''}`}
          onClick={() => setActiveFolder(null)}
        >
          All links
        </button>
        {folders.map(f => (
          <button
            key={f.id}
            className={`px-4 py-2 -mb-px ${activeFolder === f.id ? 'border-b-2 border-primary font-semibold' : ''}`}
            onClick={() => setActiveFolder(f.id)}
          >
            📁 {f.name}
          </button>
        ))}
        <button
          className="ml-auto px-4 py-2 text-primary"
          onClick={() => setShowNewFolder(true)}
        >
          + New Folder
        </button>
      </div>

      {/* Links table */}
      <Card className="border rounded-lg overflow-x-auto">
        <CardHeader className="pb-0"><CardTitle>Links</CardTitle></CardHeader>
        <CardContent className="pt-2 px-0">

          {/* Header actions */}
          <div className="flex justify-between px-4 mb-4">
            <CreateLinkBar domainId={selectedDomain} />
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-2"><Filter size={18} /></button>
              </TooltipTrigger>
              <TooltipContent>Filter</TooltipContent>
            </Tooltip>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox /></TableHead>
                  <TableHead className="w-[120px]">By</TableHead>
                  <TableHead className="w-[200px]">Short link</TableHead>
                  <TableHead>Original link</TableHead>
                  <TableHead className="text-center w-[80px]">Clicks</TableHead>
                  <TableHead className="text-center w-[100px]">Conversions</TableHead>
                  <TableHead className="w-[150px]">Tags</TableHead>
                  <TableHead className="text-center w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">Loading…</TableCell>
                  </TableRow>
                ) : links.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">No links in this domain/folder.</TableCell>
                  </TableRow>
                ) : (
                  links.map(link => {
                    const main = link.tags[0] || '';
                    const extra = link.tags.length > 1 ? link.tags.length - 1 : 0;
                    return (
                      <TableRow key={link.id} className="hover:bg-muted">
                        <TableCell><Checkbox /></TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Avatar><AvatarFallback>U</AvatarFallback></Avatar>
                            <span className="text-sm text-muted-foreground">{new Date(link.createdAt).toLocaleDateString()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <ExternalLink className="h-4 w-4 text-primary" />
                            <Link href={link.shortUrl} className="underline text-primary truncate max-w-[150px]">
                              {link.shortUrl}
                            </Link>
                            <Copy className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary" onClick={() => navigator.clipboard.writeText(link.shortUrl)} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <Link href={link.originalUrl} className="underline hover:text-primary truncate">{link.title || link.originalUrl}</Link>
                            <span className="text-sm text-muted-foreground truncate">{link.originalUrl}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{link.clickCount}</TableCell>
                        <TableCell className="text-center">{link.conversionCount}</TableCell>
                        <TableCell>
                          {main ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <div className="inline-flex items-center space-x-1 px-2 py-1 border rounded-full cursor-pointer">
                                  <Tag className="h-4 w-4 text-muted-foreground" />
                                  <span className="truncate flex-1">{main}</span>
                                  {extra > 0 && <span className="text-sm font-medium">+{extra}</span>}
                                </div>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>All Tags</DialogTitle></DialogHeader>
                                <div className="mt-4 flex flex-wrap gap-2">{link.tags.map(t => <Badge key={t} variant="outline">{t}</Badge>)}</div>
                                <DialogFooter><Button variant="outline">Close</Button></DialogFooter>
                              </DialogContent>
                            </Dialog>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="flex justify-center space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/links/${link.id}/basic`}><Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" /></Link>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/analytics/${link.id}`}><BarChart2 className="h-4 w-4 text-muted-foreground hover:text-primary" /></Link>
                            </TooltipTrigger>
                            <TooltipContent>Analytics</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger onClick={() => handleLinkDelete(link.id)}><Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive cursor-pointer" /></TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination stub */}
          <div className="flex justify-end px-4 py-4">
            <Button variant="ghost" size="sm">← Prev</Button>
            <span className="px-4 text-sm text-muted-foreground">{links.length > 0 ? `1–${links.length} of ${links.length}` : 'No links'}</span>
            <Button variant="ghost" size="sm">Next →</Button>
          </div>
        </CardContent>
      </Card>

      {/* New Folder Modal */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent>
          <DialogHeader><DialogTitle>Folder creation</DialogTitle></DialogHeader>
          <Input placeholder="Folder name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} />
          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={() => setShowNewFolder(false)}>Cancel</Button>
            <Button onClick={createFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
