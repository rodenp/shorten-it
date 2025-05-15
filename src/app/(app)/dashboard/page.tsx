'use client';

import { useState, useEffect, useCallback } from 'react';
import { UrlInputForm } from '@/components/dashboard/url-input-form';
import { LinkCard } from '@/components/dashboard/link-card';
// Removed: import { getMockLinks, getLinksCount, getTotalClicks } from '@/lib/mock-data';
import type { LinkItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Link2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"; // Added for error handling

interface AnalyticsSummary {
  totalLinks: number;
  totalClicks: number;
  // Potentially other summary data like periodDays, avg CTR if API provides it
}

export default function DashboardPage() {
  const [recentLinks, setRecentLinks] = useState<LinkItem[]>([]);
  const [totalLinksCount, setTotalLinksCount] = useState(0);
  const [totalAllClicks, setTotalAllClicks] = useState(0);
  const { toast } = useToast();

  const refreshDashboardData = useCallback(async () => {
    try {
      const [linksResponse, summaryResponse] = await Promise.all([
        fetch('/api/links'), // This fetches all links, sorted by createdAt desc by default in linkService
        fetch('/api/analytics/summary?days=all') // Add a way to get all-time summary if supported
      ]);

      if (linksResponse.ok) {
        const allLinks: LinkItem[] = await linksResponse.json();
        setRecentLinks(allLinks.slice(0, 3)); // Get top 3 recent
        // totalLinksCount will come from summary or could be allLinks.length if summary doesn't provide it
      } else {
        console.error('Failed to fetch links');
        toast({ title: "Error", description: "Could not fetch recent links.", variant: "destructive" });
      }

      if (summaryResponse.ok) {
        const summaryData: AnalyticsSummary = await summaryResponse.json();
        // Assuming summaryData includes totalLinks and totalClicks
        // The analyticsService.getOverallAnalyticsSummary currently provides totalClicks
        // We might need to adjust the summary endpoint or fetch link count separately if not included
        setTotalAllClicks(summaryData.totalClicks || 0);
        // If summaryData doesn't have totalLinks, we might use linksResponse data:
        // setTotalLinksCount(allLinks.length); // If allLinks was fetched successfully
        // For now, let's assume the summary endpoint can provide totalLinks or we adjust it later.
        // As a placeholder, if summary doesn't have totalLinks:
        const linksCountResponse = await fetch('/api/links?countOnly=true'); // Hypothetical endpoint or param
        if(linksCountResponse.ok) {
            const countData = await linksCountResponse.json();
            setTotalLinksCount(countData.count || 0);
        } else {
             const allLinks = await (await fetch('/api/links')).json(); // Re-fetch if necessary
             setTotalLinksCount(allLinks.length);
        }

      } else {
        console.error('Failed to fetch analytics summary');
        toast({ title: "Error", description: "Could not fetch analytics summary.", variant: "destructive" });
        // Fallback if summary fails, try to get total links from links endpoint
        const allLinks = await (await fetch('/api/links')).json();
        setTotalLinksCount(allLinks.length);
      }

    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
      toast({ title: "Error", description: "Could not refresh dashboard data.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    refreshDashboardData();
  }, [refreshDashboardData]);

  return (
    <div className="container mx-auto py-2">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Manage your links and view performance.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UrlInputForm onLinkAdded={refreshDashboardData} />
        </div>

        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-xl">
                        <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                        Quick Stats
                    </CardTitle>
                    <CardDescription>Overview of your link performance.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Links</span>
                        <span className="font-semibold text-lg">{totalLinksCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Clicks</span>
                        <span className="font-semibold text-lg">
                            {totalAllClicks.toLocaleString()}
                        </span>
                    </div>
                     {/* <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Avg. CTR (Example)</span>
                        <span className="font-semibold text-lg">2.5%</span>
                    </div> */}
                </CardContent>
            </Card>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-4 flex items-center">
            <Link2 className="mr-2 h-6 w-6 text-primary" />
            Recent Links
        </h2>
        {recentLinks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentLinks.map((link) => (
              <LinkCard key={link.id} link={link} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">You haven't created any links yet. Use the form above to get started!</p>
        )}
      </div>
    </div>
  );
}
