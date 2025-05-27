// src/app/api/links/route.ts
// src/app/api/links/route.ts
// src/app/api/links/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { createLink, getLinksByUserId } from '@/lib/linkService';
import { getUserIdFromRequest } from '@/lib/auth-utils';
import { debugLog } from '@/lib/logging';
import { LinkItem, CreateLinkData } from '@/types';
import { z } from 'zod'; // Removed ZodError as handleApiError will manage it
import { handleApiError, successResponse } from '@/lib/apiUtils';

// Define Zod schema for link creation
const createLinkSchema = z.object({
  originalUrl: z.string().url({ message: "Invalid URL format for originalUrl" }),
  slug: z.string().optional(), // Add more specific regex if needed, e.g., .regex(/^[a-zA-Z0-9_-]+$/)
  domainId: z.string().optional(), // Assuming UUID or specific format
  folderId: z.string().optional(), // Assuming format if applicable (e.g., string or number from DB)
  groupId: z.string().optional(),  // Assuming format
  title: z.string().max(255).optional(),
  isCloaked: z.boolean().optional(),
  // Define 'targets' more strictly if its structure is known, e.g., for A/B testing or geo-targeting
  // For now, allowing any array of objects for targets, but this should be refined.
  targets: z.array(z.object({
    url: z.string().url({ message: "Invalid URL format for target URL" }),
    // Potentially other fields per target: weight, country, etc.
  })).optional(), // Make targets itself optional, or .min(1) if at least one target is required when originalUrl is not primary
  // Add other fields from CreateLinkData as needed
  // e.g., deepLinkConfig: z.object(...).optional(),
  // abTestConfig: z.object(...).optional(),
  // rotation_start: z.string().datetime().optional(),
  // rotation_end: z.string().datetime().optional(),
  // click_limit: z.number().int().positive().optional(),
});


export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      // Use handleApiError for consistency, though this is a direct return
      return handleApiError({ message: 'Unauthorized' }, 'Unauthorized', 401);
    }

    const url = new URL(request.url);
    const folderId = url.searchParams.get('folderId') || undefined;

    const links: LinkItem[] = await getLinksByUserId(userId, folderId);
    return successResponse(links);
  } catch (error: any) {
    // console.error('Error fetching links:', error); // handleApiError will log
    return handleApiError(error, 'Error fetching links');
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return handleApiError({ message: 'Unauthorized' }, 'Unauthorized', 401);
    }

    const body = await request.json();
    
    // Validate with Zod
    const validationResult = createLinkSchema.safeParse(body);
    if (!validationResult.success) {
      // Pass ZodError directly to handleApiError
      return handleApiError(validationResult.error, 'Invalid link data.');
    }
    
    const linkData: CreateLinkData = validationResult.data as CreateLinkData;

    // Debug logging
    debugLog('Received validated linkData:', linkData);
    if (linkData.targets && linkData.targets.length > 0 && linkData.targets[0]) {
        debugLog('First target URL:', linkData.targets[0].url);
    } else if (linkData.originalUrl) {
        debugLog('Original URL:', linkData.originalUrl);
    }


    // Create the link
    const newLink = await createLink({ ...linkData, userId });
    return successResponse(newLink, 201);
  } catch (error: any) {
    // console.error('Error creating link:', error); // handleApiError will log
    return handleApiError(error, 'Error creating link');
  }
}