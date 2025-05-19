'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export function CustomDomainsSettings() {
  const { toast } = useToast();
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/custom-domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainName: domain.trim() }),
      });

      if (!res.ok) throw new Error('Failed to create domain');

      toast({ title: 'Success', description: `Custom domain ${domain} added.` });
      setDomain('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-xl mx-auto mt-16">
      <CardHeader>
        <CardTitle>Add Your Own Domain</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            placeholder="your.domain.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Enter your full domain or subdomain (e.g. links.example.com)
          </p>
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={loading || !domain}>
            {loading ? 'Adding...' : 'Add Domain'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}