
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shuffle, ShieldCheck, MoveDiagonal, FlaskConical, Target, Tag, Settings2, Link as LinkIcon, Globe } from 'lucide-react';
import { addMockLink, getMockCustomDomains } from '@/lib/mock-data';
import type { CustomDomain } from '@/types';
import { useEffect, useState } from 'react';

const getShortenerDomain = (): string => {
  return process.env.NEXT_PUBLIC_LINK_SHORTENER_DOMAIN || 'lnk.wiz';
};


const urlInputFormSchema = z.object({
  urls: z.string().min(1, { message: 'Please enter at least one URL.' })
    .refine(value => {
      const lines = value.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      return lines.every(line => {
        try {
          // Check if it's a valid URL structure, but allow URLs without http/https for now.
          // The backend or a more specific validation step can enforce protocol.
          new URL(line.startsWith('http') ? line : `http://${line}`);
          return true;
        } catch (_) {
          return false;
        }
      });
    }, { message: 'One or more URLs are invalid. Please enter valid URLs, one per line.' }),
  customAlias: z.string().optional().refine(value => !value || /^[a-zA-Z0-9_-]+$/.test(value), {
    message: "Alias can only contain letters, numbers, underscores, and hyphens.",
  }),
  title: z.string().optional(),
  tags: z.string().optional(),
  customDomain: z.string().optional(), // For selected custom domain
  enableRotation: z.boolean().default(false).optional(),
  enableCloaking: z.boolean().default(false).optional(),
  enableDeepLinking: z.boolean().default(false).optional(),
  deepLinkIOS: z.string().optional(),
  deepLinkAndroid: z.string().optional(),
  enableABTesting: z.boolean().default(false).optional(),
  abTestVariantBUrl: z.string().optional().refine(value => {
    if (!value) return true;
    try {
      new URL(value.startsWith('http') ? value : `http://${value}`);
      return true;
    } catch (_) {
      return false;
    }
  }, { message: 'Variant B URL is invalid. Please enter a valid URL.' }),
  enableRetargeting: z.boolean().default(false).optional(),
  retargetingPixelId: z.string().optional(),
}).refine(data => {
  if (data.enableABTesting && !data.abTestVariantBUrl) {
    return false;
  }
  return true;
}, {
  message: "Variant B URL is required when A/B Testing is enabled.",
  path: ["abTestVariantBUrl"],
}).refine(data => {
    if (data.enableDeepLinking && !data.deepLinkIOS && !data.deepLinkAndroid) {
        return false;
    }
    return true;
}, {
    message: "At least one URI scheme (iOS or Android) is required for Deep Linking.",
    path: ["deepLinkIOS"], // Or a more general path if applicable
}).refine(data => {
    // If multiple URLs are provided and NOT enabling rotation,
    // and a custom alias is set, this is potentially ambiguous.
    // The description says alias applies to the first.
    // This refine is more for complex multi-url scenarios,
    // if specific restrictions beyond "alias for first" were needed.
    // For now, the described behavior is acceptable.
    return true;
});


type UrlInputFormValues = z.infer<typeof urlInputFormSchema>;

const defaultValues: Partial<UrlInputFormValues> = {
  urls: '',
  enableRotation: false,
  enableCloaking: false,
  enableDeepLinking: false,
  enableABTesting: false,
  enableRetargeting: false,
  deepLinkIOS: '',
  deepLinkAndroid: '',
  abTestVariantBUrl: '',
  retargetingPixelId: '',
  customAlias: '',
  title: '',
  tags: '',
  customDomain: 'default',
};

interface UrlInputFormProps {
  onLinkAdded?: () => void;
}

