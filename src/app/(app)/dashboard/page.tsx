'use client';

import { useState, useEffect, useCallback } from 'react';
import { UrlInputForm } from '@/components/dashboard/url-input-form';
import { LinkCard } from '@/components/dashboard/link-card';
import { getMockLinks, getLinksCount, getTotalClicks } from '@/lib/mock-data';
import type { LinkItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Link2 } from 'lucide-react';

export default function DashboardPage() {
  const [recentLinks, setRecentLinks] = useState<LinkItem[]>([]);
  const [totalLinksCount, setTotalLinksCount] = useState(0);
  const [totalAllClicks, setTotalAllClicks] = useState(0);

  const refreshDashboardData = useCallback(() => {
    const allLinks = getMockLinks();
    const sortedRecentLinks = [...allLinks]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
    setRecentLinks(sortedRecentLinks);
    setTotalLinksCount(getLinksCount());
    setTotalAllClicks(getTotalClicks());
  }, []);

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
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Avg. CTR (Example)</span>
                        <span className="font-semibold text-lg">2.5%</span>
                    </div>
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
