// src/components/LinkSettingsSidebar.tsx
'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Link as LinkIcon,
  Smartphone,
  Megaphone,
  Globe,
  Clock,
  Shield,
  Lock,
  QrCode,
  Code2,
  Info,
  GitMerge,
  Users2,
  Zap,
  Shuffle,
} from 'lucide-react';

export function LinkSettingsSidebar() {
  // Grab the dynamic segment, if any
  const { id: linkId } = useParams() as { id?: string };
  const pathname = usePathname() || '';

  // Determine base path: existing link edits or new-link flow
  const basePath = linkId ? `/links/${linkId}` : '/links';

  // Define all sidebar items (always show these 13 options)
  const items = [
    { label: 'Basic link editing',  href: `${basePath}/basic`,       icon: LinkIcon },
    { label: 'Link rotation',       href: `${basePath}/rotate`,      icon: Shuffle },
    { label: 'Mobile targeting',    href: `${basePath}/mobile`,      icon: Smartphone },
    { label: 'Campaign tracking',   href: `${basePath}/campaign`,    icon: Megaphone },
    { label: 'Geo-targeting',       href: `${basePath}/geo`,         icon: Globe },
    { label: 'Temporary URL',       href: `${basePath}/temporary`,   icon: Clock },
    { label: 'Link cloaking',       href: `${basePath}/cloak`,       icon: Shield },
    { label: 'Password protection', href: `${basePath}/password`,    icon: Lock },
    { label: 'QR code',             href: `${basePath}/qr`,          icon: QrCode },
    { label: 'A/B testing',         href: `${basePath}/ab`,          icon: Code2 },
    { label: 'HTTP Status',         href: `${basePath}/httpstatus`,  icon: Info },
    { label: 'Social media',        href: `${basePath}/social`,      icon: GitMerge },
    { label: 'Link permissions',    href: `${basePath}/permissions`, icon: Users2 },
    { label: 'Tracking',            href: `${basePath}/tracking`,    icon: Zap },
  ];

  return (
    <Card className="w-64 border-gray-200 dark:border-gray-700">
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-2rem)]">
          <nav className="flex flex-col space-y-1 p-4">
            {items.map(({ label, href, icon: Icon }) => {
              const isActive =
                pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                    isActive
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon
                    className={isActive ? 'text-primary' : 'text-muted-foreground'}
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}