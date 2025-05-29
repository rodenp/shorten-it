
import { NextResponse, NextRequest } from 'next/server'; // Added NextRequest
import {
  getLinkById,
  getLinkBySlug,
  updateLink,
  deleteLink,
} from '@/lib/linkService';
import { getUserIdFromRequest } from '@/lib/auth-utils';
// import { debug } from 'console'; // 'debug' from console is not typically used this way.
                                  // Use debugLog from '@/lib/logging' if needed.
import { handleApiError, successResponse, noContentResponse } from '@/lib/apiUtils';
import { z } from 'zod'; // For potential input validation in PUT/PATCH

// Basic UUID check (can be refined)
const isUUID = (str: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

// Define Zod schema for link updates (PATCH). Should allow partial updates.
// This would mirror parts of createLinkSchema but with all fields optional.
// For simplicity, we'll assume the `updateLink` service handles partial data well.
// A more robust implementation would define a specific patchSchema.
const patchLinkSchema = z.object({
  originalUrl: z.string().url({ message: "Invalid URL format for originalUrl" }).optional(),
  slug: z.string().optional(),
  domainId: z.string().optional(),
  folderId: z.string().optional(),
  groupId: z.string().optional(),
  title: z.string().max(255).optional(),
  isCloaked: z.boolean().optional(),
  targets: z.array(z.object({
    url: z.string().url({ message: "Invalid URL format for target URL" }),
  })).optional(),
  // Add other updatable fields as optional
}).partial().refine(obj => Object.keys(obj).length > 0, { message: "At least one field must be provided for update." });


// GET /api/links/[linkIdentifier] - can be an ID or a slug
export async function GET(request: NextRequest, context: { params: { linkId: string } }) {
  try {
    const { linkId: linkIdentifier } = context.params;

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return handleApiError({ message: 'Unauthorized' }, 'Unauthorized', 401);
    }

    let link = null;
    if (isUUID(linkIdentifier)) {
      link = await getLinkById(linkIdentifier, userId);
    }
    if (!link) { // If not found by ID or not a UUID, try by slug
      link = await getLinkBySlug(linkIdentifier, userId);
    }

    if (!link) {
      return handleApiError({ message: 'Link not found or not authorized' }, 'Link not found', 404);
    }
    // Conceptual PII Masking/Selective Logging:
    // Instead of: debugLog(`Fetched link ${linkIdentifier}:`, link);
    // Log only specific, non-sensitive fields or a masked version for production debugging if needed.
    // For example:
    // debugLog(`Fetched link details for ID ${link.id}: originalUrl (first 30 chars): ${link.originalUrl.substring(0,30)}, slug: ${link.slug}`);
    // Or if link object could contain user PII directly that needs masking:
    // const maskedLink = { ...link, originalUrl: maskUrlPII(link.originalUrl) }; // Assuming maskUrlPII utility
    // For this example, we'll just log selected fields for brevity.
    // debugLog(`Fetched link ID ${link.id}, Slug: ${link.slug}, DomainID: ${link.domainId}`);
    // The original debugLog was removed in a previous step, so this is more about where it *would* go.
    // For now, actual logging of the full link object is part of successResponse if NODE_ENV is development by Next.js.
    // The handleApiError also logs the full error in dev.
    // This comment serves as the conceptual demonstration for PII masking in logging.
    return successResponse(link);
  } catch (error: any) {
    return handleApiError(error, 'Error fetching link');
  }
}

// PUT /api/links/[linkId] - Expects a full update (or use PATCH for partial)
export async function PUT(request: NextRequest, context: { params: { linkId: string } }) {
  try {
    const { linkId } = context.params;

    if (!isUUID(linkId)) {
      return handleApiError({ message: 'Invalid link ID format for update' }, 'Invalid link ID', 400);
    }
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return handleApiError({ message: 'Unauthorized' }, 'Unauthorized', 401);
    }
    
    const body = await request.json();
    // For PUT, you might use a schema similar to createLinkSchema if you expect all fields for replacement
    // Or a more specific PUT schema. Here, using patchLinkSchema for flexibility but ensuring it's not empty.
    const validationResult = patchLinkSchema.safeParse(body); 
    if (!validationResult.success) {
      return handleApiError(validationResult.error, 'Invalid link data.');
    }
    const updates = validationResult.data;

    const updatedLink = await updateLink(linkId, userId, updates);

    if (!updatedLink) {
      return handleApiError({ message: 'Link not found or update failed' }, 'Update failed', 404);
    }
    return successResponse(updatedLink);
  } catch (error: any) {
    return handleApiError(error, 'Error updating link');
  }
}

// PATCH /api/links/[linkId] - For partial updates
export async function PATCH(request: NextRequest, context: { params: { linkId: string } }) {
  try {
    const { linkId } = context.params;

    if (!isUUID(linkId)) {
      return handleApiError({ message: 'Invalid link ID format for update' }, 'Invalid link ID', 400);
    }
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return handleApiError({ message: 'Unauthorized' }, 'Unauthorized', 401);
    }
    
    const body = await request.json();
    const validationResult = patchLinkSchema.safeParse(body);
    if (!validationResult.success) {
      return handleApiError(validationResult.error, 'Invalid link data.');
    }
    const updates = validationResult.data;

    const updatedLink = await updateLink(linkId, userId, updates); // updateLink should handle partial updates

    if (!updatedLink) {
      return handleApiError({ message: 'Link not found or update failed' }, 'Update failed', 404);
    }
    return successResponse(updatedLink);
  } catch (error: any) {
    return handleApiError(error, 'Error updating link');
  }
}

// DELETE /api/links/[linkId]
export async function DELETE(request: NextRequest, context: { params: { linkId: string } }) {
  try {
    const { linkId } = context.params;

    if (!isUUID(linkId)) {
      return handleApiError({ message: 'Invalid link ID format for delete' }, 'Invalid link ID', 400);
    }
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return handleApiError({ message: 'Unauthorized' }, 'Unauthorized', 401);
    }
    
    const success = await deleteLink(linkId, userId);

    if (!success) {
      return handleApiError({ message: 'Link not found or could not be deleted' }, 'Deletion failed', 404);
    }
    return noContentResponse(); // Use 204 No Content for successful deletion
  } catch (error: any) {
    return handleApiError(error, 'Error deleting link');
  }
}
