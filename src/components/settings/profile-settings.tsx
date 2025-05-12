
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

const profileFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }).max(50, { message: "Full name must not exceed 50 characters."}),
  email: z.string().email({ message: "Please enter a valid email address." }),
  newPassword: z.string().optional().refine(value => !value || value.length >= 8, {
    message: "Password must be at least 8 characters long if provided.",
  }),
  confirmPassword: z.string().optional(),
  avatarUrl: z.string().optional(), // For storing avatar URL, actual upload not implemented
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Mock current user data
const currentUser = {
  fullName: "Current User",
  email: "user@linkwiz.com",
  avatarUrl: "https://picsum.photos/seed/user-settings/100/100",
};


export function ProfileSettings() {
  const { toast } = useToast();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: currentUser.fullName,
      email: currentUser.email,
      newPassword: "",
      confirmPassword: "",
      avatarUrl: currentUser.avatarUrl,
    },
    mode: "onChange",
  });

  // Placeholder for image upload state
  // const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser.avatarUrl);

  const onSubmit = (data: ProfileFormValues) => {
    console.log("Profile update data:", data);
    // In a real app, you would send this data to your backend
    toast({
      title: "Profile Updated",
      description: "Your profile information has been (mock) updated successfully.",
    });
  };

  // Placeholder for avatar change handler
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // This would handle file selection and upload in a real app
    // For now, it does nothing.
    if (event.target.files && event.target.files[0]) {
      // const file = event.target.files[0];
      // const reader = new FileReader();
      // reader.onloadend = () => {
      //   setAvatarPreview(reader.result as string);
      //   form.setValue("avatarUrl", reader.result as string); // Or store the file object for upload
      // };
      // reader.readAsDataURL(file);
      toast({
        title: "Avatar Change (Mock)",
        description: "Avatar upload functionality is not implemented in this demo.",
        variant: "default",
      })
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
                    <AvatarImage src={field.value || `https://picsum.photos/seed/${currentUser.email}/100/100`} data-ai-hint="profile picture" alt={form.getValues("fullName")} />
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
                      accept="image/*" 
                      onChange={handleAvatarChange} 
                    />
                    <p className="text-xs text-muted-foreground">JPG, GIF or PNG. 1MB max.</p>
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
             <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Updating..." : "Update Profile"}
             </Button>
          </CardContent>
        </form>
      </Form>
    </Card>
  );
}
