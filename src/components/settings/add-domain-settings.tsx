'use client';

import { useState } from 'react';
import { SubDomainsSettings } from './sub-domains-settings';
import { CustomDomainsSettings } from './custom-domains-settings';
import { Globe, Link2 } from 'lucide-react';

export function AddDomainSettings() {
  const [mode, setMode] = useState<'subdomain' | 'customdomain' | null>(null);

  if (mode === 'subdomain') return <SubDomainsSettings />;
  if (mode === 'customdomain') return <CustomDomainsSettings />;

  return (
    <div className="max-w-3xl mx-auto mt-16 px-4">
      <h1 className="text-2xl font-semibold mb-6 text-center">Add New Domain</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Try for Free option */}
        <button
          onClick={() => setMode('subdomain')}
          className="border rounded-xl p-6 text-left hover:bg-muted transition"
        >
          <div className="flex items-center gap-4">
            <div className="bg-primary text-white p-2 rounded-md">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-medium">Try for Free</h2>
              <p className="text-muted-foreground text-sm">Use a free subdomain on our shared domain</p>
            </div>
          </div>
        </button>

        {/* Add your own domain */}
        <button
          onClick={() => setMode('customdomain')}
          className="border rounded-xl p-6 text-left hover:bg-muted transition"
        >
          <div className="flex items-center gap-4">
            <div className="bg-primary text-white p-2 rounded-md">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-medium">Add your own domain</h2>
              <p className="text-muted-foreground text-sm">Connect your existing domain for full control</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}