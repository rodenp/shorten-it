import { NextResponse } from 'next/server';
import { 
  getAggregatedLinkAnalytics // Use the new aggregated function
} from '@/lib/analyticsService';
import { getUserIdFromRequest } from '@/lib/auth-utils';

interface RouteContext {
  params: { linkId: string };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const params = await Promise.resolve(context.params);
    const { linkId } = params;
    
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const topN = parseInt(searchParams.get('topN') || '5', 10); // Allow topN to be configurable via query param if desired

    if (!linkId) {
        return NextResponse.json({ message: 'Link ID is required' }, { status: 400 });
    }

    // The getAggregatedLinkAnalytics function now handles the link access validation internally
    const analyticsData = await getAggregatedLinkAnalytics(linkId, userId, days, topN);

    if (!analyticsData) {
      // This case might occur if getAggregatedLinkAnalytics itself throws an error that is caught and returns null,
      // or if it returns a structure that evaluates to falsy. 
      // Based on current implementation, it throws on error, so this might not be hit often unless modified.
      return NextResponse.json({ message: 'Analytics data not found for this link' }, { status: 404 });
    }

    return NextResponse.json(analyticsData, { status: 200 });

  } catch (error: any) {
      let linkIdForError = "unknown";
      try {
        const params = await Promise.resolve(context.params);
        if (params && params.linkId) {
            linkIdForError = params.linkId;
        }
      } catch (paramsError) {
        console.error("Error accessing params in catch block for analytics route:", paramsError);
      }
      
      console.error('Error in GET /api/analytics/link/' + linkIdForError + ':', error);
      // Use the error message from analyticsService if available, which might be more specific (e.g., "Link not found")
      const statusCode = error.message?.includes('Link not found or user not authorized') ? 404 : 
                       error.message?.includes('Invalid column name') ? 400 : 500;
      return NextResponse.json({ message: error.message || 'Error fetching analytics' }, { status: statusCode });
    }
}
