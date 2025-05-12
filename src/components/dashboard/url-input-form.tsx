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
import { Shuffle, ShieldCheck, MoveDiagonal, FlaskConical, Target, Tag, Settings2, Link as LinkIcon } from 'lucide-react';
import { addMockLink } from '@/lib/mock-data';

const urlInputFormSchema = z.object({
  urls: z.string().min(1, { message: 'Please enter at least one URL.' })
    .refine(value => {
      const lines = value.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      return lines.every(line => {
        try {
          const url = new URL(line);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch (_) {
          return false;
        }
      });
    }, { message: 'One or more URLs are invalid. Please enter valid URLs (starting with http:// or https://), one per line.' }),
  customAlias: z.string().optional().refine(value => !value || /^[a-zA-Z0-9_-]+$/.test(value), {
    message: "Alias can only contain letters, numbers, underscores, and hyphens.",
  }),
  title: z.string().optional(),
  tags: z.string().optional(), // Will be comma-separated string
  enableRotation: z.boolean().default(false).optional(),
  enableCloaking: z.boolean().default(false).optional(),
  enableDeepLinking: z.boolean().default(false).optional(),
  deepLinkIOS: z.string().optional(),
  deepLinkAndroid: z.string().optional(),
  enableABTesting: z.boolean().default(false).optional(),
  abTestVariantBUrl: z.string().optional().refine(value => {
    if (!value) return true; // Optional field
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
      return false;
    }
  }, { message: 'Variant B URL is invalid. Please enter a valid URL (starting with http:// or https://).' }),
  enableRetargeting: z.boolean().default(false).optional(),
  retargetingPixelId: z.string().optional(),
}).refine(data => {
  // If A/B testing is enabled, Variant B URL must be provided
  if (data.enableABTesting && !data.abTestVariantBUrl) {
    return false;
  }
  return true;
}, {
  message: "Variant B URL is required when A/B Testing is enabled.",
  path: ["abTestVariantBUrl"], // Field to highlight for the error
}).refine(data => {
    // If deep linking is enabled, at least one URI scheme should be provided
    if (data.enableDeepLinking && !data.deepLinkIOS && !data.deepLinkAndroid) {
        return false;
    }
    return true;
}, {
    message: "At least one URI scheme (iOS or Android) is required for Deep Linking.",
    path: ["deepLinkIOS"], // Arbitrarily point to one, or make a custom error display
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
};

interface UrlInputFormProps {
  onLinkAdded?: () => void;
}

export function UrlInputForm({ onLinkAdded }: UrlInputFormProps) {
  const { toast } = useToast();
  const form = useForm<UrlInputFormValues>({
    resolver: zodResolver(urlInputFormSchema),
    defaultValues,
    mode: 'onChange', // Or 'onSubmit'
  });

  async function onSubmit(data: UrlInputFormValues) {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API call

    const urlList = data.urls.split('\n').map(url => url.trim()).filter(Boolean);
    let createdCount = 0;

    const commonPropsForAddMockLink = {
      title: data.title,
      tags: data.tags,
      isCloaked: data.enableCloaking,
      enableDeepLinking: data.enableDeepLinking,
      deepLinkIOS: data.deepLinkIOS,
      deepLinkAndroid: data.deepLinkAndroid,
      enableRetargeting: data.enableRetargeting,
      retargetingPixelId: data.retargetingPixelId,
    };

    if (data.enableRotation && urlList.length > 1) {
      // Single link with URL rotation
      addMockLink({
        destinationUrls: urlList,
        isRotation: true,
        isABTest: false, // Rotation and A/B Testing are mutually exclusive per form logic
        customAlias: data.customAlias, // Alias applies to this single rotated link
        ...commonPropsForAddMockLink,
      });
      createdCount = 1;
    } else {
      // Create separate links for each URL, or one link if only one URL
      urlList.forEach((url, index) => {
        const isFirstUrlInBatch = index === 0;
        // A/B test only for the first URL in the list if multiple individual links are created,
        // and A/B testing is enabled, and Variant B URL is provided.
        const enableABTestForThisLink = isFirstUrlInBatch && data.enableABTesting && !!data.abTestVariantBUrl;
        
        let currentDestinationUrls = [url];
        if (enableABTestForThisLink && data.abTestVariantBUrl) {
            currentDestinationUrls.push(data.abTestVariantBUrl);
        }

        addMockLink({
          destinationUrls: currentDestinationUrls,
          isRotation: false, // Rotation is handled by the block above
          isABTest: enableABTestForThisLink,
          customAlias: isFirstUrlInBatch ? data.customAlias : undefined, // Alias only for the first link
          ...commonPropsForAddMockLink,
        });
        createdCount++;
      });
    }
    
    if (createdCount > 0) {
      toast({
        title: `${createdCount} Link${createdCount > 1 ? 's' : ''} Created!`,
        description: `Successfully generated ${createdCount} short link${createdCount > 1 ? 's' : ''}.`,
        variant: 'default',
      });
      form.reset(); // Reset form to default values
      onLinkAdded?.(); // Callback to refresh dashboard or link list
    } else if (urlList.length > 0) { // If URLs were provided but nothing created (should not happen with current logic)
       toast({
        title: 'Failed to Create Links',
        description: 'Could not create any links. Please check your input and try again.',
        variant: 'destructive',
      });
    }
    // If urlList is empty, no toast is shown, which is fine as validation should catch it.
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
                  <FormLabel>URLs (one per line, e.g., https://example.com)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="https://example.com/my-long-url-1&#10;https://example.com/my-long-url-2"
                      className="min-h-[100px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter one or more URLs. If multiple URLs are provided and URL Rotation is not enabled, a separate short link will be created for each URL using other settings.
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
                         <FormDescription>If creating multiple links (not rotating), alias applies to the first URL only. Ignored if blank.</FormDescription>
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
                                    form.setValue('enableABTesting', false); // A/B testing off if rotation is on
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
                            Mask the destination URL in the browser.
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
                             <FormMessage>{form.formState.errors.deepLinkIOS?.message || form.formState.errors.root?.deepLinkIOS?.message}</FormMessage>
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
                                        form.setValue('enableRotation', false); // Rotation off if A/B is on
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
                                <FormControl><Input placeholder="https://example.com/variant-b" {...variantBField} /></FormControl>
                                 <FormDescription>If multiple URLs in main input, A/B test applies to the first URL against this Variant B.</FormDescription>
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
            <Button type="submit" className="w-full md:w-auto" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Processing...' : 'Generate Links'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
