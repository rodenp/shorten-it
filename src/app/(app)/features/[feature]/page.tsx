
'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, FlaskConical, Info, Shuffle, Settings2 } from 'lucide-react';
import Image from 'next/image';

const featureDetails: Record<string, {
  title: string;
  icon: React.ElementType;
  description: string;
  details: string;
  imageHint: string;
}> = {
  rotation: {
    title: "URL Rotation",
    icon: Shuffle,
    description: "Distribute traffic across multiple destination URLs from a single short link.",
    details: "Set up URL rotation to send users to different web pages based on predefined weights or sequentially. Ideal for testing different landing pages, distributing load, or running regional campaigns. You can configure weights for each target URL to control the traffic distribution.",
    imageHint: "arrows cycle",
  },
  // Add other features here as they are implemented
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
  
  const FeatureIcon = currentFeature ? currentFeature.icon : FlaskConical;


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
          {currentFeature ? (
            <div className="space-y-6">
              <div className="p-6 border rounded-lg bg-muted/30">
                <h3 className="text-lg font-semibold mb-2 text-foreground">How {currentFeature.title} Works</h3>
                <p className="text-muted-foreground">{currentFeature.details}</p>
              </div>
              <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                <Image 
                  src={`https://picsum.photos/seed/${featureName}/400/200`} 
                  alt={`${displayFeatureName} illustration`} 
                  width={400} 
                  height={200} 
                  className="rounded-md mb-6 shadow-md"
                  data-ai-hint={currentFeature.imageHint}
                />
                <Settings2 className="h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-xl font-semibold mb-1">Configuration Options</h3>
                <p className="text-muted-foreground max-w-md">
                  Detailed settings and controls for the {currentFeature.title} feature will be available here once fully implemented. For now, you can enable this feature when creating or editing links.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard">Create a Link with {currentFeature.title}</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
              <Info className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Feature Under Construction</h3>
              <p className="text-muted-foreground max-w-md">
                The full functionality for "{displayFeatureName}" is currently being developed. 
                Stay tuned for updates! In a real application, this page would contain specific settings and tools for this feature.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