export function UrlInputForm({ onLinkAdded }: UrlInputFormProps) {
  const { toast } = useToast();
  const [verifiedDomains, setVerifiedDomains] = useState<CustomDomain[]>([]);
  const form = useForm<UrlInputFormValues>({
    resolver: zodResolver(urlInputFormSchema),
    defaultValues,
    mode: 'onChange',
  });
  const [shortenerDomain, setShortenerDomain] = useState('lnk.wiz');


  useEffect(() => {
    const domains = getMockCustomDomains();
    setVerifiedDomains(domains.filter(d => d.verified));
    setShortenerDomain(getShortenerDomain());
  }, []);

  async function onSubmit(data: UrlInputFormValues) {
    await new Promise(resolve => setTimeout(resolve, 300));

    const urlList = data.urls.split('\n').map(url => {
      let trimmedUrl = url.trim();
      if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        trimmedUrl = `https://${trimmedUrl}`;
      }
      return trimmedUrl;
    }).filter(Boolean);


    if (urlList.length === 0) {
      toast({
        title: 'No URLs Provided',
        description: 'Please enter at least one URL to shorten.',
        variant: 'destructive',
      });
      return;
    }
    
    let createdCount = 0;
    let errorMessages: string[] = [];

    const selectedCustomDomainName = data.customDomain === 'default' ? undefined : data.customDomain;

    const commonPropsForAddMockLink = {
      title: data.title,
      tags: data.tags,
      isCloaked: data.enableCloaking,
      deepLinkConfig: data.enableDeepLinking && (data.deepLinkIOS || data.deepLinkAndroid)
        ? { ios: data.deepLinkIOS || '', android: data.deepLinkAndroid || '' }
        : undefined,
      retargetingPixels: data.enableRetargeting && data.retargetingPixelId
        ? [{ platform: 'custom', pixelId: data.retargetingPixelId }] // Simplified structure
        : undefined,
      customDomain: selectedCustomDomainName,
    };

    try {
      if (data.enableRotation && urlList.length > 1) {
        // Single link with multiple targets for rotation
        addMockLink({
          destinationUrls: urlList,
          isRotation: true,
          isABTest: false,
          customAlias: data.customAlias,
          ...commonPropsForAddMockLink,
        });
        createdCount = 1;
      } else {
        // Multiple links OR a single link (potentially with A/B test)
        urlList.forEach((url, index) => {
          const isFirstUrlInBatch = index === 0;
          const applyCustomAlias = isFirstUrlInBatch ? data.customAlias : undefined;
          
          let currentDestinationUrls = [url];
          let isABTestForThisLink = false;

          if (isFirstUrlInBatch && data.enableABTesting && data.abTestVariantBUrl && !data.enableRotation) {
            let variantB = data.abTestVariantBUrl.trim();
            if (!variantB.startsWith('http://') && !variantB.startsWith('https://')) {
                variantB = `https://${variantB}`;
            }
            currentDestinationUrls.push(variantB);
            isABTestForThisLink = true;
          }

          addMockLink({
            destinationUrls: currentDestinationUrls,
            isRotation: false, // Rotation handled above
            isABTest: isABTestForThisLink,
            customAlias: applyCustomAlias,
            ...commonPropsForAddMockLink,
          });
          createdCount++;
        });
      }
    } catch (e: any) {
        errorMessages.push(e.message || "An unexpected error occurred while creating links.");
    }

    if (createdCount > 0) {
      toast({
        title: `${createdCount} Link${createdCount > 1 ? 's' : ''} Created!`,
        description: `Successfully generated ${createdCount} short link${createdCount > 1 ? 's' : ''}.`,
        variant: 'default',
      });
      form.reset();
      onLinkAdded?.();
    } else if (errorMessages.length > 0) {
       toast({
        title: 'Failed to Create Links',
        description: errorMessages.join(' '),
        variant: 'destructive',
      });
    } else if (urlList.length > 0){ // Only show this if URLs were provided but nothing created
       toast({
        title: 'No Links Created',
        description: 'Could not create any links. Please check your input and try again.',
        variant: 'destructive',
      });
    }
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <LinkIcon className="mr-2 h-6 w-6 text-primary" />
          Create New Links
        </CardTitle>
        <CardDescription>Enter URLs to shorten and configure advanced options.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="urls"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URLs (one per line, e.g., example.com or https://example.com)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="example.com/my-long-url-1&#10;https://another.com/my-long-url-2"
                      className="min-h-[100px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter one or more URLs. If multiple URLs are provided and URL Rotation is not enabled, a separate short link will be created for each. URLs without http(s) will default to https.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="basic-options">
                <AccordionTrigger className="text-base font-medium hover:no-underline">
                  <Settings2 className="mr-2 h-5 w-5" /> Basic Options
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  <FormField
                    control={form.control}
                    name="customAlias"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Alias (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="my-cool-link" {...field} />
                        </FormControl>
                         <FormDescription>If creating multiple links (not rotating), alias applies to the first URL only. Ignored if blank. Must be unique for the chosen domain.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link Title (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Summer Campaign Landing Page" {...field} />
                        </FormControl>
                        <FormDescription>For your internal reference. Applies to all created links in this submission.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center"><Tag className="mr-2 h-4 w-4" />Tags (Optional, comma-separated)</FormLabel>
                        <FormControl>
                          <Input placeholder="marketing, promo, q3" {...field} />
                        </FormControl>
                         <FormDescription>Applies to all created links in this submission.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customDomain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center"><Globe className="mr-2 h-4 w-4" />Custom Domain (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a domain" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="default">Default Domain ({shortenerDomain})</SelectItem>
                            {verifiedDomains.map(domain => (
                              <SelectItem key={domain.id} value={domain.domainName}>
                                {domain.domainName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Choose a verified custom domain for your short links. Defaults to the system domain.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="advanced-features">
                <AccordionTrigger className="text-base font-medium hover:no-underline">
                  <FlaskConical className="mr-2 h-5 w-5" /> Advanced Features
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-6">
                  <FormField
                    control={form.control}
                    name="enableRotation"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center"><Shuffle className="mr-2 h-4 w-4" />URL Rotation</FormLabel>
                          <FormDescription>
                            Rotate between the URLs provided in the main input (if multiple).
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(checked) => {
                                field.onChange(checked);
                                if (checked && form.getValues('enableABTesting')) {
                                    form.setValue('enableABTesting', false);
                                }
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="enableCloaking"
                    render={({ field }) => (
                       <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center"><ShieldCheck className="mr-2 h-4 w-4" />Link Cloaking</FormLabel>
                          <FormDescription>
                            Mask the destination URL in the browser. (May not work with all sites)
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="enableDeepLinking"
                    render={({ field }) => (
                      <FormItem className="rounded-lg border p-3 shadow-sm">
                        <div className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel className="flex items-center"><MoveDiagonal className="mr-2 h-4 w-4" />Deep Linking</FormLabel>
                            <FormDescription>
                              Redirect to specific content within mobile apps.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </div>
                        {form.watch('enableDeepLinking') && (
                          <div className="mt-4 space-y-2">
                            <FormField
                              control={form.control}
                              name="deepLinkIOS"
                              render={({ field: iosField }) => (
                                <FormItem>
                                  <FormLabel>iOS URI Scheme (Optional)</FormLabel>
                                  <FormControl><Input placeholder="yourapp://path/to/content" {...iosField} /></FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="deepLinkAndroid"
                              render={({ field: androidField }) => (
                                <FormItem>
                                  <FormLabel>Android URI Scheme (Optional)</FormLabel>
                                  <FormControl><Input placeholder="yourapp://path/to/content" {...androidField} /></FormControl>
                                </FormItem>
                              )}
                            />
                             <FormMessage>{form.formState.errors.deepLinkIOS?.message || form.formState.errors.root?.message}</FormMessage>
                          </div>
                        )}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="enableABTesting"
                    render={({ field }) => (
                      <FormItem className="rounded-lg border p-3 shadow-sm">
                        <div className="flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                            <FormLabel className="flex items-center"><FlaskConical className="mr-2 h-4 w-4" />A/B Testing</FormLabel>
                            <FormDescription>
                                Split traffic between primary URL and Variant B. (URL Rotation must be off).
                            </FormDescription>
                            </div>
                            <FormControl>
                            <Switch
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    if (checked && form.getValues('enableRotation')) {
                                        form.setValue('enableRotation', false);
                                    }
                                }}
                                disabled={form.watch('enableRotation')}
                            />
                            </FormControl>
                        </div>
                        {form.watch('enableABTesting') && !form.watch('enableRotation') && (
                            <>
                            <FormField
                            control={form.control}
                            name="abTestVariantBUrl"
                            render={({ field: variantBField }) => (
                                <FormItem className="mt-4">
                                <FormLabel>Variant B URL</FormLabel>
                                <FormControl><Input placeholder="example.com/variant-b" {...variantBField} /></FormControl>
                                 <FormDescription>If multiple URLs in main input, A/B test applies to the first URL against this Variant B. URLs without http(s) default to https.</FormDescription>
                                 <FormMessage />
                                </FormItem>
                            )}
                            />
                            </>
                        )}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="enableRetargeting"
                    render={({ field }) => (
                      <FormItem className="rounded-lg border p-3 shadow-sm">
                        <div className="flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                            <FormLabel className="flex items-center"><Target className="mr-2 h-4 w-4" />Link Retargeting</FormLabel>
                            <FormDescription>
                                Add retargeting pixels to this link/these links.
                            </FormDescription>
                            </div>
                            <FormControl>
                            <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                            </FormControl>
                        </div>
                        {form.watch('enableRetargeting') && (
                            <FormField
                            control={form.control}
                            name="retargetingPixelId"
                            render={({ field: pixelField }) => (
                                <FormItem className="mt-4">
                                <FormLabel>Pixel ID (e.g., Facebook Pixel ID)</FormLabel>
                                <FormControl><Input placeholder="Enter Pixel ID" {...pixelField} /></FormControl>
                                </FormItem>
                            )}
                            />
                        )}
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full md:w-auto" disabled={form.formState.isSubmitting || !form.formState.isValid && form.formState.isSubmitted}>
              {form.formState.isSubmitting ? 'Processing...' : 'Generate Links'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
