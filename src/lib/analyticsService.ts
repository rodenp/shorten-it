
import { pool, DB_TYPE } from './db';
import { AnalyticEvent } from '@/types';
import { v4 as uuidv4 } from 'uuid';

if (DB_TYPE !== 'postgres' || !pool) {
  console.warn('Analytics service currently only supports PostgreSQL. DB_TYPE is set to:', DB_TYPE);
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

export async function getAnalyticsForLink(linkId: string, userId: string): Promise<AnalyticEvent[]> {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  try {
    const linkCheck = await pool.query('SELECT id FROM links WHERE id = $1 AND "userId" = $2', [linkId, userId]);
    if (linkCheck.rows.length === 0) {
      throw new Error('Link not found or user not authorized to view its analytics.');
    }

    const res = await pool.query(
      'SELECT * FROM analytic_events WHERE "linkId" = $1 ORDER BY timestamp DESC',
      [linkId]
    );
    return res.rows.map(formatAnalyticEvent);
  } catch (err: any) {
    console.error(`Error fetching analytics for link ${linkId}:`, err);
    throw new Error(err.message || 'Failed to retrieve analytics for link.');
  }
}

export async function getAnalyticsChartDataForLink(
  linkId: string,
  userId: string, 
  daysInput: number = 7 // Renamed to daysInput to avoid conflict with internal days variable
): Promise<{ date: string; clicks: number }[]> {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  
  const linkCheck = await pool.query('SELECT id FROM links WHERE id = $1 AND "userId" = $2', [linkId, userId]);
  if (linkCheck.rows.length === 0) {
    throw new Error('Link not found or user not authorized to view its analytics.');
  }

  let startDateFilter = '';
  const queryParams = [linkId];

  if (daysInput > 0) { // Only apply date filter if daysInput is positive
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInput);
    startDateFilter = 'AND timestamp >= $2';
    queryParams.push(startDate.toISOString());
  }
  // If daysInput is 0 or less, no date filter is applied (all-time data for the link)

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

// Updated to fetch totalLinks as well and handle days = 0 for all-time
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
    // If days is 0, dateFilterCondition remains empty, effectively fetching all-time clicks

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
            periodDays: days, // Reflects the period requested (0 for all-time)
        };
    } catch (err: any) {
        console.error(`Error fetching overall analytics summary for user ${userId}:`, err);
        throw new Error(err.message || 'Failed to retrieve overall analytics summary.');
    }
}
