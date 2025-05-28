
import { pool, DB_TYPE } from './db';
import { AnalyticEvent, LinkItem } from '@/types'; // Added LinkItem for link check
import { v4 as uuidv4 } from 'uuid';

if (DB_TYPE !== 'postgres' || !pool) {
  console.warn('Analytics service currently only supports PostgreSQL. DB_TYPE is set to:', DB_TYPE);
}

// Helper function to check if link exists and belongs to user
// This should ideally also return the link if found, to avoid a second DB call for clickCount
// For now, it just validates. Consider enhancing it to return basic link details.
async function validateLinkAccess(linkId: string, userId: string): Promise<boolean> {
  if (!pool) throw new Error('PostgreSQL not configured');
  const linkCheckQuery = 'SELECT id FROM links WHERE id = $1 AND "userId" = $2';
  const linkCheck = await pool.query(linkCheckQuery, [linkId, userId]);
  if (linkCheck.rows.length === 0) {
    throw new Error('Link not found or user not authorized.');
  }
  return true;
}

function formatAnalyticEvent(row: any): AnalyticEvent {
  return {
    id: row.id,
    linkId: row.linkId,
    timestamp: new Date(row.timestamp).toISOString(),
    ipAddress: row.ipAddress, 
    userAgent: row.userAgent,
    country: row.country,
    city: row.city,
    deviceType: row.deviceType as AnalyticEvent['deviceType'],
    browser: row.browser,
    os: row.os,
    referrer: row.referrer,
  };
}

