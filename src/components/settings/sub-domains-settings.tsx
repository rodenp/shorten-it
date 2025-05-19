'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export function SubDomainsSettings() {
  const { toast } = useToast();
  const [subdomain, setSubdomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const baseDomain = process.env.NEXT_PUBLIC_SHORTENER_DOMAIN || 'lnker.me';

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    // Basic 1-level subdomain format validation
    if (!/^[a-z0-9-]+$/.test(subdomain) || subdomain.includes('.')) {
      setError('Only lowercase letters, numbers, and hyphens allowed. No dots.');
      setLoading(false);
      return;
    }

    // build full domain
    const fullDomain = `${subdomain.trim()}.${baseDomain}`;

    try {
      const res = await fetch('/api/sub-domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomainName: fullDomain })
      });

      if (res.status === 409) {
        setError('This subdomain is already taken.');
      } else if (res.status === 400) {
        const { message } = await res.json();
        setError(message);
      } else if (!res.ok) {
        setError('Failed to create subdomain.');
      } else {
        toast({
          title: 'Subdomain created!',
          description: `${fullDomain} is now yours.`,
        });
        setSubdomain('');
      }
    } catch (err: any) {
      setError('Unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Use a Free Subdomain</CardTitle>
          <CardDescription>
            You can use a free subdomain under our shared domain for testing or short-term use.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Choose a subdomain</label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="yourname"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                className="max-w-xs"
              />
              <span className="text-sm text-muted-foreground">.{baseDomain}</span>
            </div>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={loading || !subdomain}>
              {loading ? 'Adding...' : 'Add Subdomain'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}