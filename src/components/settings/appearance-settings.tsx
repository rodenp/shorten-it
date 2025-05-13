
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from '@/hooks/use-toast';

type Theme = 'light' | 'dark' | 'system';

export function AppearanceSettings() {
  const { toast } = useToast();
  const [theme, setTheme] = useState<Theme>('system');
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  const applyTheme = useCallback((selectedTheme: Theme) => {
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark'); // Remove existing theme classes

    if (selectedTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      localStorage.setItem('linkwiz-theme', 'system');
    } else {
      root.classList.add(selectedTheme);
      localStorage.setItem('linkwiz-theme', selectedTheme);
    }
  }, []);

  const applyCompactMode = useCallback((compact: boolean) => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    if (compact) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }
    localStorage.setItem('linkwiz-compactMode', JSON.stringify(compact));
  }, []);

  // Load preferences from localStorage on mount
  useEffect(() => {
    setMounted(true); // Indicate component has mounted
    const storedTheme = localStorage.getItem('linkwiz-theme') as Theme | null;
    const storedCompactMode = localStorage.getItem('linkwiz-compactMode');

    if (storedTheme) {
      setTheme(storedTheme);
      applyTheme(storedTheme);
    } else {
      applyTheme('system'); // Default to system if nothing is stored
    }

    if (storedCompactMode) {
      const compact = JSON.parse(storedCompactMode);
      setIsCompactMode(compact);
      applyCompactMode(compact);
    }
  }, [applyTheme, applyCompactMode]); // Dependencies ensure these run once after mount due to their own stability

  // Effect for system theme changes (if 'system' is selected)
  useEffect(() => {
    if (typeof window === 'undefined' || theme !== 'system' || !mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Only re-apply if current theme is 'system'
      if (localStorage.getItem('linkwiz-theme') === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    // Initial check
    handleChange(); 
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme, mounted]);


  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    toast({ title: 'Appearance Updated', description: `Theme set to ${newTheme}.` });
  };

  const handleCompactModeChange = (checked: boolean) => {
    setIsCompactMode(checked);
    applyCompactMode(checked);
    toast({ title: 'Appearance Updated', description: `Compact mode ${checked ? 'enabled' : 'disabled'}.` });
  };
  
  if (!mounted) {
    // Render nothing or a loading skeleton until the component is mounted and can safely access localStorage
    // This helps prevent hydration mismatches.
    return (
        <Card>
            <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Loading appearance settings...</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="h-20 rounded-lg border p-4 animate-pulse bg-muted/50"></div>
                <div className="h-20 rounded-lg border p-4 animate-pulse bg-muted/50"></div>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize the look and feel of your LinkWiz dashboard.</CardDescription>
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
              <TabsTrigger value="light">Light</TabsTrigger>
              <TabsTrigger value="dark">Dark</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
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
            aria-label="Toggle compact mode"
          />
        </div>
      </CardContent>
    </Card>
  );
}
