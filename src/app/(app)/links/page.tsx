'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { LinkCard } from '@/components/dashboard/link-card';
import type { LinkItem, LinkGroup } from '@/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, PlusCircle, ArrowDownUp, FolderKanban } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function MyLinksPage() {
  const [allLinks, setAllLinks] = useState<LinkItem[]>([]);
  const [linkGroups, setLinkGroups] = useState<LinkGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt_desc'); 
  const [filterGroupId, setFilterGroupId] = useState('all'); 
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const fetchLinksAndGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const [linksResponse, groupsResponse] = await Promise.all([
        fetch('/api/links'),
        fetch('/api/link-groups')
      ]);

      if (linksResponse.ok) {
        const linksData = await linksResponse.json();
        setAllLinks(linksData);
      } else {
        console.error('Failed to fetch links');
        toast({ title: 'Error', description: 'Could not fetch your links.', variant: 'destructive' });
        setAllLinks([]); 
      }

      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json();
        setLinkGroups(groupsData);
      } else {
        console.error('Failed to fetch link groups');
        toast({ title: 'Error', description: 'Could not fetch link groups for filtering.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Network Error', description: 'Could not connect to the server to fetch data.', variant: 'destructive' });
      setAllLinks([]); 
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLinksAndGroups();
  }, [fetchLinksAndGroups]);

  const handleLinkDelete = useCallback(async (linkId: string) => {
    try {
      const response = await fetch(`/api/links/${linkId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast({ title: 'Link Deleted', description: 'The link has been successfully deleted.', variant: 'default' });
        setAllLinks(prevLinks => prevLinks.filter(link => link.id !== linkId));
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Could not delete the link.'}));
        throw new Error(errorData.message);
      }
    } catch (error: any) {
      toast({ title: 'Error Deleting Link', description: error.message, variant: 'destructive' });
    }
  }, [toast]);
  
  const filteredAndSortedLinks = useMemo(() => {
    let linksToProcess = [...allLinks];

    if (!Array.isArray(linksToProcess)) {
        linksToProcess = [];
    }

    linksToProcess = linksToProcess.filter(link => {
        if (!link) return false; 
        const groupMatch = filterGroupId === 'all' || link.groupId === filterGroupId;
        if (!groupMatch) return false;

        const term = searchTerm.toLowerCase();
        if (!term) return true;

        const titleMatch = link.title?.toLowerCase().includes(term) || false;
        const shortUrlMatch = link.shortUrl?.toLowerCase().includes(term) || false;
        const originalUrlMatch = link.originalUrl?.toLowerCase().includes(term) || false;
        const slugMatch = link.slug?.toLowerCase().includes(term) || false;
        const tagsMatch = link.tags?.some(tag => tag.toLowerCase().includes(term)) || false;
        const groupNameMatch = link.groupName?.toLowerCase().includes(term) || false;

        return titleMatch || shortUrlMatch || originalUrlMatch || slugMatch || tagsMatch || groupNameMatch;
    });

    linksToProcess.sort((a, b) => {
      const [key, order] = sortBy.split('_');
      let comparison = 0;
      
      const valA = a[key as keyof LinkItem];
      const valB = b[key as keyof LinkItem];

      if (key === 'createdAt') {
        comparison = new Date(valB as string).getTime() - new Date(valA as string).getTime();
      } else if (key === 'clicks') {
        comparison = (valB as number || 0) - (valA as number || 0);
      } else if (key === 'title') {
        comparison = (valA as string || a.slug || '').localeCompare(valB as string || b.slug || '');
      }
      
      return order === 'desc' ? comparison : -comparison;
    });

    return linksToProcess;
  }, [allLinks, searchTerm, sortBy, filterGroupId]);

  if (isLoading) {
    return (
        <div className="container mx-auto py-2 text-center">
            <p className="text-muted-foreground text-lg">Loading your links...</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-2">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My Links</h1>
          <p className="text-muted-foreground">Manage all your shortened links in one place.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard"> 
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Link
          </Link>
        </Button>
      </div>

      <div className="mb-6 p-4 border rounded-lg bg-card shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2 lg:col-span-1">
            <label htmlFor="search-links" className="block text-sm font-medium text-muted-foreground mb-1">
              <Search className="inline h-4 w-4 mr-1" />
              Search Links
            </label>
            <Input
              id="search-links"
              type="text"
              placeholder="Search by title, URL, slug, tag, group..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="sort-by" className="block text-sm font-medium text-muted-foreground mb-1">
                <ArrowDownUp className="inline h-4 w-4 mr-1" />
                Sort By
            </label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger id="sort-by" className="w-full">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt_desc">Date Created (Newest)</SelectItem>
                <SelectItem value="createdAt_asc">Date Created (Oldest)</SelectItem>
                <SelectItem value="clicks_desc">Clicks (Most)</SelectItem>
                <SelectItem value="clicks_asc">Clicks (Least)</SelectItem>
                <SelectItem value="title_asc">Title (A-Z)</SelectItem>
                <SelectItem value="title_desc">Title (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
           <div>
            <label htmlFor="filter-group" className="block text-sm font-medium text-muted-foreground mb-1">
                <FolderKanban className="inline h-4 w-4 mr-1" />
                Filter by Group
            </label>
            <Select value={filterGroupId} onValueChange={setFilterGroupId}>
              <SelectTrigger id="filter-group" className="w-full">
                <SelectValue placeholder="Filter by group..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {linkGroups.map(group => (
                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
           </div>
        </div>
      </div>

      {filteredAndSortedLinks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAndSortedLinks.map((link) => (
            <LinkCard key={link.id} link={link} onDelete={() => handleLinkDelete(link.id)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground">
            {allLinks.length === 0 && !searchTerm && filterGroupId === 'all' ? "No Links Created Yet" : "No Links Found"}
          </h3>
          <p className="text-muted-foreground">
            {allLinks.length === 0 && !searchTerm && filterGroupId === 'all'
              ? 'Create your first link from the dashboard or by clicking "Create New Link" above.'
              : `Your search/filter criteria did not match any links. Try a different term or filter.`
            }
          </p>
        </div>
      )}
    </div>
  );
}
