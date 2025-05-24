'use client';

import { useEffect, useState } from 'react';
import type { Domain } from '@/models/Domains';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AddDomainSettings } from '@/components/settings/add-domain-settings';

export function AllDomainsSettings() {
  const { toast } = useToast();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    async function fetchDomains() {
      try {
        const res = await fetch('/api/domains?types=local,custom');
        if (!res.ok) throw new Error('Error loading domains');
        const all = (await res.json()) as Domain[];
        setDomains(all);
      } catch (err: any) {
        toast({ title: 'Error loading domains', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
    fetchDomains();
  }, [toast]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/domains/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove domain');
      toast({ title: 'Domain removed' });
      setDomains(prev => prev.filter(d => d.id !== id));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (adding) {
    return <AddDomainSettings onDone={() => setAdding(false)} />;
  }

  const local = domains.filter(d => d.type === 'local');
  const custom = domains.filter(d => d.type === 'custom');

  return (
    <Card className="max-w-4xl mx-auto mt-10">
      <CardHeader>
        <CardTitle className="mb-4">All Domains</CardTitle>
        <div className="flex justify-start mb-4">
          <Button onClick={() => setAdding(true)} className="flex gap-2 items-center w-auto">
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
              {local.length > 0 ? local.map(d => (
                <div key={d.id} className="flex justify-between items-center border p-3 rounded">
                  <span>{d.domainName}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No subdomains added.</p>
              )}
            </div>

            <h3 className="font-semibold mb-2">Custom Domains</h3>
            <div className="space-y-2">
              {custom.length > 0 ? custom.map(d => (
                <div key={d.id} className="flex justify-between items-center border p-3 rounded">
                  <span>{d.domainName}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No custom domains added.</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}