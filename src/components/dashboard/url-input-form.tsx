
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { debugLog, debugWarn } from '@/lib/logging';
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
import { Shuffle, ShieldCheck, MoveDiagonal, FlaskConical, Target, Tag, Settings2, Link as LinkIcon, Globe, Percent, FolderKanban } from 'lucide-react';
import { getShortenerDomain } from '@/lib/mock-data'; 
import type { CustomDomain, LinkGroup, RetargetingPixel, LinkTarget, LinkItem } from '@/types';
import { useEffect, useState } from 'react';
import { Slider } from '@/components/ui/slider';

interface CreateLinkPayload {
  originalUrl: string;
  targets: LinkTarget[];
  slug?: string;
  title?: string;
  tags?: string[];
  isCloaked?: boolean;
  customDomainId?: string;
  groupId?: string;
  deepLinkConfig?: LinkItem['deepLinkConfig'];
  abTestConfig?: LinkItem['abTestConfig'];
  retargetingPixelIds?: string[];
}

const urlInputFormSchema = z.object({
  urls: z.string().min(1, { message: 'Please enter at least one URL for Variant A or for rotation.' })
    .refine(value => {
      const lines = value.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      return lines.every(line => {
        try {
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
  groupId: z.string().optional(),
  customDomainId: z.string().optional(),
  enableRotation: z.boolean().default(false).optional(),
  enableCloaking: z.boolean().default(false).optional(),
  enableDeepLinking: z.boolean().default(false).optional(),
  deepLinkIOS: z.string().optional(),
  deepLinkAndroid: z.string().optional(),
  deepLinkFallbackUrl: z.string().optional(),
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
  abTestSplitPercentage: z.number().min(0).max(100).default(50).optional(),
  enableRetargeting: z.boolean().default(false).optional(),
  selectedRetargetingPixelId: z.string().optional(),
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
    path: ["deepLinkIOS"], 
}).refine(data => {
    if (data.enableRotation && data.enableABTesting) {
        return false;
    }
    return true;
}, {
    message: "URL Rotation and A/B Testing cannot be enabled at the same time for a single link.",
    path: ["enableABTesting"], 
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
  deepLinkFallbackUrl: '',
  abTestVariantBUrl: '',
  abTestSplitPercentage: 50,
  selectedRetargetingPixelId: 'none',
  customAlias: '',
  title: '',
  tags: '',
  groupId: 'none',
  customDomainId: 'default',
};

interface UrlInputFormProps {
  onLinkAdded?: () => void;
}

export function UrlInputForm({ onLinkAdded }: UrlInputFormProps) {
  const { toast } = useToast();
  const [customDomains, setCustomDomains] = useState<CustomDomain[]>([]);
  const [linkGroups, setLinkGroups] = useState<LinkGroup[]>([]);
  const [retargetingPixels, setRetargetingPixels] = useState<RetargetingPixel[]>([]);
  const form = useForm<UrlInputFormValues>({
    resolver: zodResolver(urlInputFormSchema),
    defaultValues,
    mode: 'onChange',
  });
  const [globalShortenerDomain, setGlobalShortenerDomain] = useState('your.domain');

  useEffect(() => {
    setGlobalShortenerDomain(getShortenerDomain());

    const fetchData = async () => {
      try {
        const [domainsRes, groupsRes, pixelsRes] = await Promise.all([
          fetch('/api/custom-domains'),
          fetch('/api/link-groups'),
          fetch('/api/retargeting-pixels')
        ]);

        if (domainsRes.ok) {
          const domainsData = await domainsRes.json();
          setCustomDomains(domainsData.filter((d: CustomDomain) => d.verified));
        } else {
          console.error('Failed to fetch custom domains');
        }
        if (groupsRes.ok) {
          setLinkGroups(await groupsRes.json());
        } else {
          console.error('Failed to fetch link groups');
        }
        if (pixelsRes.ok) {
          setRetargetingPixels(await pixelsRes.json());
        } else {
          console.error('Failed to fetch retargeting pixels');
        }
      } catch (error) {
        console.error('Error fetching initial data for form:', error);
        toast({ title: 'Error', description: 'Could not load necessary data for the form.', variant: 'destructive' });
      }
    };
    fetchData();
  }, [toast]);

  async function onSubmit(data: UrlInputFormValues) {
    const urlLines = data.urls.split('\n').map(url => {
      let trimmedUrl = url.trim();
      if (trimmedUrl && !trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        trimmedUrl = `https://${trimmedUrl}`;
      }
      return trimmedUrl;
    }).filter(Boolean);

    if (urlLines.length === 0) {
      toast({ title: 'No URLs Provided', description: 'Please enter at least one URL.', variant: 'destructive' });
      return;
    }

    const payload: Partial<CreateLinkPayload> = {
      title: data.title || undefined,
      slug: data.customAlias || undefined,
      tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      isCloaked: data.enableCloaking,
      customDomainId: data.customDomainId === 'default' ? undefined : data.customDomainId,
      groupId: data.groupId === 'none' ? undefined : data.groupId,
      retargetingPixelIds: data.enableRetargeting && data.selectedRetargetingPixelId !== 'none' ? [data.selectedRetargetingPixelId as string] : undefined,
    };

    if (data.enableDeepLinking) {
      payload.deepLinkConfig = {
        iosAppUriScheme: data.deepLinkIOS || '',
        androidAppUriScheme: data.deepLinkAndroid || '',
        fallbackUrl: data.deepLinkFallbackUrl || undefined,
      };
    }
    
    let primaryUrl = urlLines[0];
    let linkTargets: LinkTarget[] = [];

    if (data.enableABTesting && data.abTestVariantBUrl) {
      let variantB = data.abTestVariantBUrl.trim();
      if (variantB && !variantB.startsWith('http://') && !variantB.startsWith('https://')) {
        variantB = `https://${variantB}`;
      }
      payload.abTestConfig = {
        variantAUrl: primaryUrl,
        variantBUrl: variantB,
        splitPercentage: data.abTestSplitPercentage || 50,
      };
      linkTargets = [
        { url: primaryUrl, weight: data.abTestSplitPercentage || 50 },
        { url: variantB, weight: 100 - (data.abTestSplitPercentage || 50) },
      ];
    } else if (data.enableRotation && urlLines.length > 0) {
      const numUrls = urlLines.length;
      let baseWeight = Math.floor(100 / numUrls);
      let remainder = 100 % numUrls;
      linkTargets = urlLines.map((url, index) => {
        let weight = baseWeight + (index < remainder ? 1 : 0);
        return { url, weight };
      });
      primaryUrl = urlLines[0]; // This will be the originalUrl even in rotation mode
    } else {
      linkTargets = [{ url: primaryUrl, weight: 100 }];
    }

    payload.originalUrl = primaryUrl;
    payload.targets = linkTargets;

    // Log the payload just before sending
    debugLog("Payload being sent to /api/links:", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create link.');
      }

      toast({
        title: 'Link Created!',
        description: `Successfully generated: ${result.shortUrl}`,
        variant: 'default',
      });
      form.reset(defaultValues); 
      onLinkAdded?.();

    } catch (error: any) {
      toast({
        title: 'Error Creating Link',
        description: error.message,
        variant: 'destructive',
      });
    }
  }
  
  const enableRotation = form.watch('enableRotation');
  const enableABTesting = form.watch('enableABTesting');

  // Also update the Zod schema to split by newline for validation
  // (This was already correct in your provided code for refine, just re-stating for completeness)

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <LinkIcon className="mr-2 h-6 w-6 text-primary" />
          Create New Link
        </CardTitle>
        <CardDescription>Enter a URL to shorten and configure advanced options. For multiple URLs without rotation/A/B testing, only the first will be used.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="urls"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {enableABTesting ? 'Variant A URL (Primary)' : (enableRotation ? 'URLs for Rotation (one per line)' : 'URL (Primary Destination)')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={enableABTesting ? "example.com/variant-a" : (enableRotation ? "example.com/path1\nexample.com/path2" : "example.com/my-long-url")}
                      className="min-h-[100px] resize-y"
                      {...field}
                      rows={(enableABTesting || (!enableRotation && !enableABTesting)) ? 1 : undefined} 
                    />
                  </FormControl>
                  <FormDescription>
                    {enableABTesting 
                      ? "Enter the primary URL for your A/B test (Variant A)."
                      : (enableRotation 
                          ? "Enter multiple URLs for rotation, one per line."
                          : "Enter the primary destination URL. If multiple lines are entered, only the first will be used unless rotation is enabled.")
                    }
                    URLs without http(s) will default to https.
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
                         <FormDescription>If left blank, a random slug will be generated. Must be unique for the chosen domain.</FormDescription>
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
                        <FormDescription>For your internal reference.</FormDescription>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="groupId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center"><FolderKanban className="mr-2 h-4 w-4" />Link Group (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'none'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a group" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Group</SelectItem>
                            {linkGroups.map(group => (
                              <SelectItem key={group.id} value={group.id}>
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Assign this link to a group for organization.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customDomainId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center"><Globe className="mr-2 h-4 w-4" />Custom Domain (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'default'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a domain" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="default">Default Domain ({globalShortenerDomain})</SelectItem>
                            {customDomains.map(domain => (
                              <SelectItem key={domain.id} value={domain.id}>
                                {domain.domainName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Choose a verified custom domain for your short link.</FormDescription>
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
                            Rotate between multiple URLs provided in the main URL input. (Disables A/B Testing)
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
                            disabled={enableABTesting}
                          />
                        </FormControl>
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
                                Split traffic between Variant A (from main URL input) and Variant B. (Disables URL Rotation)
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
                                    const urlsField = form.getValues('urls');
                                    const currentUrls = urlsField.split('\n').filter(Boolean); // Corrected split here too for UI logic
                                    if (checked && currentUrls.length > 1) {
                                        form.setValue('urls', currentUrls[0]);
                                        toast({title: "Info", description: "A/B testing uses the first URL as Variant A. Other URLs removed.", variant: "default"});
                                    }
                                }}
                                disabled={enableRotation}
                            />
                            </FormControl>
                        </div>
                        {form.watch('enableABTesting') && !form.watch('enableRotation') && (
                            <div className="mt-4 space-y-4">
                                <FormField
                                control={form.control}
                                name="abTestVariantBUrl"
                                render={({ field: variantBField }) => (
                                    <FormItem>
                                    <FormLabel>Variant B URL</FormLabel>
                                    <FormControl><Input placeholder="example.com/variant-b" {...variantBField} /></FormControl>
                                    <FormDescription>Enter the URL for Variant B. URLs without http(s) default to https.</FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                                <FormField
                                control={form.control}
                                name="abTestSplitPercentage"
                                render={({ field: sliderField }) => (
                                    <FormItem>
                                    <FormLabel className="flex items-center">
                                        <Percent className="mr-2 h-4 w-4" />
                                        Traffic Split for Variant A ({sliderField.value || 50}%)
                                    </FormLabel>
                                    <div className="flex items-center gap-2">
                                        <Slider
                                            defaultValue={[50]}
                                            max={100}
                                            step={1}
                                            className="w-[calc(100%-4rem)]"
                                            onValueChange={(value) => sliderField.onChange(value[0])}
                                            value={[sliderField.value || 50]}
                                        />
                                        <span className="w-12 text-right">({100-(sliderField.value || 50)}% to B)</span>
                                    </div>
                                    <FormDescription>Adjust the traffic percentage for Variant A. The remainder goes to Variant B.</FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            </div>
                        )}
                         {form.formState.errors.enableABTesting && <FormMessage>{form.formState.errors.enableABTesting.message}</FormMessage>}
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
                                  <FormControl><Input placeholder="yourapp://product/123" {...iosField} /></FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="deepLinkAndroid"
                              render={({ field: androidField }) => (
                                <FormItem>
                                  <FormLabel>Android URI Scheme (Optional)</FormLabel>
                                  <FormControl><Input placeholder="yourapp://product/123" {...androidField} /></FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="deepLinkFallbackUrl"
                              render={({ field: fallbackField }) => (
                                <FormItem>
                                  <FormLabel>Fallback URL (Optional)</FormLabel>
                                  <FormControl><Input placeholder="https://example.com/fallback" {...fallbackField} /></FormControl>
                                   <FormDescription>If app is not installed, redirect to this web URL. Defaults to App/Play Store if not set.</FormDescription>
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
                    name="enableRetargeting"
                    render={({ field }) => (
                      <FormItem className="rounded-lg border p-3 shadow-sm">
                        <div className="flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                            <FormLabel className="flex items-center"><Target className="mr-2 h-4 w-4" />Link Retargeting</FormLabel>
                            <FormDescription>
                                Add retargeting pixels to this link.
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
                            name="selectedRetargetingPixelId"
                            render={({ field: pixelField }) => (
                                <FormItem className="mt-4">
                                <FormLabel>Select Retargeting Pixel</FormLabel>
                                <Select onValueChange={pixelField.onChange} value={pixelField.value || 'none'}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a pixel to apply" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">No Pixel</SelectItem>
                                        {retargetingPixels.map(pixel => (
                                        <SelectItem key={pixel.id} value={pixel.id}>
                                            {pixel.name} ({pixel.type})
                                        </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormDescription>Choose an existing retargeting pixel to attach to this link.</FormDescription>
                                <FormMessage />
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
            <Button type="submit" className="w-full md:w-auto" disabled={form.formState.isSubmitting || (!form.formState.isValid && form.formState.isSubmitted)}>
              {form.formState.isSubmitting ? 'Processing...' : 'Generate Link'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
