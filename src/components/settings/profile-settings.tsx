
'use client';

import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Label isn't used explicitly but good to keep if FormLabel is used internally
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
// Removed mock data imports
// import { UserProfile } from "@/types"; // Not strictly needed if we use form values directly

const profileFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }).max(50, { message: "Full name must not exceed 50 characters."}),
  email: z.string().email({ message: "Please enter a valid email address." }),
  currentPassword: z.string().optional(), // Added for password change
  newPassword: z.string().optional().refine(value => !value || value.length >= 8, {
    message: "Password must be at least 8 characters long if provided.",
  }),
  confirmPassword: z.string().optional(),
  avatarUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
}).refine(data => {
  // If newPassword is provided, currentPassword must also be provided
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: "Current password is required to set a new password.",
  path: ["currentPassword"], 
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [initialAvatar, setInitialAvatar] = useState<string | undefined>(undefined);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      avatarUrl: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setApiError(null);
      try {
        const response = await fetch('/api/user/profile');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch profile");
        }
        const data = await response.json();
        form.reset({
          fullName: data.fullName || "",
          email: data.email || "",
          avatarUrl: data.avatarUrl || "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setInitialAvatar(data.avatarUrl || undefined);
      } catch (error: any) {
        setApiError(error.message);
        toast({
          title: "Error",
          description: error.message || "Could not load profile data.",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    };
    fetchProfile();
  }, [form, toast]);

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      const payload: any = {
        fullName: data.fullName,
        email: data.email, // Consider if email updates should be handled differently (e.g. verification)
        avatarUrl: data.avatarUrl,
      };

      if (data.newPassword) {
        if (!data.currentPassword) {
            form.setError("currentPassword", { type: "manual", message: "Current password is required to set a new password." });
            setIsSubmitting(false);
            return;
        }
        payload.currentPassword = data.currentPassword;
        payload.newPassword = data.newPassword;
        payload.confirmPassword = data.confirmPassword;
      }

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update profile");
      }

      const result = await response.json();
      toast({
        title: "Profile Updated",
        description: result.message || "Your profile information has been updated successfully.",
      });
      // Reset form with new data, clear password fields, and reset dirty state
      form.reset({
        ...data, // keep most fields as they are now the 'new' current state
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }, { keepValues: false, keepDirty: false, keepDefaultValues: false });
      setInitialAvatar(data.avatarUrl || undefined);
      
    } catch (error: any) {
      setApiError(error.message);
      toast({
        title: "Update Failed",
        description: error.message || "Could not update profile.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      // Basic client-side validation for file size (e.g., 1MB)
      if (file.size > 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Avatar image must be less than 1MB.",
          variant: "destructive",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue("avatarUrl", reader.result as string, { shouldValidate: true, shouldDirty: true });
        // No immediate toast here, user sees the preview change. Toast on save.
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return <p>Loading profile...</p>; // Or a skeleton loader
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>Update your personal information and preferences.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
          <CardContent className="space-y-6">
            {apiError && <p className="text-sm font-medium text-destructive">Error: {apiError}</p>}
            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage 
                      src={field.value || initialAvatar || `https://picsum.photos/seed/${form.getValues("email") || 'default-user'}/100/100`} 
                      alt={form.getValues("fullName") || "User Avatar"}
                    />
                    <AvatarFallback>
                        {form.getValues("fullName")?.substring(0,2).toUpperCase() || "CU"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1">
                    <Button type="button" variant="outline" onClick={() => document.getElementById('avatar-upload')?.click()}>
                      Change Avatar
                    </Button>
                    <Input 
                      id="avatar-upload" 
                      type="file" 
                      className="hidden" 
                      accept="image/jpeg, image/png, image/gif" 
                      onChange={handleAvatarChange} 
                    />
                    <p className="text-xs text-muted-foreground">JPG, PNG or GIF. 1MB max.</p>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    {/* Making email read-only for now, as changing it often has implications (verification, etc.) */}
                    <Input type="email" placeholder="your.email@example.com" {...field} readOnly />
                  </FormControl>
                  <FormMessage />
                   <p className="text-xs text-muted-foreground">Email address cannot be changed here.</p>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter your current password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                        <Input type="password" placeholder="Leave blank to keep current" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                        <Input type="password" placeholder="Confirm new password" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <Button type="submit" disabled={isLoading || isSubmitting || !form.formState.isDirty}>
                {isSubmitting ? "Updating..." : "Update Profile"}
             </Button>
          </CardContent>
        </form>
      </Form>
    </Card>
  );
}
