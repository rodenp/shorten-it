
'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, FlaskConical, Info, Shuffle, Settings2, ShieldCheck, MoveDiagonal, GitFork, FileText } from 'lucide-react';
import Image from 'next/image';
import { LinkGroupsManagement } from '@/components/features/link-groups-management';
import { DeepLinkingFeature } from '@/components/features/deep-linking-feature'; // Added

const featureDetails: Record<string, {
  title: string;
  icon: React.ElementType;
  description: string;
  details: string;
  imageHint: string;
  isImplemented?: boolean; 
}> = {
  rotation: {
    title: "URL Rotation",
    icon: Shuffle,
    description: "Distribute traffic across multiple destination URLs from a single short link.",
    details: "Set up URL rotation to send users to different web pages based on predefined weights or sequentially. Ideal for testing different landing pages, distributing load, or running regional campaigns. You can configure weights for each target URL to control the traffic distribution.",
    imageHint: "arrows cycle",
  },
  'ab-testing': {
    title: "A/B Testing",
    icon: FlaskConical,
    description: "Test different destination URLs to see which performs better.",
    details: "A/B testing allows you to split traffic between two different destination URLs (Variant A and Variant B) from a single short link. You can define the percentage of traffic to send to Variant A, with the remainder going to Variant B. This is useful for optimizing conversion rates by comparing the performance of different landing pages or offers.",
    imageHint: "split comparison",
  },
  cloaking: {
    title: "Link Cloaking",
    icon: ShieldCheck,
    description: "Mask the destination URL, showing your short link in the browser's address bar.",
    details: "Link cloaking, also known as URL masking, keeps your short link visible in the user's browser address bar even after they've been redirected to the destination URL. This can be useful for affiliate marketing or branding purposes. However, be aware that some websites may not allow themselves to be cloaked (e.g., by using frame-breaking scripts).",
    imageHint: "mask disguise",
  },
  deeplinking: {
    title: "Deep Linking",
    icon: MoveDiagonal,
    description: "Send users directly to specific content within your mobile app.",
    details: "Deep linking allows your short links to intelligently redirect users to specific content or pages within your iOS or Android mobile application if they have it installed. If the app isn't installed, they can be redirected to the app store or a fallback web URL. This provides a seamless user experience for mobile users.",
    imageHint: "mobile app",
    isImplemented: true, // Mark as implemented
  },
  groups: {
    title: "Link Groups",
    icon: GitFork, 
    description: "Organize your links into groups or campaigns for better management.",
    details: "Link groups (or campaigns) allow you to categorize and manage your short links more effectively. By grouping related links, you can easily track collective performance, apply bulk actions (feature dependent), and keep your dashboard organized. This is especially useful for managing multiple marketing campaigns or different types of links.",
    imageHint: "folder organization",
    isImplemented: true,
  },
  export: {
    title: "Export Data",
    icon: FileText,
    description: "Download your link data and analytics for external use.",
    details: "The export data feature allows you to download your link information, including click counts, creation dates, and potentially detailed analytics event data, in formats like CSV or JSON. This is useful for offline analysis, reporting, or integrating with other business intelligence tools. ",
    imageHint: "document download",
  }
};


export default function FeaturePage() {
  const params = useParams();
  const featureName = params.feature as string;

  const currentFeature = featureDetails[featureName];

  const displayFeatureName = currentFeature 
    ? currentFeature.title 
    : featureName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  
  const FeatureIcon = currentFeature ? currentFeature.icon : Settings2;


  const renderFeatureContent = () => {
    if (!currentFeature) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
          <Info className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Feature Not Found</h3>
          <p className="text-muted-foreground max-w-md">
            The feature "{displayFeatureName}" does not have details available.
          </p>
        </div>
      );
    }

    if (featureName === 'groups' && currentFeature.isImplemented) {
      return <LinkGroupsManagement />;
    }

    if (featureName === 'deeplinking' && currentFeature.isImplemented) {
      return <DeepLinkingFeature />;
    }

    // Default rendering for other features or unimplemented ones
    return (
      <div className="space-y-6">
        <div className="p-6 border rounded-lg bg-muted/30">
          <h3 className="text-lg font-semibold mb-2 text-foreground">How {currentFeature.title} Works</h3>
          <p className="text-muted-foreground whitespace-pre-line">{currentFeature.details}</p>
        </div>
        <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
          <Image 
            src={`https://picsum.photos/seed/${featureName.replace('-', '')}/400/200`} 
            alt={`${displayFeatureName} illustration`} 
            width={400} 
            height={200} 
            className="rounded-md mb-6 shadow-md"
            data-ai-hint={currentFeature.imageHint}
          />
          <Settings2 className="h-12 w-12 text-muted-foreground mb-3" />
          <h3 className="text-xl font-semibold mb-1">Configuration Options</h3>
          <p className="text-muted-foreground max-w-md">
            Detailed settings and controls for the {currentFeature.title} feature will be available here once fully implemented. 
            For now, you can typically enable this feature when creating or editing links.
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Create a Link with {currentFeature.title}</Link>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-2">
      <Button variant="outline" size="sm" asChild className="mb-6">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <FeatureIcon className="mr-3 h-7 w-7 text-primary" />
            {displayFeatureName}
          </CardTitle>
          <CardDescription>
            {currentFeature ? currentFeature.description : `Details and settings for the "${displayFeatureName}" feature.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderFeatureContent()}
        </CardContent>
      </Card>
    </div>
  );
}
