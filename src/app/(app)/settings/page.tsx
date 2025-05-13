
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMockTeamMembers } from "@/lib/mock-data"; // Updated import
import type { TeamMember } from "@/types";
import { Globe, Users, KeyRound, PlusCircle, Trash2, Edit, Target, UserCircle, Palette } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { CustomDomainsSettings } from "@/components/settings/custom-domains-settings";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { ApiKeysSettings } from "@/components/settings/api-keys-settings";
import { RetargetingSettings } from "@/components/settings/retargeting-settings";
import React, { useEffect, useState } from "react";


function TeamCollaborationSettings() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    setTeamMembers(getMockTeamMembers());
  }, []);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Collaboration</CardTitle>
        <CardDescription>Invite and manage your team members.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="flex-grow">
                <Label htmlFor="invite-email">Invite by Email</Label>
                <Input id="invite-email" type="email" placeholder="member@example.com" />
            </div>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Invite Member</Button>
        </div>
        <Separator />
        <h3 className="text-lg font-medium">Team Members</h3>
         {teamMembers.length > 0 ? (
          <ul className="space-y-3">
            {teamMembers.map((member: TeamMember) => (
              <li key={member.id} className="flex justify-between items-center p-3 border rounded-md">
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={member.avatarUrl || `https://picsum.photos/seed/${member.email}/40/40`} 
                          alt={member.fullName}
                          data-ai-hint={member.avatarUrl.includes('picsum.photos') ? "avatar user" : undefined}
                        />
                        <AvatarFallback>{member.fullName.substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <span className="font-medium">{member.fullName}</span>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm capitalize px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{member.role}</span>
                  <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">You haven't invited any team members yet.</p>
        )}
      </CardContent>
    </Card>
  );
}


export default function SettingsPage() {
  const tabsConfig = [
    { value: "profile", label: "Profile", icon: UserCircle, component: <ProfileSettings /> },
    { value: "domains", label: "Custom Domains", icon: Globe, component: <CustomDomainsSettings /> },
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
