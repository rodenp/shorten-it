'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mockCustomDomains, mockTeamMembers } from "@/lib/mock-data";
import type { CustomDomain, TeamMember } from "@/types";
import { Globe, Users, KeyRound, PlusCircle, Trash2, Edit, Target, UserCircle, Palette } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

// Placeholder components for tab content
function ProfileSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>Update your personal information and preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
                <AvatarImage src="https://picsum.photos/seed/user-settings/100/100" data-ai-hint="profile picture"/>
                <AvatarFallback>LW</AvatarFallback>
            </Avatar>
            <Button variant="outline">Change Avatar</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue="Current User" />
            </div>
            <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" defaultValue="user@linkwiz.com" />
            </div>
        </div>
        <div>
            <Label htmlFor="password">New Password</Label>
            <Input id="password" type="password" placeholder="Leave blank to keep current password" />
        </div>
         <Button>Update Profile</Button>
      </CardContent>
    </Card>
  )
}

function CustomDomainsSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Domains</CardTitle>
        <CardDescription>Manage your branded short domains.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-2 items-end">
          <div className="flex-grow">
            <Label htmlFor="new-domain">Add New Domain</Label>
            <Input id="new-domain" placeholder="yourbrand.co" />
          </div>
          <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Domain</Button>
        </div>
        <Separator />
        <h3 className="text-lg font-medium">Your Domains</h3>
        {mockCustomDomains.length > 0 ? (
          <ul className="space-y-3">
            {mockCustomDomains.map((domain: CustomDomain) => (
              <li key={domain.id} className="flex justify-between items-center p-3 border rounded-md">
                <div>
                  <span className="font-medium">{domain.domainName}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${domain.verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {domain.verified ? 'Verified' : 'Pending Verification'}
                  </span>
                </div>
                <div className="space-x-2">
                  <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No custom domains added yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function TeamCollaborationSettings() {
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
         {mockTeamMembers.length > 0 ? (
          <ul className="space-y-3">
            {mockTeamMembers.map((member: TeamMember) => (
              <li key={member.id} className="flex justify-between items-center p-3 border rounded-md">
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://picsum.photos/seed/${member.email}/40/40`} data-ai-hint="avatar user"/>
                        <AvatarFallback>{member.name.substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <span className="font-medium">{member.name}</span>
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

function RetargetingSettings() {
  // Example pixel types
  const pixelTypes = ["Facebook Pixel", "Google Ads Tag", "LinkedIn Insight Tag", "Twitter Pixel"];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Retargeting Pixels</CardTitle>
        <CardDescription>Manage your retargeting pixels for tracking campaigns.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-grow">
            <Label htmlFor="pixel-name">Pixel Name</Label>
            <Input id="pixel-name" placeholder="e.g., Main Facebook Pixel" />
          </div>
          <div className="flex-grow">
            <Label htmlFor="pixel-id">Pixel ID</Label>
            <Input id="pixel-id" placeholder="Enter Pixel ID" />
          </div>
           <div className="flex-grow">
            <Label htmlFor="pixel-type">Pixel Type</Label>
            {/* This would typically be a Select component */}
            <Input id="pixel-type" placeholder="e.g. Facebook Pixel"/>
          </div>
          <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Pixel</Button>
        </div>
        <Separator />
        <h3 className="text-lg font-medium">Your Pixels</h3>
        {/* Placeholder for list of pixels */}
        <p className="text-muted-foreground">No retargeting pixels added yet.</p>
        <div className="p-3 border rounded-md">
            <div className="flex justify-between items-center">
                <div>
                    <p className="font-medium">Primary FB Pixel</p>
                    <p className="text-xs text-muted-foreground">ID: 1234567890 (Facebook Pixel)</p>
                </div>
                <div className="space-x-2">
                    <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ApiKeysSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <CardDescription>Manage API keys for programmatic access to LinkWiz.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
         <div className="flex flex-col sm:flex-row gap-2 items-end">
          <div className="flex-grow">
            <Label htmlFor="key-name">New API Key Name</Label>
            <Input id="key-name" placeholder="e.g., My Integration Key" />
          </div>
          <Button><PlusCircle className="mr-2 h-4 w-4" /> Generate API Key</Button>
        </div>
        <Separator />
        <h3 className="text-lg font-medium">Your API Keys</h3>
        {/* Placeholder for list of API keys */}
        <p className="text-muted-foreground">No API keys generated yet.</p>
         <div className="p-3 border rounded-md">
            <div className="flex justify-between items-center">
                <div>
                    <p className="font-medium">Main Integration Key</p>
                    <p className="text-xs text-muted-foreground">lw_************************abcd</p>
                    <p className="text-xs text-muted-foreground">Last used: 2 days ago</p>
                </div>
                <div className="space-x-2">
                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AppearanceSettings() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the look and feel of your LinkWiz dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <Label htmlFor="theme-mode" className="text-base">Theme Mode</Label>
                        <p className="text-sm text-muted-foreground">
                            Select your preferred theme for the dashboard.
                        </p>
                    </div>
                    {/* This would require actual theme switching logic */}
                    <Tabs defaultValue="light" className="w-[200px]">
                        <TabsList>
                            <TabsTrigger value="light">Light</TabsTrigger>
                            <TabsTrigger value="dark">Dark</TabsTrigger>
                            <TabsTrigger value="system">System</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                 <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <Label htmlFor="compact-mode" className="text-base">Compact Mode</Label>
                        <p className="text-sm text-muted-foreground">
                            Reduce padding and margins for a more compact view.
                        </p>
                    </div>
                    <Switch id="compact-mode" />
                </div>

                 <Button>Save Preferences</Button>
            </CardContent>
        </Card>
    )
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
