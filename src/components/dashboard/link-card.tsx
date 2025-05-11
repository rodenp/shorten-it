'use client';

import type { LinkItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Copy, Edit, Trash2, BarChartHorizontalBig, MoreVertical, ExternalLink, Clock, ShieldCheck, MoveDiagonal, FlaskConical, Target, Shuffle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';


interface LinkCardProps {
  link: LinkItem;
}

export function LinkCard({ link }: LinkCardProps) {
  const { toast } = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!', description: text, variant: 'default' });
  };

  const getFeatureIcons = () => {
    const icons = [];
    if (link.targets && link.targets.length > 1) icons.push({ icon: Shuffle, label: "URL Rotation" });
    if (link.isCloaked) icons.push({ icon: ShieldCheck, label: "Link Cloaking" });
    if (link.deepLinkConfig) icons.push({ icon: MoveDiagonal, label: "Deep Linking" });
    if (link.abTestConfig) icons.push({ icon: FlaskConical, label: "A/B Testing" });
    if (link.retargetingPixels && link.retargetingPixels.length > 0) icons.push({ icon: Target, label: "Retargeting" });
    return icons;
  }

  const featureIcons = getFeatureIcons();

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg mb-1">{link.title || link.shortUrl}</CardTitle>
            <a href={link.shortUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center">
              {link.shortUrl} <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleCopy(link.shortUrl)}>
                <Copy className="mr-2 h-4 w-4" /> Copy Short URL
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/links/${link.slug}/edit`}>
                  <Edit className="mr-2 h-4 w-4" /> Edit Link
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/analytics/${link.slug}`}>
                  <BarChartHorizontalBig className="mr-2 h-4 w-4" /> View Analytics
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive-foreground focus:bg-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-xs text-muted-foreground truncate pt-1" title={link.targets[0]?.url}>
          Original: {link.targets[0]?.url || 'N/A'}
        </p>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex justify-between items-center text-sm mb-3">
          <div className="flex items-center text-muted-foreground">
            <BarChartHorizontalBig className="mr-1.5 h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">{link.clickCount.toLocaleString()}</span>&nbsp;clicks
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            {formatDistanceToNow(new Date(link.createdAt), { addSuffix: true })}
          </div>
        </div>
        
        {(featureIcons.length > 0 || (link.tags && link.tags.length > 0)) && (
          <div className="space-y-2">
            {featureIcons.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {featureIcons.map(f => (
                  <Badge variant="secondary" key={f.label} className="py-1 px-2 text-xs">
                    <f.icon className="mr-1 h-3 w-3" /> {f.label}
                  </Badge>
                ))}
              </div>
            )}
            {link.tags && link.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {link.tags.map(tag => (
                  <Badge variant="outline" key={tag} className="py-0.5 px-1.5 text-xs">{tag}</Badge>
                ))}
              </div>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
