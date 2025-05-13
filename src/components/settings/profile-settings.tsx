
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import React, { useEffect } from "react";
import { getMockCurrentUserProfile, updateMockCurrentUserProfile } from "@/lib/mock-data";
import type { UserProfile } from "@/types";

const profileFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }).max(50, { message: "Full name must not exceed 50 characters."}),
  email: z.string().email({ message: "Please enter a valid email address." }),
  newPassword: z.string().optional().refine(value => !value || value.length >= 8, {
    message: "Password must be at least 8 characters long if provided.",
  }),
  confirmPassword: z.string().optional(),
  avatarUrl: z.string().optional(), // For storing avatar URL
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileSettings() {
  const { toast } = useToast();
  
  // Initialize form with data from mock store
  const currentUser = getMockCurrentUserProfile();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: currentUser.fullName,
      email: currentUser.email,
      avatarUrl: currentUser.avatarUrl,
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  // Effect to reset form if currentUser from mock-data changes (e.g., due to external update)
  // This might be too aggressive depending on usage, but for a demo it ensures consistency.
  useEffect(() => {
    const latestUser = getMockCurrentUserProfile();
    if (
      latestUser.fullName !== form.getValues("fullName") ||
      latestUser.email !== form.getValues("email") ||
      latestUser.avatarUrl !== form.getValues("avatarUrl")
    ) {
      form.reset({
        fullName: latestUser.fullName,
        email: latestUser.email,
        avatarUrl: latestUser.avatarUrl,
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [currentUser.fullName, currentUser.email, currentUser.avatarUrl, form]);


  const onSubmit = (data: ProfileFormValues) => {
    updateMockCurrentUserProfile({
      fullName: data.fullName,
      email: data.email,
      avatarUrl: data.avatarUrl,
    });

    if (data.newPassword) {
      // Mock password update logic
      console.log("Password updated (mock)");
    }

    toast({
      title: "Profile Updated",
      description: "Your profile information has been updated successfully.",
    });
    form.reset(data); // Keep form values, but reset dirty state
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue("avatarUrl", reader.result as string, { shouldValidate: true, shouldDirty: true });
        toast({
          title: "Avatar Preview Updated",
          description: "The avatar preview has been updated. Click 'Update Profile' to save.",
        });
      };
      reader.readAsDataURL(file);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>Update your personal information and preferences.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage 
                      src={field.value || `https://picsum.photos/seed/${form.getValues("email") || 'default-user'}/100/100`} 
                      alt={form.getValues("fullName") || "User Avatar"}
                      data-ai-hint={field.value?.startsWith('https://picsum.photos') ? 'profile picture' : undefined}
                    />
                    <AvatarFallback>
                        {form.getValues("fullName")?.substring(0,2).toUpperCase() || currentUser.fullName.substring(0,2).toUpperCase() || "CU"}
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
                    <p className="text-xs text-muted-foreground">JPG, PNG or GIF. 1MB max (mock).</p>
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
                    <Input type="email" placeholder="your.email@example.com" {...field} />
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
             <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
                {form.formState.isSubmitting ? "Updating..." : "Update Profile"}
             </Button>
          </CardContent>
        </form>
      </Form>
    </Card>
  );
}
