'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { AnalyticsChart } from '@/components/analytics/analytics-chart';
import type { LinkItem, AnalyticsSummary } from '@/types'; // Assuming AnalyticsSummary type is defined in @/types
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Link2, TrendingUp, MapPin, Smartphone, UserSquare } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Define a type for the detailed analytics data for a specific link (including chart data)
interface LinkSpecificAnalytics {
  chartData: { date: string; clicks: number }[];
  // Add other breakdown data fields if your API provides them for a specific link
  topReferrers?: { name: string; value: string | number }[];
  topCountries?: { name: string; value: string | number }[];
  deviceTypes?: { name: string; value: string | number }[];
}

export default function AnalyticsPage() {
  const [summaryData, setSummaryData] = useState<AnalyticsSummary | null>(null);
  const [allLinks, setAllLinks] = useState<LinkItem[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [selectedLinkAnalytics, setSelectedLinkAnalytics] = useState<LinkSpecificAnalytics | null>(null);
  const [timeRange, setTimeRange] = useState<string>('30days');
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [isLoadingSelectedLinkAnalytics, setIsLoadingSelectedLinkAnalytics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch summary analytics data and all links
  useEffect(() => {
    async function fetchInitialData() {
      setIsLoadingSummary(true);
      setIsLoadingLinks(true);
      setError(null);
      try {
        // Fetch summary data
        const summaryRes = await fetch('/api/analytics/summary');
        if (!summaryRes.ok) throw new Error(`Failed to fetch summary: ${summaryRes.statusText}`);
        const summary: AnalyticsSummary = await summaryRes.json();
        setSummaryData(summary);

        // Fetch all links (if not included in summary or if you need more details)
        const linksRes = await fetch('/api/links');
        if (!linksRes.ok) throw new Error(`Failed to fetch links: ${linksRes.statusText}`);
        const links: LinkItem[] = await linksRes.json();
        setAllLinks(links);

        if (links.length > 0 && !selectedLinkId) {
          setSelectedLinkId(links[0].id);
        }
      } catch (err: any) {
        console.error("Error fetching initial analytics data:", err);
        setError(err.message || 'Failed to load initial analytics data');
      }
      setIsLoadingSummary(false);
      setIsLoadingLinks(false);
    }
    fetchInitialData();
  }, []); // Removed selectedLinkId from dependency array to prevent re-triggering on initial selection

  // Fetch analytics for the selected link when selectedLinkId or timeRange changes
  useEffect(() => {
    async function fetchSelectedLinkData() {
      if (!selectedLinkId) {
        setSelectedLinkAnalytics(null);
        return;
      }
      setIsLoadingSelectedLinkAnalytics(true);
      setError(null);
      try {
        const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
        // Assuming endpoint /api/analytics/link/{id}?days={days} or similar
        // This might be the same endpoint as used in [slug]/page.tsx, adjust as needed
        const res = await fetch(`/api/analytics/link/${selectedLinkId}?days=${days}`); 
        if (!res.ok) throw new Error(`Failed to fetch analytics for link ${selectedLinkId}: ${res.statusText}`);
        const data: LinkSpecificAnalytics = await res.json();
        setSelectedLinkAnalytics(data);
      } catch (err: any) {
        console.error("Error fetching selected link analytics:", err);
        setError(err.message || 'Failed to load analytics for the selected link');
        setSelectedLinkAnalytics(null); // Clear data on error
      }
      setIsLoadingSelectedLinkAnalytics(false);
    }

    if (selectedLinkId) {
      fetchSelectedLinkData();
    }
  }, [selectedLinkId, timeRange]);

  const selectedLink = useMemo(() => allLinks.find(link => link.id === selectedLinkId), [allLinks, selectedLinkId]);
  
  // Chart data is now part of selectedLinkAnalytics
  const chartData = selectedLinkAnalytics?.chartData || [];

  const totalClicksAllLinks = summaryData?.totalClicks || 0;
  const totalLinksCountSystem = summaryData?.totalLinks || 0;
  const topPerformingLink = summaryData?.topPerformingLink; // Assuming this structure from AnalyticsSummary type

  // Example for dynamic breakdown data (assuming API provides it)
  const breakdownData = useMemo(() => {
    if (!selectedLinkAnalytics) return [];
    const data = [];
    if (selectedLinkAnalytics.topReferrers) {
      data.push({ category: "Top Referrers", icon: UserSquare, items: selectedLinkAnalytics.topReferrers });
    }
    if (selectedLinkAnalytics.topCountries) {
      data.push({ category: "Top Countries", icon: MapPin, items: selectedLinkAnalytics.topCountries });
    }
    if (selectedLinkAnalytics.deviceTypes) {
      data.push({ category: "Device Types", icon: Smartphone, items: selectedLinkAnalytics.deviceTypes });
    }
    return data;
  }, [selectedLinkAnalytics]);

  if (isLoadingSummary || isLoadingLinks) {
    return <div className="container mx-auto py-10 text-center">Loading analytics dashboard...</div>;
  }

  if (error && !summaryData && allLinks.length === 0) { // Show full page error if initial load fails badly
    return <div className="container mx-auto py-10 text-center text-destructive">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto py-2">
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8">Link Analytics</h1>
      
      {/* Display error prominently if it occurs after initial load but before showing content */}
      {error && <Card className="mb-4 bg-destructive/10 border-destructive"><CardContent><p className="text-destructive p-4">{error}</p></CardContent></Card>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLinksCountSystem}</div>
            <p className="text-xs text-muted-foreground">Across all your campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks (All Links)</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicksAllLinks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Lifetime clicks for all links</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performing Link</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate" title={topPerformingLink?.title || topPerformingLink?.shortUrl}>
                {topPerformingLink?.title || topPerformingLink?.shortUrl || (isLoadingSummary ? 'Loading...' :'N/A')}
            </div>
            <p className="text-xs text-muted-foreground">
                {topPerformingLink ? `${(topPerformingLink.clickCount || 0).toLocaleString()} clicks` : (isLoadingSummary ? '...': 'No links available')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-xl">Detailed Link Performance</CardTitle>
              <CardDescription>Select a link and time range to view detailed analytics.</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={selectedLinkId || undefined} onValueChange={(value) => setSelectedLinkId(value as string)} disabled={allLinks.length === 0 || isLoadingLinks}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder={isLoadingLinks ? "Loading links..." : "Select a link"} />
                </SelectTrigger>
                <SelectContent>
                  {allLinks.map(link => (
                    <SelectItem key={link.id} value={link.id}>
                      {link.title || link.shortUrl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={timeRange} onValueChange={setTimeRange} disabled={!selectedLink || isLoadingSelectedLinkAnalytics}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingSelectedLinkAnalytics ? (
            <p className="text-muted-foreground text-center py-10">Loading chart data...</p>
          ) : selectedLink && chartData.length > 0 ? (
            <AnalyticsChart 
              data={chartData} 
              chartType="line"
              title={`Clicks for: ${selectedLink.title || selectedLink.shortUrl}`}
              description={`Showing clicks for the selected period.`}
            />
          ) : selectedLink && chartData.length === 0 && !isLoadingSelectedLinkAnalytics ? (
             <p className="text-muted-foreground text-center py-10">No click data available for the selected period.</p>
          ) : allLinks.length > 0 ? (
            <p className="text-muted-foreground text-center py-10">Please select a link to view its analytics.</p>
          ) : (
            <p className="text-muted-foreground text-center py-10">No links available to analyze. Create some links first!</p>
          )}
        </CardContent>
      </Card>
      
      {selectedLink && breakdownData.length > 0 && !isLoadingSelectedLinkAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {breakdownData.map(data => (
            <Card key={data.category}>
              <CardHeader>
                <CardTitle className="text-md flex items-center">
                  <data.icon className="mr-2 h-5 w-5 text-primary" />
                  {data.category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.items.map((item: any) => ( // Consider a more specific type for item
                    <li key={item.name} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="font-medium">{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}</span>
                    </li>
                  ))}
                   {data.items.length === 0 && <li className="text-sm text-muted-foreground">No data available.</li>}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {selectedLink && breakdownData.length === 0 && !isLoadingSelectedLinkAnalytics && (
         <p className="text-muted-foreground text-center py-6">No additional breakdown data available for this link.</p>
      )}

      <Card className="mt-8">
        <CardHeader>
            <CardTitle>All Links Overview</CardTitle>
            <CardDescription>A quick summary of all your links and their total clicks.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoadingLinks ? (
                <p className="text-muted-foreground text-center py-10">Loading links...</p>
            ) : (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Link Title / Short URL</TableHead>
                        <TableHead className="hidden md:table-cell">Original URL</TableHead>
                        <TableHead className="text-right">Clicks</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {allLinks.slice(0, Math.min(5, allLinks.length)).map(link => ( 
                        <TableRow key={link.id}>
                            <TableCell>
                                <div className="font-medium">{link.title || link.shortUrl}</div>
                                {link.title && <div className="text-xs text-muted-foreground">{link.shortUrl}</div>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell truncate max-w-xs" title={link.targets[0]?.url}>{link.targets[0]?.url}</TableCell>
                            <TableCell className="text-right">{(link.clickCount || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/analytics/${link.slug || link.id}`}>View Details</Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {allLinks.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                                No links created yet.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            )}
             {allLinks.length > 5 && (
                <div className="mt-4 text-center">
                    <Button variant="link" asChild>
                        <Link href="/links">View All Links</Link>
                    </Button>
                </div>
             )}
        </CardContent>
      </Card>

    </div>
  );
}
