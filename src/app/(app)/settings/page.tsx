
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubDomainsSettings } from "@/components/settings/sub-domains-settings";
import { CustomDomainsSettings } from "@/components/settings/custom-domains-settings";
import { CampaignTemplatesSettings } from "@/components/settings/campaign-templates-settings";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { ApiKeysSettings } from "@/components/settings/api-keys-settings";
import { RetargetingSettings } from "@/components/settings/retargeting-settings";
import { TeamCollaborationSettings } from "@/components/settings/team-collaboration-settings"; // Import the new component
import { Globe, Users, KeyRound, Target, UserCircle, Palette } from "lucide-react";
import React from "react";


export default function SettingsPage() {
  const tabsConfig = [
    { value: "profile", label: "Profile", icon: UserCircle, component: <ProfileSettings /> },
    { value: "sub-domain", label: "Sub Domain", icon: Globe, component: <SubDomainsSettings /> },
    { value: "domains", label: "Custom Domains", icon: Globe, component: <CustomDomainsSettings /> },
    { value: "campaigns", label: "Campaign Templates", icon: Globe, component: <CampaignTemplatesSettings /> },
    { value: "team", label: "Team Collaboration", icon: Users, component: <TeamCollaborationSettings /> },
    { value: "retargeting", label: "Retargeting", icon: Target, component: <RetargetingSettings /> }, 
    { value: "apikeys", label: "API Keys", icon: KeyRound, component: <ApiKeysSettings /> },
    { value: "appearance", label: "Appearance", icon: Palette, component: <AppearanceSettings /> },
  ];

  return (
    <div className="container mx-auto py-2">
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8">Settings</h1>
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 mb-6 h-auto flex-wrap">
          {tabsConfig.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="py-2 data-[state=active]:shadow-md">
              <tab.icon className="mr-2 h-4 w-4 hidden sm:inline-block" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabsConfig.map(tab => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.component}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