export async function recordAnalyticEvent(eventData: Omit<AnalyticEvent, 'id' | 'timestamp'>): Promise<AnalyticEvent> {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  
  const id = uuidv4();
  const timestamp = new Date().toISOString();
  const { linkId, ipAddress, userAgent, country, city, deviceType, browser, os, referrer } = eventData;

  try {
    const query = `
      INSERT INTO analytic_events 
        (id, "linkId", timestamp, "ipAddress", "userAgent", country, city, "deviceType", browser, os, referrer)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
    const params = [id, linkId, timestamp, ipAddress, userAgent, country, city, deviceType, browser, os, referrer];
    const res = await pool.query(query, params);
    return formatAnalyticEvent(res.rows[0]);
  } catch (err) {
    console.error('Error recording analytic event:', err);
    throw new Error('Failed to record analytic event.');
  }
}

// Fetches recent events - similar to getAnalyticsForLink but could be paginated/limited in future
export async function getRecentAnalyticEvents(linkId: string, userId: string, limit: number = 20): Promise<AnalyticEvent[]> {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  await validateLinkAccess(linkId, userId); // Validate access first
  try {
    const res = await pool.query(
      'SELECT * FROM analytic_events WHERE "linkId" = $1 ORDER BY timestamp DESC LIMIT $2',
      [linkId, limit]
    );
    return res.rows.map(formatAnalyticEvent);
  } catch (err: any) {
    console.error(`Error fetching recent events for link ${linkId}:`, err);
    throw new Error(err.message || 'Failed to retrieve recent events.');
  }
}

export async function getAnalyticsChartDataForLink(
  linkId: string,
  userId: string, 
  daysInput: number = 30 
): Promise<{ date: string; clicks: number }[]> {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  await validateLinkAccess(linkId, userId);

  let startDateFilter = '';
  const queryParams: (string | number)[] = [linkId];

  if (daysInput > 0) { 
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInput);
    startDateFilter = 'AND timestamp >= $2';
    queryParams.push(startDate.toISOString());
  }

  try {
    const query = `
      SELECT DATE(timestamp) as date, COUNT(*) as clicks
      FROM analytic_events
      WHERE "linkId" = $1 ${startDateFilter}
      GROUP BY DATE(timestamp)
      ORDER BY DATE(timestamp) ASC;
    `;
    const res = await pool.query(query, queryParams);
    
    return res.rows.map(row => ({
      date: new Date(row.date).toISOString().split('T')[0], 
      clicks: parseInt(row.clicks, 10),
    }));
  } catch (err: any) {
    console.error(`Error fetching chart data for link ${linkId}:`, err);
    throw new Error(err.message || 'Failed to retrieve chart data.');
  }
}

async function getTopItemsForLink(
    linkId: string, 
    columnName: string, 
    limit: number = 5
) : Promise<{ name: string; count: number }[]> {
    if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
    const allowedColumns = ['browser', 'os', 'deviceType', 'referrer', 'country', 'city'];
    if (!allowedColumns.includes(columnName)) {
        throw new Error(`Invalid column name for aggregation: ${columnName}`);
    }

    try {
        const query = `
            SELECT "${columnName}" as name, COUNT(*) as count
            FROM analytic_events
            WHERE "linkId" = $1 AND "${columnName}" IS NOT NULL AND "${columnName}" != ''
            GROUP BY "${columnName}"
            ORDER BY count DESC
            LIMIT $2;
        `;
        const res = await pool.query(query, [linkId, limit]);
        return res.rows.map(row => ({
            name: row.name,
            count: parseInt(row.count, 10),
        }));
    } catch (err: any) {
        console.error(`Error fetching top ${columnName} for link ${linkId}:`, err);
        throw new Error(err.message || `Failed to retrieve top ${columnName}.`);
    }
}

export async function getTopBrowsersForLink(linkId: string, userId: string, limit: number = 5) {
    await validateLinkAccess(linkId, userId);
    return getTopItemsForLink(linkId, 'browser', limit);
}

export async function getTopOSForLink(linkId: string, userId: string, limit: number = 5) {
    await validateLinkAccess(linkId, userId);
    return getTopItemsForLink(linkId, 'os', limit);
}

export async function getTopDeviceTypesForLink(linkId: string, userId: string, limit: number = 5) {
    await validateLinkAccess(linkId, userId);
    return getTopItemsForLink(linkId, 'deviceType', limit);
}

export async function getTopReferrersForLink(linkId: string, userId: string, limit: number = 5) {
    await validateLinkAccess(linkId, userId);
    return getTopItemsForLink(linkId, 'referrer', limit);
}

export async function getTopCountriesForLink(linkId: string, userId: string, limit: number = 5) {
    await validateLinkAccess(linkId, userId);
    return getTopItemsForLink(linkId, 'country', limit);
}

// New aggregated function
export async function getAggregatedLinkAnalytics(
  linkId: string, 
  userId: string, 
  days: number = 30, 
  topN: number = 5
) {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  await validateLinkAccess(linkId, userId); // Single validation at the beginning

  try {
    const [chartData, recentEvents, topBrowsers, topOS, topDeviceTypes, topReferrers, topCountries] = await Promise.all([
      getAnalyticsChartDataForLink(linkId, userId, days),
      getRecentAnalyticEvents(linkId, userId, 20), // Fetch 20 recent events
      getTopBrowsersForLink(linkId, userId, topN),
      getTopOSForLink(linkId, userId, topN),
      getTopDeviceTypesForLink(linkId, userId, topN),
      getTopReferrersForLink(linkId, userId, topN),
      getTopCountriesForLink(linkId, userId, topN),
    ]);

    return {
      chartData,
      recentEvents,
      topBrowsers,
      topOS,
      topDeviceTypes,
      topReferrers,
      topCountries,
      periodDays: days,
    };
  } catch (error) {
    console.error(`Error in getAggregatedLinkAnalytics for link ${linkId}:`, error);
    // Re-throw or handle as appropriate for your error strategy
    // For instance, you might want to return null or a specific error object
    throw error; // Re-throwing for now, API route can catch it
  }
}


export async function getOverallAnalyticsSummary(userId: string, days: number = 7): Promise<any> {
    if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
    
    let dateFilterCondition = '';
    const queryParamsClicks: any[] = [userId];
    
    if (days > 0) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        dateFilterCondition = 'AND ae.timestamp >= $2';
        queryParamsClicks.push(startDate.toISOString());
    }

    try {
        const totalClicksQuery = `
            SELECT COUNT(ae.id) as "totalClicks"
            FROM analytic_events ae
            JOIN links l ON ae."linkId" = l.id
            WHERE l."userId" = $1 ${dateFilterCondition};
        `;
        
        const totalLinksQuery = `SELECT COUNT(*) as "userTotalLinks" FROM links WHERE "userId" = $1;`;

        const [clicksRes, linksRes] = await Promise.all([
            pool.query(totalClicksQuery, queryParamsClicks),
            pool.query(totalLinksQuery, [userId])
        ]);

        return {
            totalClicks: parseInt(clicksRes.rows[0]?.totalClicks || '0', 10),
            totalLinks: parseInt(linksRes.rows[0]?.userTotalLinks || '0', 10),
            periodDays: days, 
        };
    } catch (err: any) {
        console.error(`Error fetching overall analytics summary for user ${userId}:`, err);
        throw new Error(err.message || 'Failed to retrieve overall analytics summary.');
    }
}
