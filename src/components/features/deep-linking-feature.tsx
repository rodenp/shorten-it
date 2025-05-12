
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import Image from 'next/image';
import { Smartphone, AppWindow, ExternalLink, Settings2 } from "lucide-react";

export function DeepLinkingFeature() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Smartphone className="mr-2 h-6 w-6 text-primary" />
            Understanding Deep Linking
          </CardTitle>
          <CardDescription>
            Guide users directly to specific content within your mobile applications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Deep linking creates a seamless user experience by taking users who click your short link directly to a specific page or content within your native iOS or Android app. If the app isn't installed, you can define fallback behavior, such as redirecting them to the App Store, Google Play Store, or a specific web URL.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-1 flex items-center"><AppWindow className="mr-1.5 h-4 w-4 text-primary" />How it Works:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>You provide URI schemes for your iOS and Android apps (e.g., <code>yourapp://product/123</code>).</li>
                <li>When a user clicks the link, the system checks if the app is installed.</li>
                <li>If installed, the user is taken directly to the specified content in the app.</li>
                <li>If not installed, they are typically redirected to a fallback URL (often the app store page or your website).</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-1 flex items-center"><Settings2 className="mr-1.5 h-4 w-4 text-primary" />Key Benefits:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Enhances user experience for mobile users.</li>
                <li>Improves app engagement and conversion rates.</li>
                <li>Essential for mobile marketing campaigns (e.g., email, social media).</li>
                <li>Allows seamless transition from web to app.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center p-8 border-2 border-dashed rounded-lg">
        <Image 
          src="https://picsum.photos/seed/deeplinkpath/400/250" 
          alt="Deep Linking Illustration" 
          width={400} 
          height={250} 
          className="rounded-md mb-6 shadow-md mx-auto"
          data-ai-hint="mobile app path"
        />
        <h3 className="text-xl font-semibold mb-2">Enable Deep Linking for Your Links</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-4">
          You can enable deep linking and specify your app's URI schemes when creating or editing a link. Look for the "Deep Linking" option in the advanced settings.
        </p>
        <Button asChild>
          <Link href="/dashboard" className="flex items-center">
            <ExternalLink className="mr-2 h-4 w-4" />
            Go to Dashboard to Create a Link
          </Link>
        </Button>
      </div>
    </div>
  );
}
