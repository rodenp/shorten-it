
'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Settings, Info } from 'lucide-react';
import { CampaignTemplatesSettings } from '@/components/settings/campaign-templates-settings';
import { CustomDomainsSettings } from '@/components/settings/custom-domains-settings';
import { ProfileSettings } from '@/components/settings/profile-settings'; 
import { AppearanceSettings } from '@/components/settings/appearance-settings';
import { ApiKeysSettings } from '@/components/settings/api-keys-settings';
import { RetargetingSettings } from '@/components/settings/retargeting-settings';
import { TeamCollaborationSettings } from '@/components/settings/team-collaboration-settings'; 
// Import other specific settings components here as they are created
// etc.

export default function SpecificSettingPage() {
  const params = useParams();
  const settingName = params.setting as string;

  const displaySettingName = settingName
    .replace(/([A-Z0-9])/g, ' $1') 
    .split(/[-_ ]/) 
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const renderSettingComponent = () => {
    switch (settingName) {
      case 'campaigns':
        return <CampaignTemplatesSettings />;
      case 'domains':
        return <CustomDomainsSettings />;
      case 'profile':
        return <ProfileSettings />; 
      case 'appearance':
        return <AppearanceSettings />;
      case 'apikeys':
        return <ApiKeysSettings />;
      case 'retargeting':
        return <RetargetingSettings />;
      case 'team':
        return <TeamCollaborationSettings />;
      default:
        return (
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
                  For now, this specific setting might be managed on the main <Link href="/settings" className="text-primary hover:underline">Settings page</Link> or is under development.
                </p>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="container mx-auto py-2">
      <Button variant="outline" size="sm" asChild className="mb-6">
        <Link href="/settings">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to All Settings
        </Link>
      </Button>
      {renderSettingComponent()}
    </div>
  );
}

