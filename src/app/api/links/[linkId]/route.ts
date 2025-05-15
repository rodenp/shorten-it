
import { NextResponse } from 'next/server';
import {
  getLinkById,
  getLinkBySlug, // Import the new function
  updateLink,
  deleteLink,
} from '@/lib/linkService';
import { getUserIdFromRequest } from '@/lib/auth-utils';

// Basic UUID check (can be refined)
const isUUID = (str: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

// GET /api/links/[linkIdentifier] - can be an ID or a slug
export async function GET(request: Request, context: { params: { linkId: string } }) {
  let linkIdentifierForError = "unknown";
  try {
    const resolvedParams = await context.params; // Await the params
    const { linkId: linkIdentifier } = resolvedParams;
    linkIdentifierForError = linkIdentifier; // Assign for use in catch block

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let link = null;

    // Try fetching by ID if it looks like a UUID
    if (isUUID(linkIdentifier)) {
      link = await getLinkById(linkIdentifier, userId);
    }
    
    // If not found by ID (or if it didn't look like a UUID), try by slug
    if (!link) {
      link = await getLinkBySlug(linkIdentifier, userId);
    }

    if (!link) {
      return NextResponse.json({ message: 'Link not found or not authorized' }, { status: 404 });
    }
    return NextResponse.json(link);
  } catch (error: any) {
    console.error(`Error fetching link ${linkIdentifierForError}:`, error);
    return NextResponse.json({ message: error.message || 'Error fetching link' }, { status: 500 });
  }
}

// PUT /api/links/[linkId] - This should still expect a true ID for updates
export async function PUT(request: Request, context: { params: { linkId: string } }) {
  let linkIdForError = "unknown";
  try {
    const resolvedParams = await context.params; // Await the params
    const { linkId } = resolvedParams;
    linkIdForError = linkId; // Assign for use in catch block

    // Add a check to ensure linkId is a UUID for PUT operations if necessary
    if (!isUUID(linkId)) {
      return NextResponse.json({ message: 'Invalid link ID format for update' }, { status: 400 });
    }
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const updates = await request.json();

    const updatedLink = await updateLink(linkId, userId, updates);

    if (!updatedLink) {
      return NextResponse.json({ message: 'Link not found or update failed' }, { status: 404 });
    }
    return NextResponse.json(updatedLink);
  } catch (error: any) {
    console.error(`Error updating link ${linkIdForError}:`, error);
     const statusCode = error.message?.includes('not found') ? 404 : error.message?.includes('already taken')? 409: 500;
    return NextResponse.json({ message: error.message || 'Error updating link' }, { status: statusCode });
  }
}

// DELETE /api/links/[linkId] - This should still expect a true ID for deletions
export async function DELETE(request: Request, context: { params: { linkId: string } }) {
  let linkIdForError = "unknown";
  try {
    const resolvedParams = await context.params; // Await the params
    const { linkId } = resolvedParams;
    linkIdForError = linkId; // Assign for use in catch block

    // Add a check to ensure linkId is a UUID for DELETE operations if necessary
    if (!isUUID(linkId)) {
      return NextResponse.json({ message: 'Invalid link ID format for delete' }, { status: 400 });
    }
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const success = await deleteLink(linkId, userId);

    if (!success) {
      return NextResponse.json({ message: 'Link not found or could not be deleted' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Link deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error(`Error deleting link ${linkIdForError}:`, error);
    return NextResponse.json({ message: error.message || 'Error deleting link' }, { status: 500 });
  }
}
