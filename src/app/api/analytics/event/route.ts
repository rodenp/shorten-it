
import { NextResponse } from 'next/server';
import { recordAnalyticEvent } from '@/lib/analyticsService';
import { incrementLinkClickCount } from '@/lib/linkService';
import { AnalyticEvent } from '@/types';

// POST /api/analytics/event (Record a new analytic event)
// This endpoint would typically be called internally during link redirection.
// Auth for this might be different (e.g. a trusted service token or no direct user auth if it's a public link click)
// For now, it's open but in a real app, secure this appropriately.
export async function POST(request: Request) {
  try {
    const eventData = await request.json() as Omit<AnalyticEvent, 'id' | 'timestamp'>;

    if (!eventData.linkId) {
      return NextResponse.json({ message: 'Missing required field: linkId' }, { status: 400 });
    }

    // Concurrently record event and increment click count
    await Promise.all([
        recordAnalyticEvent(eventData),
        incrementLinkClickCount(eventData.linkId)
    ]);
    
    // For this specific endpoint, a 204 No Content or a minimal success might be more appropriate
    // than returning the full event, as it's often a fire-and-forget from redirection.
    return NextResponse.json({ message: 'Event recorded' }, { status: 201 }); 

  } catch (error: any) {
    console.error('Error recording analytic event from API:', error);
    // Avoid sending detailed error messages for this type of endpoint if it's public-facing during redirection
    return NextResponse.json({ message: 'Error recording event' }, { status: 500 });
  }
}
