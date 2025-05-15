
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from '@/hooks/use-toast';
import type { UserPreference, Theme } from '@/models/UserPreference'; // Import types from model
import { Loader2 } from 'lucide-react';

export function AppearanceSettings() {
  const { toast } = useToast();
  // Initialize with default values or null, to be populated from API
  const [theme, setTheme] = useState<Theme>('system'); 
  const [isCompactMode, setIsCompactMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false); // To prevent SSR/hydration issues with theme application

  // Function to apply theme to the document
  const applyThemeToDocument = useCallback((selectedTheme: Theme) => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (selectedTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(selectedTheme);
    }
    // Store preference in localStorage for immediate effect on next page load before DB sync
    localStorage.setItem('linkwiz-theme', selectedTheme);
  }, []);

  // Function to apply compact mode to the document
  const applyCompactModeToDocument = useCallback((compact: boolean) => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    if (compact) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }
    localStorage.setItem('linkwiz-compactMode', JSON.stringify(compact));
  }, []);

  // Fetch preferences from API on mount
  useEffect(() => {
    setMounted(true);
    const fetchPreferences = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/user/preferences');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch preferences');
        }
        const prefs: UserPreference = await response.json();
        setTheme(prefs.theme);
        setIsCompactMode(prefs.isCompactMode);
        applyThemeToDocument(prefs.theme);
        applyCompactModeToDocument(prefs.isCompactMode);
      } catch (error: any) {
        toast({ title: "Error Loading Preferences", description: error.message, variant: "destructive" });
        // Apply defaults visually if fetch fails, but don't save them yet
        applyThemeToDocument('system');
        applyCompactModeToDocument(false);
      }
      setIsLoading(false);
    };
    fetchPreferences();
  }, [toast, applyThemeToDocument, applyCompactModeToDocument]);

  // Effect for system theme changes (if 'system' is selected)
  useEffect(() => {
    if (!mounted || typeof window === 'undefined' || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Only re-apply if current theme is 'system' (check against state or localStorage)
      if (localStorage.getItem('linkwiz-theme') === 'system') {
         applyThemeToDocument('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    // Initial check to apply system theme correctly if that's the preference
    if (theme === 'system') handleChange(); 

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyThemeToDocument, mounted]);

  // Generic function to save preferences
  const savePreference = async (preference: Partial<UserPreference>) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preference),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save preference');
      }
      // const updatedPrefs: UserPreference = await response.json(); // Can use this to sync state if needed
      toast({ title: 'Appearance Updated', description: `Preference saved successfully.` });
    } catch (error: any) {
      toast({ title: "Error Saving Preference", description: error.message, variant: "destructive" });
      // Optionally revert UI changes here if save fails
    }
    setIsSaving(false);
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    applyThemeToDocument(newTheme);
    savePreference({ theme: newTheme });
  };

  const handleCompactModeChange = (checked: boolean) => {
    setIsCompactMode(checked);
    applyCompactModeToDocument(checked);
    savePreference({ isCompactMode: checked });
  };
  
  if (!mounted || isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Loading appearance settings...</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="h-20 rounded-lg border p-4 animate-pulse bg-muted/50 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
                <div className="h-20 rounded-lg border p-4 animate-pulse bg-muted/50 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize the look and feel of your dashboard.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-4">
          <div className="mb-2 sm:mb-0">
            <Label htmlFor="theme-mode" className="text-base font-semibold">Theme Mode</Label>
            <p className="text-sm text-muted-foreground">
              Select your preferred theme for the dashboard.
            </p>
          </div>
          <Tabs value={theme} onValueChange={(value) => handleThemeChange(value as Theme)} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-3 sm:w-auto">
              <TabsTrigger value="light" disabled={isSaving}>Light</TabsTrigger>
              <TabsTrigger value="dark" disabled={isSaving}>Dark</TabsTrigger>
              <TabsTrigger value="system" disabled={isSaving}>System</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label htmlFor="compact-mode" className="text-base font-semibold">Compact Mode</Label>
            <p className="text-sm text-muted-foreground">
              Reduce padding and margins for a more compact view. (Styling to be implemented separately)
            </p>
          </div>
          <Switch
            id="compact-mode"
            checked={isCompactMode}
            onCheckedChange={handleCompactModeChange}
            disabled={isSaving}
            aria-label="Toggle compact mode"
          />
        </div>
      </CardContent>
    </Card>
  );
}
