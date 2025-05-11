'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Settings, Info } from 'lucide-react';

// This component can be dynamically rendered by reusing parts of the main settings page,
// or have specific content for each setting. For this example, it's a generic placeholder.

export default function SpecificSettingPage() {
  const params = useParams();
  const settingName = params.setting as string;

  const displaySettingName = settingName
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters for camelCase
    .split('-') // Split by hyphen for kebab-case
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="container mx-auto py-2">
      <Button variant="outline" size="sm" asChild className="mb-6">
        <Link href="/settings">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to All Settings
        </Link>
      </Button>
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Settings className="mr-2 h-6 w-6 text-primary" />
            {displaySettingName} Settings
          </CardTitle>
          <CardDescription>
            This page is a placeholder for managing "{displaySettingName}" settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
            <Info className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Settings Section Under Construction</h3>
            <p className="text-muted-foreground max-w-md">
              The detailed configuration for "{displaySettingName}" would be available here.
              For now, all settings are managed on the main <Link href="/settings" className="text-primary hover:underline">Settings page</Link> via tabs.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
