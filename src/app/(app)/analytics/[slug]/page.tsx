
'use client';

import { AnalyticsChart } from '@/components/analytics/analytics-chart';
import { getMockLinkBySlugOrId, getAnalyticsForLink, getMockAnalyticsChartDataForLink } from '@/lib/mock-data';
import type { LinkItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BarChart3, CalendarDays, Clock, ExternalLink, Globe, Link2, MapPin, Smartphone, UserSquare } from 'lucide-react';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEffect, useState } from 'react';

export default function LinkSpecificAnalyticsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [link, setLink] = useState<LinkItem | undefined>(undefined);
  const [chartData, setChartData] = useState<{ date: string; clicks: number }[]>([]);
  const [linkSpecificEvents, setLinkSpecificEvents] = useState<any[]>([]); // Using any for mock simplicity
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const currentLink = getMockLinkBySlugOrId(slug);
    
    if (currentLink) {
      setLink(currentLink);
      setChartData(getMockAnalyticsChartDataForLink(currentLink.id, 30));
      const events = getAnalyticsForLink(currentLink.id).slice(0, 5);
      setLinkSpecificEvents(events);
    } else {
      // If link is not found after attempting to fetch, set it to null to trigger notFound()
      setLink(null); 
    }
    setIsLoading(false);
  }, [slug]);


  if (isLoading) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p className="text-lg text-muted-foreground">Loading link data...</p>
         <Button variant="outline" size="sm" asChild className="mt-6">
          <Link href="/analytics">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Analytics
          </Link>
        </Button>
      </div>
    );
  }

  if (link === null) { // Explicitly check for null after loading attempt
    notFound();
  }
  
  // This check is to satisfy TypeScript, as `link` could be undefined if notFound() wasn't called yet.
  // However, the logic above ensures `link` is either an object or notFound() is called.
  if (!link) {
    // This case should ideally not be reached if isLoading and link === null checks are correct.
    // It acts as a fallback.
    return (
         <div className="container mx-auto py-10 text-center">
            <p className="text-lg text-muted-foreground">Link not found.</p>
             <Button variant="outline" size="sm" asChild className="mt-6">
              <Link href="/analytics">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to All Analytics
              </Link>
            </Button>
        </div>
    );
  }


  return (
     <div className="container mx-auto py-2">
      <Button variant="outline" size="sm" asChild className="mb-6">
        <Link href="/analytics">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to All Analytics
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1 flex items-center">
            <BarChart3 className="mr-3 h-8 w-8 text-primary" />
            Analytics for: {link.title || link.shortUrl}
        </h1>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <a href={link.shortUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">
                {link.shortUrl} <ExternalLink className="ml-1 h-3 w-3" />
            </a>
            <span>|</span>
            <span className="flex items-center"><Link2 className="mr-1.5 h-4 w-4" />Slug: {link.slug}</span>
            <span>|</span>
            <span className="flex items-center"><Clock className="mr-1.5 h-4 w-4" />Created: {format(new Date(link.createdAt), "MMM d, yyyy")}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Clicks</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-4xl font-bold text-primary">{(link.clickCount || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Lifetime clicks for this link.</p>
            </CardContent>
         </Card>
         <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Original URL</CardTitle>
            </CardHeader>
            <CardContent>
                <a 
                    href={link.targets[0]?.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm text-primary hover:underline break-all line-clamp-3"
                    title={link.targets[0]?.url}
                >
                    {link.targets[0]?.url || 'N/A'}
                </a>
                {link.targets.length > 1 && <Badge variant="secondary" className="mt-2">URL Rotation Active</Badge>}
            </CardContent>
         </Card>
         <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Key Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
                <div className="flex items-center">Custom Domain: &nbsp;{link.customDomain ? <Badge>{link.customDomain}</Badge> : <Badge variant="outline">Default</Badge>}</div>
                <div className="flex items-center">Cloaked: &nbsp;{link.isCloaked ? <Badge variant="default">Yes</Badge> : <Badge variant="outline">No</Badge>}</div>
                <div className="flex items-center">A/B Test: &nbsp;{link.abTestConfig ? <Badge variant="default">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</div>
            </CardContent>
         </Card>
      </div>

      <AnalyticsChart 
        data={chartData} 
        chartType="line"
        title="Click Trend (Last 30 Days)"
        description="Daily click performance for this link."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><MapPin className="mr-2 h-5 w-5 text-primary" />Top Locations</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Placeholder content */}
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between"><span>United States</span> <span className="font-medium">65%</span></li>
              <li className="flex justify-between"><span>Canada</span> <span className="font-medium">15%</span></li>
              <li className="flex justify-between"><span>United Kingdom</span> <span className="font-medium">10%</span></li>
              <li className="flex justify-between"><span>Germany</span> <span className="font-medium">5%</span></li>
              <li className="flex justify-between"><span>Other</span> <span className="font-medium">5%</span></li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><UserSquare className="mr-2 h-5 w-5 text-primary" />Top Referrers</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Placeholder content */}
             <ul className="space-y-1 text-sm">
              <li className="flex justify-between"><span>google.com</span> <span className="font-medium">40%</span></li>
              <li className="flex justify-between"><span>twitter.com</span> <span className="font-medium">25%</span></li>
              <li className="flex justify-between"><span>linkedin.com</span> <span className="font-medium">20%</span></li>
              <li className="flex justify-between"><span>direct</span> <span className="font-medium">10%</span></li>
              <li className="flex justify-between"><span>Other</span> <span className="font-medium">5%</span></li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Smartphone className="mr-2 h-5 w-5 text-primary" />Device Types</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Placeholder content */}
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between"><span>Desktop</span> <span className="font-medium">60%</span></li>
              <li className="flex justify-between"><span>Mobile</span> <span className="font-medium">35%</span></li>
              <li className="flex justify-between"><span>Tablet</span> <span className="font-medium">5%</span></li>
            </ul>
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Globe className="mr-2 h-5 w-5 text-primary" />Browsers & OS</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Placeholder content */}
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between"><span>Chrome (Windows)</span> <span className="font-medium">50%</span></li>
              <li className="flex justify-between"><span>Safari (iOS)</span> <span className="font-medium">25%</span></li>
              <li className="flex justify-between"><span>Firefox (MacOS)</span> <span className="font-medium">15%</span></li>
              <li className="flex justify-between"><span>Other</span> <span className="font-medium">10%</span></li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
            <CardTitle>Recent Clicks</CardTitle>
            <CardDescription>A log of the latest click events for this link (example data).</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead><CalendarDays className="inline h-4 w-4 mr-1" />Timestamp</TableHead>
                        <TableHead><MapPin className="inline h-4 w-4 mr-1" />Country</TableHead>
                        <TableHead><Smartphone className="inline h-4 w-4 mr-1" />Device</TableHead>
                        <TableHead><UserSquare className="inline h-4 w-4 mr-1" />Referrer</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {linkSpecificEvents.map(event => (
                        <TableRow key={event.id}>
                            <TableCell>{format(new Date(event.timestamp), "MMM d, yyyy HH:mm")}</TableCell>
                            <TableCell>{event.country || 'N/A'}</TableCell>
                            <TableCell>{event.deviceType ? event.deviceType.charAt(0).toUpperCase() + event.deviceType.slice(1) : 'N/A'} ({event.browser || 'N/A'})</TableCell>
                            <TableCell className="truncate max-w-xs" title={event.referrer || undefined}>{event.referrer || 'Direct'}</TableCell>
                        </TableRow>
                    ))}
                     {linkSpecificEvents.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">No recent click data available for this link.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

    </div>
  );
}
