
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Server, Eye, ExternalLink } from "lucide-react";

export function LinkCloakingFeature() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShieldCheck className="mr-2 h-6 w-6 text-primary" />
            Understanding Link Cloaking (URL Masking)
          </CardTitle>
          <CardDescription>
            Keep your short link visible in the user's browser, even after they've reached the destination.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Link cloaking, often referred to as URL masking, is a technique where the original destination URL is hidden from the user in their browser's address bar. Instead, they continue to see your short link or custom domain. This is achieved by loading the destination website's content within an iframe or through a server-side proxy, effectively "masking" the true URL.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-1 flex items-center"><Server className="mr-1.5 h-4 w-4 text-primary" />How it Generally Works:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>User clicks your cloaked short link (e.g., <code>yourdomain.com/promo</code>).</li>
                <li>Your server fetches the content from the actual destination (e.g., <code>affiliate-site.com/product-page</code>).</li>
                <li>This content is then displayed to the user, but the address bar still shows <code>yourdomain.com/promo</code>.</li>
                <li>This is often done using an HTML iframe or server-side proxying.</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-1 flex items-center"><Eye className="mr-1.5 h-4 w-4 text-primary" />Key Considerations:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li><strong>Branding:</strong> Reinforces your brand by keeping your domain visible.</li>
                <li><strong>Affiliate Links:</strong> Can hide long or complex affiliate URLs.</li>
                <li><strong>Website Compatibility:</strong> Not all websites allow themselves to be iframed or cloaked (due to `X-Frame-Options` headers or frame-busting scripts). Test thoroughly.</li>
                <li><strong>SEO:</strong> May have SEO implications, as search engines might see duplicated content. Use with caution for SEO-critical pages.</li>
                <li><strong>User Experience:</strong> Some users might find it confusing if the address bar doesn't reflect the actual site.</li>
              </ul>
            </div>
          </div>
           <p className="text-sm text-muted-foreground pt-2">
            When you enable link cloaking for a link, LinkWiz will attempt to display the target URL's content while keeping your short link in the address bar. The success of this depends on the target website's security settings.
          </p>
        </CardContent>
      </Card>

      <div className="text-center p-8 border-2 border-dashed rounded-lg">
        <Image 
          src="https://picsum.photos/seed/linkcloak/400/250" 
          alt="Link Cloaking Illustration" 
          width={400} 
          height={250} 
          className="rounded-md mb-6 shadow-md mx-auto"
          data-ai-hint="browser mask"
        />
        <h3 className="text-xl font-semibold mb-2">Enable Link Cloaking</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-4">
          You can enable link cloaking in the advanced options when creating or editing a link. Toggle the "Link Cloaking" switch.
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

