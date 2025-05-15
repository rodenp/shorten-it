
'use client';

import type { LinkItem } from '@/types'; // LinkGroup removed, groupName is now part of LinkItem
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
import React from 'react'; // Removed useEffect, useState as groupName comes from prop
import { cn } from '@/lib/utils';
// Removed: import { getMockLinkGroupById } from '@/lib/mock-data';


interface LinkCardProps {
  link: LinkItem;
  onDelete?: (linkId: string) => void;
  // onEdit?: (link: LinkItem) => void; // Consider adding an edit handler
}

export function LinkCard({ link, onDelete }: LinkCardProps) {
  const { toast } = useToast();
  // Removed useState and useEffect for groupName, as link.groupName should be available directly

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
    // Check for rotation by seeing if targets has more than one item AND abTestConfig is not set
    else if (link.targets && link.targets.length > 1 && !link.abTestConfig) {
        icons.push({ icon: Shuffle, label: `URL Rotation (${link.targets.length})` });
    }

    if (link.isCloaked) icons.push({ icon: ShieldCheck, label: "Link Cloaking" });
    // Adjusted deepLinkConfig check for more clarity based on LinkItem type
    if (link.deepLinkConfig && (link.deepLinkConfig.iosAppUriScheme || link.deepLinkConfig.androidAppUriScheme)) {
         icons.push({ icon: MoveDiagonal, label: "Deep Linking" });
    }
    // Assuming retargetingPixels is now an array of RetargetingPixel objects
    if (link.retargetingPixels && link.retargetingPixels.length > 0) {
        icons.push({ icon: Target, label: `Retargeting (${link.retargetingPixels.length})` });
    }
    return icons;
  }

  const featureIcons = getFeatureIcons();

  const originalUrlDisplay = () => {
    if (link.abTestConfig) {
      return `A/B Test: ${link.targets[0]?.url.replace(/^https?:\/\//, '')} vs ${link.targets[1]?.url.replace(/^https?:\/\//, '')}`;
    }
    if (link.targets && link.targets.length > 1 && !link.abTestConfig) { // Ensure it's rotation
      return `Rotates between ${link.targets.length} URLs`;
    }
    // Default to the first target's URL or the originalUrl as fallback
    return (link.targets && link.targets[0]?.url) ? link.targets[0].url.replace(/^https?:\/\//, '') : link.originalUrl.replace(/^https?:\/\//, '') || 'N/A';
  };

  const originalUrlTitle = () => {
     if (link.abTestConfig) {
      return `Variant A (${link.abTestConfig.splitPercentage}%): ${link.targets[0]?.url}
Variant B (${100-link.abTestConfig.splitPercentage}%): ${link.targets[1]?.url}`;
    }
    if (link.targets && link.targets.length > 1 && !link.abTestConfig) { // Ensure it's rotation
      return link.targets.map(t => `${t.url} (${t.weight || (100/link.targets.length).toFixed(0)}%)`).join(', ');
    }
    return (link.targets && link.targets[0]?.url) || link.originalUrl || 'N/A';
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
              {/* Consider enabling an edit link/modal later */}
              {/* <DropdownMenuItem asChild>
                <Link href={`/links/${link.slug}/edit`} className="flex items-center">
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Edit Link</span>
                </Link>
              </DropdownMenuItem> */}
              <DropdownMenuItem asChild>
                <Link href={`/analytics/${link.id}`} className="flex items-center"> {/* Changed to link.id for analytics route */}
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
                        onSelect={(e) => e.preventDefault()} 
                        className="text-destructive focus:bg-destructive focus:text-destructive-foreground justify-start"
                       >
                        <Trash2 className="h-4 w-4 mr-2" /> {/* Ensure icon class consistency */}
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

        {(featureIcons.length > 0 || (link.tags && link.tags.length > 0) || link.groupName) && (
          <div className="space-y-2">
            {link.groupName && (
              <Badge variant="outline" className="py-1 px-2 text-xs font-medium">
                <FolderKanban className="mr-1 h-3 w-3" /> {link.groupName}
              </Badge>
            )}
            {featureIcons.length > 0 && (
              <div className={cn("flex items-center gap-2 flex-wrap", link.groupName && "mt-2")}>
                {featureIcons.map(f => (
                  <Badge variant="secondary" key={f.label} className="py-1 px-2 text-xs">
                    <f.icon className="mr-1 h-3 w-3" /> {f.label}
                  </Badge>
                ))}
              </div>
            )}
            {link.tags && link.tags.length > 0 && (
              <div className={cn("flex items-center gap-1.5 flex-wrap", (link.groupName || featureIcons.length > 0) && "mt-2")}>
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
