
import { NextResponse } from 'next/server';
import {
  createLink,
  getLinksByUserId,
} from '@/lib/linkService';
import { getUserIdFromRequest } from '@/lib/auth-utils';
import { LinkItem } from '@/types';

// GET /api/links (Get all links for the logged-in user)
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const links = await getLinksByUserId(userId);
    return NextResponse.json(links);
  } catch (error: any) {
    console.error('Error fetching links:', error);
    return NextResponse.json({ message: error.message || 'Error fetching links' }, { status: 500 });
  }
}

// POST /api/links (Create a new link for the logged-in user)
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const linkData = await request.json(); // Expects data conforming to CreateLinkData

    // Log the received originalUrl and its length for debugging
    console.log("Received originalUrl in API route:", linkData.originalUrl);
    console.log("Length of received originalUrl:", linkData.originalUrl?.length);
    // Also log the first target URL as an example, if targets exist
    if (linkData.targets && linkData.targets.length > 0) {
        console.log("First target URL in API route:", linkData.targets[0]?.url);
        console.log("Length of first target URL:", linkData.targets[0]?.url?.length);
    }


    if (!linkData.originalUrl || !linkData.targets || linkData.targets.length === 0) {
      return NextResponse.json({ message: 'Missing required fields: originalUrl and targets' }, { status: 400 });
    }

    const newLink = await createLink({ ...linkData, userId });
    return NextResponse.json(newLink, { status: 201 });

  } catch (error: any) {
    console.error('Error creating link:', error);
    const statusCode = error.message?.includes('already taken') || error.message?.includes('conflict') ? 409 : 500;
    return NextResponse.json({ message: error.message || 'Error creating link' }, { status: statusCode });
  }
}
