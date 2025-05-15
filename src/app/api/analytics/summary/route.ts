
import { NextResponse } from 'next/server';
import { getOverallAnalyticsSummary } from '@/lib/analyticsService';
import { getUserIdFromRequest } from '@/lib/auth-utils';

// GET /api/analytics/summary (Get overall analytics summary for the logged-in user)
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    
    let days: number;
    if (daysParam === 'all' || daysParam === null) {
      days = 0; // Use 0 or another sentinel value to signify all-time
    } else {
      days = parseInt(daysParam, 10);
      if (isNaN(days) || days < 1) {
        days = 7; // Default to 7 days if parsing fails or invalid number
      }
    }

    const summary = await getOverallAnalyticsSummary(userId, days);
    return NextResponse.json(summary);

  } catch (error: any) {
    console.error('Error fetching overall analytics summary:', error);
    return NextResponse.json({ message: error.message || 'Error fetching analytics summary' }, { status: 500 });
  }
}
