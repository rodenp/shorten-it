'use client';

import { useState, useMemo } from 'react';
import { AnalyticsChart } from '@/components/analytics/analytics-chart';
import { mockLinks, getMockAnalyticsForLink } from '@/lib/mock-data';
import type { LinkItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Link2, TrendingUp, MapPin, Smartphone, UserSquare } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AnalyticsPage() {
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(mockLinks.length > 0 ? mockLinks[0].id : null);
  const [timeRange, setTimeRange] = useState<string>('7days'); // '7days', '30days', '90days'

  const selectedLink = useMemo(() => mockLinks.find(link => link.id === selectedLinkId), [selectedLinkId]);
  
  const chartData = useMemo(() => {
    if (!selectedLink) return [];
    const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
    return getMockAnalyticsForLink(selectedLink.id, days);
  }, [selectedLink, timeRange]);

  const totalClicksAllLinks = mockLinks.reduce((sum, link) => sum + link.clickCount, 0);

  const topPerformingLink = mockLinks.sort((a,b) => b.clickCount - a.clickCount)[0];

  const exampleBreakdownData = [
    { category: "Top Referrers", items: [{name: "google.com", value: "40%"}, {name: "twitter.com", value: "25%"}, {name: "direct", value: "15%"}] },
    { category: "Top Countries", items: [{name: "USA", value: "50%"}, {name: "Canada", value: "20%"}, {name: "UK", value: "10%"}] },
    { category: "Device Types", items: [{name: "Desktop", value: "60%"}, {name: "Mobile", value: "35%"}, {name: "Tablet", value: "5%"}] },
  ];

  return (
    <div className="container mx-auto py-2">
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8">Link Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockLinks.length}</div>
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
                {topPerformingLink?.title || topPerformingLink?.shortUrl || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
                {topPerformingLink ? `${topPerformingLink.clickCount.toLocaleString()} clicks` : 'No links available'}
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
              <Select value={selectedLinkId || undefined} onValueChange={(value) => setSelectedLinkId(value as string)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Select a link" />
                </SelectTrigger>
                <SelectContent>
                  {mockLinks.map(link => (
                    <SelectItem key={link.id} value={link.id}>
                      {link.title || link.shortUrl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={timeRange} onValueChange={setTimeRange}>
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
          {selectedLink ? (
            <AnalyticsChart 
              data={chartData} 
              chartType="line"
              title={`Clicks for: ${selectedLink.title || selectedLink.shortUrl}`}
              description={`Showing clicks for the last ${timeRange.replace('days', '')} days.`}
            />
          ) : (
            <p className="text-muted-foreground text-center py-10">Please select a link to view its analytics.</p>
          )}
        </CardContent>
      </Card>
      
      {selectedLink && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {exampleBreakdownData.map(data => (
            <Card key={data.category}>
              <CardHeader>
                <CardTitle className="text-md flex items-center">
                  {data.category === "Top Referrers" && <UserSquare className="mr-2 h-5 w-5 text-primary" />}
                  {data.category === "Top Countries" && <MapPin className="mr-2 h-5 w-5 text-primary" />}
                  {data.category === "Device Types" && <Smartphone className="mr-2 h-5 w-5 text-primary" />}
                  {data.category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.items.map(item => (
                    <li key={item.name} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="font-medium">{item.value}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8">
        <CardHeader>
            <CardTitle>All Links Overview</CardTitle>
            <CardDescription>A quick summary of all your links and their total clicks.</CardDescription>
        </CardHeader>
        <CardContent>
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
                    {mockLinks.slice(0,5).map(link => ( // Show top 5 for brevity
                        <TableRow key={link.id}>
                            <TableCell>
                                <div className="font-medium">{link.title || link.shortUrl}</div>
                                {link.title && <div className="text-xs text-muted-foreground">{link.shortUrl}</div>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell truncate max-w-xs" title={link.targets[0]?.url}>{link.targets[0]?.url}</TableCell>
                            <TableCell className="text-right">{link.clickCount.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/analytics/${link.slug || link.id}`}>View Details</Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
             {mockLinks.length > 5 && (
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
