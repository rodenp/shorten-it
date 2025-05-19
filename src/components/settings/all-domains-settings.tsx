'use client';

import { useEffect, useState } from 'react';
import type { SubDomain } from '@/models/SubDomain';
import type { CustomDomain } from '@/models/CustomDomain';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AddDomainSettings } from '@/components/settings/add-domain-settings';

export function AllDomainsSettings() {
  const { toast } = useToast();
  const [subdomains, setSubdomains] = useState<SubDomain[]>([]);
  const [customDomains, setCustomDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    async function fetchDomains() {
      try {
        const [subsRes, customRes] = await Promise.all([
          fetch('/api/sub-domains'),
          fetch('/api/custom-domains')
        ]);
        const [subs, customs] = await Promise.all([subsRes.json(), customRes.json()]);
        setSubdomains(subs);
        setCustomDomains(customs);
      } catch (err) {
        toast({ title: 'Error loading domains', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
    fetchDomains();
  }, [toast]);

  const handleDelete = async (id: string, type: 'sub' | 'custom') => {
    const endpoint = type === 'sub' ? '/api/sub-domains/' : '/api/custom-domains/';
    try {
      const res = await fetch(endpoint + id, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast({ title: 'Domain removed' });
      if (type === 'sub') {
        setSubdomains((prev) => prev.filter((s) => s.id !== id));
      } else {
        setCustomDomains((prev) => prev.filter((d) => d.id !== id));
      }
    } catch {
      toast({ title: 'Failed to remove domain', variant: 'destructive' });
    }
  };

  if (adding) return <AddDomainSettings />;

  return (
    <Card className="max-w-4xl mx-auto mt-10">
      <CardHeader>
        <CardTitle className="mb-4">All Domains</CardTitle>
          <div className="flex justify-start mb-4">
            <Button
              onClick={() => setAdding(true)}
              className="flex gap-2 items-center w-auto"
            >
              <PlusCircle className="w-4 h-4" />
              Add New Domain
            </Button>
          </div>
      </CardHeader>
      <CardContent>
        <Separator className="mb-4" />
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <h3 className="font-semibold mb-2">Sub Domains</h3>
            <div className="space-y-2 mb-6">
              {subdomains.map((domain) => (
                <div key={domain.id} className="flex justify-between items-center border p-3 rounded">
                  <span>{domain.subdomainName}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(domain.id, 'sub')}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
              {subdomains.length === 0 && (
                <p className="text-sm text-muted-foreground">No subdomains added.</p>
              )}
            </div>

            <h3 className="font-semibold mb-2">Custom Domains</h3>
            <div className="space-y-2">
              {customDomains.map((domain) => (
                <div key={domain.id} className="flex justify-between items-center border p-3 rounded">
                  <span>{domain.domainName}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(domain.id, 'custom')}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
              {customDomains.length === 0 && (
                <p className="text-sm text-muted-foreground">No custom domains added.</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}