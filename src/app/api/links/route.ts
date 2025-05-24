// src/app/api/links/route.ts
import { NextResponse } from 'next/server';
import { createLink, getLinksByUserId } from '@/lib/linkService';
import { getUserIdFromRequest } from '@/lib/auth-utils';
import { debugLog } from '@/lib/logging';
import { LinkItem } from '@/types';

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Support optional folderId query parameter
    const url = new URL(request.url);
    const folderId = url.searchParams.get('folderId') || undefined;

    const links: LinkItem[] = await getLinksByUserId(userId, folderId);
    return NextResponse.json(links);
  } catch (error: any) {
    console.error('Error fetching links:', error);
    return NextResponse.json(
      { message: error.message || 'Error fetching links' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const linkData = await request.json(); // Expects CreateLinkData shape

    // Debug logging
    debugLog('Received linkData:', linkData);
    if (linkData.targets && linkData.targets.length) {
      debugLog('First target URL:', linkData.targets[0]?.url);
    }

    // Validate required fields
    if (!linkData.originalUrl || !Array.isArray(linkData.targets) || linkData.targets.length === 0) {
      return NextResponse.json(
        { message: 'Missing required fields: originalUrl and targets' },
        { status: 400 }
      );
    }

    // Create the link (includes any folderId property)
    const newLink = await createLink({ ...linkData, userId });
    return NextResponse.json(newLink, { status: 201 });
  } catch (error: any) {
    console.error('Error creating link:', error);
    const status = /taken|conflict/i.test(error.message) ? 409 : 500;
    return NextResponse.json(
      { message: error.message || 'Error creating link' },
      { status }
    );
  }
}
export async function PATCH(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const linkData = await request.json(); // Expects CreateLinkData shape

    // Debug logging
    debugLog('Received linkData:', linkData);
    if (linkData.targets && linkData.targets.length) {
      debugLog('First target URL:', linkData.targets[0]?.url);
    }

    // Validate required fields
    if (!linkData.originalUrl || !Array.isArray(linkData.targets) || linkData.targets.length === 0) {
      return NextResponse.json(
        { message: 'Missing required fields: originalUrl and targets' },
        { status: 400 }
      );
    }

    // Create the link (includes any folderId property)
    const newLink = await createLink({ ...linkData, userId });
    return NextResponse.json(newLink, { status: 201 });
  } catch (error: any) {
    console.error('Error creating link:', error);
    const status = /taken|conflict/i.test(error.message) ? 409 : 500;
    return NextResponse.json(
      { message: error.message || 'Error creating link' },
      { status }
    );
  }
}