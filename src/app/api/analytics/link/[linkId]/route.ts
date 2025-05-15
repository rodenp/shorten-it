
import { NextResponse } from 'next/server';
import {
  getAnalyticsForLink,
  getAnalyticsChartDataForLink,
} from '@/lib/analyticsService';
import { getUserIdFromRequest } from '@/lib/auth-utils';

// GET /api/analytics/link/[linkId]
export async function GET(request: Request, context: { params: { linkId: string } }) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const resolvedParams = await context.params; // Await the params
    const { linkId } = resolvedParams;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10); // Default to 30 days as in previous mock

    // Fetch both detailed events and chart data
    const [linkEvents, analyticsChartData] = await Promise.all([
      getAnalyticsForLink(linkId, userId, 5), // Assuming we want top 5 recent events like in mock
      getAnalyticsChartDataForLink(linkId, userId, days),
    ]);

    // Ensure that the returned data has the fields expected by the frontend
    return NextResponse.json({
      recentEvents: linkEvents || [], // Ensure it's an array
      chartData: analyticsChartData || [], // Ensure it's an array
      periodDays: days 
    });

  } catch (error: any) {
    // Check if resolvedParams is defined before trying to access its properties
    const linkIdForError = context.params ? (await context.params).linkId : "unknown";
    console.error(`Error fetching analytics for link ${linkIdForError}:`, error);
    const statusCode = error.message?.includes('not found') || error.message?.includes('not authorized') ? 404 : 500;
    return NextResponse.json({ message: error.message || 'Error fetching analytics' }, { status: statusCode });
  }
}
