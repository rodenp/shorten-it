
'use client';

import { AnalyticsChart } from '@/components/analytics/analytics-chart';
import type { LinkItem, AnalyticEvent } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BarChart3, CalendarDays, Clock, ExternalLink, Globe, Link2, MapPin, Smartphone, UserSquare } from 'lucide-react';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEffect, useState } from 'react';

interface LinkAnalyticsData {
  chartData: { date: string; clicks: number }[];
  recentEvents: AnalyticEvent[];
  topBrowsers: { name: string; count: number }[];
  topOS: { name: string; count: number }[];
  topDeviceTypes: { name: string; count: number }[];
  topReferrers: { name: string; count: number }[];
  topCountries: { name: string; count: number }[]; 
  periodDays: number;
}

export default function LinkSpecificAnalyticsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [link, setLink] = useState<LinkItem | null | undefined>(undefined);
  const [analyticsData, setAnalyticsData] = useState<LinkAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const linkRes = await fetch(`/api/links/${slug}`);
        if (!linkRes.ok) {
          if (linkRes.status === 404) setLink(null); 
          else throw new Error(`Failed to fetch link: ${linkRes.statusText}`);
          setIsLoading(false);
          return;
        }
        const linkData: LinkItem = await linkRes.json();
        setLink(linkData);

        if (linkData && linkData.id) {
          const analyticsRes = await fetch(`/api/analytics/link/${linkData.id}`);
          if (!analyticsRes.ok) throw new Error(`Failed to fetch analytics: ${analyticsRes.statusText}`);
          const analytics: LinkAnalyticsData = await analyticsRes.json();
          setAnalyticsData(analytics);
        } else if (!linkData) setLink(null);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
        console.error("Error fetching link analytics:", err);
      }
      setIsLoading(false);
    }
    if (slug) fetchData();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p className="text-lg text-muted-foreground">Loading link data...</p>
        <Button variant="outline" size="sm" asChild className="mt-6"><Link href="/analytics"><ArrowLeft className="mr-2 h-4 w-4" />Back to All Analytics</Link></Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p className="text-lg text-destructive">Error: {error}</p>
        <Button variant="outline" size="sm" asChild className="mt-6"><Link href="/analytics"><ArrowLeft className="mr-2 h-4 w-4" />Back to All Analytics</Link></Button>
      </div>
    );
  }
  
  if (link === null) { notFound(); return null; }
  if (!link || !analyticsData) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p className="text-lg text-muted-foreground">Link data or analytics is not available.</p>
        <Button variant="outline" size="sm" asChild className="mt-6"><Link href="/analytics"><ArrowLeft className="mr-2 h-4 w-4" />Back to All Analytics</Link></Button>
      </div>
    );
  }

  return (
     <div className="container mx-auto py-2">
      <Button variant="outline" size="sm" asChild className="mb-6"><Link href="/analytics"><ArrowLeft className="mr-2 h-4 w-4" />Back to All Analytics</Link></Button>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1 flex items-center"><BarChart3 className="mr-3 h-8 w-8 text-primary" />Analytics for: {link.title || link.shortUrl}</h1>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <a href={link.shortUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">{link.shortUrl} <ExternalLink className="ml-1 h-3 w-3" /></a>
            <span>|</span>
            <span className="flex items-center"><Link2 className="mr-1.5 h-4 w-4" />Slug: {link.slug}</span>
            <span>|</span>
            <span className="flex items-center"><Clock className="mr-1.5 h-4 w-4" />Created: {format(new Date(link.createdAt), "MMM d, yyyy")}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <Card><CardHeader className="pb-2"><CardTitle className="text-lg">Total Clicks</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold text-primary">{(link.clickCount || 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">Lifetime clicks for this link.</p></CardContent></Card>
         <Card><CardHeader className="pb-2"><CardTitle className="text-lg">Original URL</CardTitle></CardHeader><CardContent><a href={link.targets[0]?.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all line-clamp-3" title={link.targets[0]?.url}>{link.targets[0]?.url || 'N/A'}</a>{link.targets.length > 1 && !link.abTestConfig && <Badge variant="secondary" className="mt-2">URL Rotation Active</Badge>}</CardContent></Card>
         <Card><CardHeader className="pb-2"><CardTitle className="text-lg">Key Features</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><div className="flex items-center">Custom Domain: &nbsp;{link.customDomain ? <Badge>{link.customDomain}</Badge> : <Badge variant="outline">Default</Badge>}</div><div className="flex items-center">Cloaked: &nbsp;{link.isCloaked ? <Badge variant="default">Yes</Badge> : <Badge variant="outline">No</Badge>}</div><div className="flex items-center">A/B Test: &nbsp;{link.abTestConfig ? <Badge variant="default">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</div></CardContent></Card>
      </div>
      <AnalyticsChart data={analyticsData.chartData} chartType="line" title={`Click Trend (Last ${analyticsData.periodDays > 0 ? analyticsData.periodDays : ''} Days)`} description="Daily click performance for this link."/>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader><CardTitle className="flex items-center"><MapPin className="mr-2 h-5 w-5 text-primary" />Top Locations</CardTitle></CardHeader>
          <CardContent>
            {analyticsData.topCountries && analyticsData.topCountries.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {analyticsData.topCountries.map(item => (<li key={item.name} className="flex justify-between"><span>{item.name || 'Unknown'}</span><span className="font-semibold">{item.count.toLocaleString()}</span></li>))}
              </ul>
            ) : (<p className="text-sm text-muted-foreground">Location data is not yet available.</p>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center"><UserSquare className="mr-2 h-5 w-5 text-primary" />Top Referrers</CardTitle></CardHeader>
          <CardContent>
            {analyticsData.topReferrers && analyticsData.topReferrers.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {analyticsData.topReferrers.map(item => (<li key={item.name} className="flex justify-between"><span className="truncate max-w-[200px]" title={item.name}>{item.name || 'Direct/Unknown'}</span><span className="font-semibold">{item.count.toLocaleString()}</span></li>))}
              </ul>
            ) : (<p className="text-sm text-muted-foreground">No referrer data available.</p>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center"><Smartphone className="mr-2 h-5 w-5 text-primary" />Device Types</CardTitle></CardHeader>
          <CardContent>
            {analyticsData.topDeviceTypes && analyticsData.topDeviceTypes.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {analyticsData.topDeviceTypes.map(item => (<li key={item.name} className="flex justify-between"><span>{item.name ? item.name.charAt(0).toUpperCase() + item.name.slice(1) : 'Unknown'}</span><span className="font-semibold">{item.count.toLocaleString()}</span></li>))}
              </ul>
            ) : (<p className="text-sm text-muted-foreground">No device type data available.</p>)}
          </CardContent>
        </Card>
         <Card>
          <CardHeader><CardTitle className="flex items-center"><Globe className="mr-2 h-5 w-5 text-primary" />Browsers & OS</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <h4 className="font-medium mb-1 text-muted-foreground text-xs">Top Browsers</h4>
                {analyticsData.topBrowsers && analyticsData.topBrowsers.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {analyticsData.topBrowsers.map(item => (<li key={item.name} className="flex justify-between"><span className="truncate max-w-[100px]" title={item.name}>{item.name || 'Unknown'}</span><span className="font-semibold">{item.count.toLocaleString()}</span></li>))}
                  </ul>
                ) : (<p className="text-sm text-muted-foreground">No browser data.</p>)}
              </div>
              <div>
                <h4 className="font-medium mb-1 text-muted-foreground text-xs">Top OS</h4>
                {analyticsData.topOS && analyticsData.topOS.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {analyticsData.topOS.map(item => (<li key={item.name} className="flex justify-between"><span className="truncate max-w-[100px]" title={item.name}>{item.name || 'Unknown'}</span><span className="font-semibold">{item.count.toLocaleString()}</span></li>))}
                  </ul>
                ) : (<p className="text-sm text-muted-foreground">No OS data.</p>)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-8">
        <CardHeader><CardTitle>Recent Clicks</CardTitle><CardDescription>A log of the latest click events for this link.</CardDescription></CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead><CalendarDays className="inline h-4 w-4 mr-1" />Timestamp</TableHead>
                        <TableHead><MapPin className="inline h-4 w-4 mr-1" />Country</TableHead>
                        <TableHead><Smartphone className="inline h-4 w-4 mr-1" />Device</TableHead>
                        <TableHead><Globe className="inline h-4 w-4 mr-1" />Browser</TableHead>
                        <TableHead>OS</TableHead>
                        <TableHead><UserSquare className="inline h-4 w-4 mr-1" />Referrer</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {analyticsData.recentEvents.map((event: AnalyticEvent) => (
                        <TableRow key={event.id}>
                            <TableCell>{format(new Date(event.timestamp), "MMM d, yyyy HH:mm")}</TableCell>
                            <TableCell>{event.country || 'N/A'}</TableCell>
                            <TableCell>{event.deviceType ? event.deviceType.charAt(0).toUpperCase() + event.deviceType.slice(1) : 'N/A'}</TableCell>
                            <TableCell className="truncate max-w-[150px]" title={event.browser || undefined}>{event.browser || 'N/A'}</TableCell>
                            <TableCell className="truncate max-w-[150px]" title={event.os || undefined}>{event.os || 'N/A'}</TableCell>
                            <TableCell className="truncate max-w-[150px]" title={event.referrer || undefined}>{event.referrer || 'Direct'}</TableCell>
                        </TableRow>
                    ))}
                    {analyticsData.recentEvents.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">No recent click data available for this link.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
