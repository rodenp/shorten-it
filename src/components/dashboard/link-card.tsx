
'use client';

import type { LinkItem, LinkGroup } from '@/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Copy, Edit, Trash2, BarChartHorizontalBig, MoreVertical, ExternalLink, Clock, ShieldCheck, MoveDiagonal, FlaskConical, Target, Shuffle, FolderKanban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { getMockLinkGroupById } from '@/lib/mock-data';


interface LinkCardProps {
  link: LinkItem;
  onDelete?: (linkId: string) => void;
}

export function LinkCard({ link, onDelete }: LinkCardProps) {
  const { toast } = useToast();
  const [groupName, setGroupName] = useState<string | null>(null);

  useEffect(() => {
    if (link.groupId) {
      const group = getMockLinkGroupById(link.groupId);
      if (group) {
        setGroupName(group.name);
      }
    } else {
      setGroupName(null);
    }
  }, [link.groupId]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!', description: text, variant: 'default' });
  };

  const handleDelete = () => {
    onDelete?.(link.id);
  }

  const getFeatureIcons = () => {
    const icons = [];
    if (link.abTestConfig) {
        icons.push({ icon: FlaskConical, label: `A/B Test (${link.abTestConfig.splitPercentage}%/${100-link.abTestConfig.splitPercentage}%)` });
    }
    else if (link.targets && link.targets.length > 1) {
        icons.push({ icon: Shuffle, label: `URL Rotation (${link.targets.length})` });
    }

    if (link.isCloaked) icons.push({ icon: ShieldCheck, label: "Link Cloaking" });
    if (link.deepLinkConfig && (link.deepLinkConfig.ios || link.deepLinkConfig.android)) icons.push({ icon: MoveDiagonal, label: "Deep Linking" });
    if (link.retargetingPixels && link.retargetingPixels.length > 0) icons.push({ icon: Target, label: "Retargeting" });
    return icons;
  }

  const featureIcons = getFeatureIcons();

  const originalUrlDisplay = () => {
    if (link.abTestConfig) {
      return `A/B Test: ${link.targets[0]?.url.replace(/^https?:\/\//, '')} vs ${link.targets[1]?.url.replace(/^https?:\/\//, '')}`;
    }
    if (link.targets && link.targets.length > 1) {
      return `Rotates between ${link.targets.length} URLs`;
    }
    return link.targets[0]?.url || link.originalUrl || 'N/A';
  };

  const originalUrlTitle = () => {
     if (link.abTestConfig) {
      return `Variant A (${link.abTestConfig.splitPercentage}%): ${link.targets[0]?.url}\nVariant B (${100-link.abTestConfig.splitPercentage}%): ${link.targets[1]?.url}`;
    }
    if (link.targets && link.targets.length > 1) {
      return link.targets.map(t => `${t.url} (${t.weight || (100/link.targets.length).toFixed(0)}%)`).join(', ');
    }
    return link.targets[0]?.url || link.originalUrl || 'N/A';
  };


  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg mb-1 truncate" title={link.title || link.shortUrl}>{link.title || link.shortUrl}</CardTitle>
            <a href={link.shortUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center truncate">
              {link.shortUrl} <ExternalLink className="ml-1 h-3 w-3 flex-shrink-0" />
            </a>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleCopy(link.shortUrl)}>
                <Copy className="mr-2 h-4 w-4" />
                <span>Copy Short URL</span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild disabled>
                <Link href={`/links/${link.slug}/edit`} className="flex items-center">
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Edit Link</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/analytics/${link.slug || link.id}`} className="flex items-center">
                  <BarChartHorizontalBig className="mr-2 h-4 w-4" />
                  <span>View Analytics</span>
                </Link>
              </DropdownMenuItem>
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                   <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()} // Prevent closing dropdown
                        className="text-destructive focus:bg-destructive focus:text-destructive-foreground justify-start"
                       >
                        <Trash2 />
                        <span>Delete Link</span>
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the link
                          "{link.title || link.shortUrl}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className={buttonVariants({variant: "destructive"})}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-xs text-muted-foreground truncate pt-1" title={originalUrlTitle()}>
          Original: {originalUrlDisplay()}
        </p>
      </CardHeader>
      <CardContent className="pb-4 flex-grow">
        <div className="flex justify-between items-center text-sm mb-3">
          <div className="flex items-center text-muted-foreground">
            <BarChartHorizontalBig className="mr-1.5 h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">{(link.clickCount || 0).toLocaleString()}</span>&nbsp;clicks
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            {formatDistanceToNow(new Date(link.createdAt), { addSuffix: true })}
          </div>
        </div>

        {(featureIcons.length > 0 || (link.tags && link.tags.length > 0) || groupName) && (
          <div className="space-y-2">
            {groupName && (
              <Badge variant="outline" className="py-1 px-2 text-xs font-medium">
                <FolderKanban className="mr-1 h-3 w-3" /> {groupName}
              </Badge>
            )}
            {featureIcons.length > 0 && (
              <div className={cn("flex items-center gap-2 flex-wrap", groupName && "mt-2")}>
                {featureIcons.map(f => (
                  <Badge variant="secondary" key={f.label} className="py-1 px-2 text-xs">
                    <f.icon className="mr-1 h-3 w-3" /> {f.label}
                  </Badge>
                ))}
              </div>
            )}
            {link.tags && link.tags.length > 0 && (
              <div className={cn("flex items-center gap-1.5 flex-wrap", (groupName || featureIcons.length > 0) && "mt-2")}>
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
