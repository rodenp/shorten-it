'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, FlaskConical, Info } from 'lucide-react';

export default function FeaturePage() {
  const params = useParams();
  const featureName = params.feature as string;

  // Capitalize first letter of each word in featureName
  const displayFeatureName = featureName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

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
            <FlaskConical className="mr-2 h-6 w-6 text-primary" />
            {displayFeatureName}
          </CardTitle>
          <CardDescription>
            This page is a placeholder for the "{displayFeatureName}" feature.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
            <Info className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Feature Under Construction</h3>
            <p className="text-muted-foreground max-w-md">
              The full functionality for "{displayFeatureName}" is currently being developed. 
              Stay tuned for updates! In a real application, this page would contain specific settings and tools for this feature.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
