'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { LinkCard } from '@/components/dashboard/link-card';
import { getMockLinks, deleteMockLink, getMockLinkGroups } from '@/lib/mock-data';
import type { LinkItem, LinkGroup } from '@/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ListFilter, Search, PlusCircle, ArrowDownUp, FolderKanban } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function MyLinksPage() {
  const [allLinks, setAllLinks] = useState<LinkItem[]>([]);
  const [linkGroups, setLinkGroups] = useState<LinkGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt_desc'); // e.g., 'clicks_desc', 'title_asc'
  const [filterGroupId, setFilterGroupId] = useState('all'); // 'all' or group.id
  const { toast } = useToast();

  const fetchLinksAndGroups = useCallback(() => {
    setAllLinks(getMockLinks());
    setLinkGroups(getMockLinkGroups());
  }, []);

  useEffect(() => {
    fetchLinksAndGroups();
  }, [fetchLinksAndGroups]);

  const handleLinkDelete = useCallback((linkId: string) => {
    if (deleteMockLink(linkId)) {
      toast({ title: 'Link Deleted', description: 'The link has been successfully deleted.', variant: 'default' });
      fetchLinksAndGroups(); // Refresh the list
    } else {
      toast({ title: 'Error Deleting Link', description: 'Could not delete the link.', variant: 'destructive' });
    }
  }, [fetchLinksAndGroups, toast]);
  
  const filteredAndSortedLinks = useMemo(() => {
    return [...allLinks] 
      .filter(link => 
        (filterGroupId === 'all' || link.groupId === filterGroupId) &&
        (
          link.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          link.shortUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
          link.originalUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
          link.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
          link.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      )
      .sort((a, b) => {
        const [key, order] = sortBy.split('_');
        let comparison = 0;
        
        if (key === 'createdAt') {
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (key === 'clicks') {
          comparison = (b.clickCount || 0) - (a.clickCount || 0);
        } else if (key === 'title') {
          comparison = (a.title || a.slug || '').localeCompare(b.title || b.slug || '');
        }
        
        return order === 'desc' ? comparison : -comparison;
      });
  }, [allLinks, searchTerm, sortBy, filterGroupId]);

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
              placeholder="Search by title, URL, slug, or tag..."
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
           {/* Placeholder for more advanced filters */}
           {/* <div>
             <Button variant="outline" className="w-full mt-auto" onClick={() => alert('More filter functionality not yet implemented.')}>
                <ListFilter className="mr-2 h-4 w-4" /> More Filters
             </Button>
           </div> */}
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
            {allLinks.length === 0 ? "No Links Created Yet" : "No Links Found"}
          </h3>
          <p className="text-muted-foreground">
            {allLinks.length === 0 
              ? "Create your first link from the dashboard." 
              : `Your search/filter criteria did not match any links. Try a different term or filter.`
            }
          </p>
        </div>
      )}
    </div>
  );
}
