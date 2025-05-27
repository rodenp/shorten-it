
import { NextResponse, NextRequest } from 'next/server';
import { recordAnalyticEvent } from '@/lib/analyticsService';
import { incrementLinkClickCount } from '@/lib/linkService';
import { AnalyticEventInput } from '@/types'; // Assuming AnalyticEventInput is the type for incoming data
import {
  anonymizeIp,
  parseUserAgent,
  getReferrerHostname,
  geoService,
} from '@/lib/analytics-utils';

// Helper to get IP from request (simplified for this context)
function getIpFromRequest(req: NextRequest): string | undefined {
    // Standard Next.js way to get IP is req.ip, but it might be from Vercel's proxy.
    // X-Forwarded-For is common.
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim(); // Get the first IP in the list
    }
    return req.ip; // Fallback to req.ip (might be undefined or internal IP)
}


// POST /api/analytics/event (Record a new analytic event)
export async function POST(request: NextRequest) {
  try {
    // Origin/Referer Check
    const origin = request.headers.get('Origin');
    const referer = request.headers.get('Referer');
    const allowedDomains = process.env.ALLOWED_ANALYTICS_ORIGINS?.split(',') || []; // e.g., https://app.example.com,https://example.com

    // Check if Origin or Referer is present and starts with an allowed domain prefix
    // This is a basic check. For more robust validation, ensure the entire domain matches.
    let isAllowedOrigin = false;
    if (origin) {
        isAllowedOrigin = allowedDomains.some(domain => origin.startsWith(domain));
    } else if (referer) { // Fallback to Referer if Origin is not present
        isAllowedOrigin = allowedDomains.some(domain => referer.startsWith(domain));
    }

    if (allowedDomains.length > 0 && !isAllowedOrigin) { // Only enforce if ALLOWED_ANALYTICS_ORIGINS is set
      console.warn(`[API ANALYTICS EVENT] Blocked request from invalid origin/referer. Origin: ${origin}, Referer: ${referer}`);
      return NextResponse.json({ message: 'Forbidden: Invalid origin.' }, { status: 403 });
    }

    const rawEventData = await request.json() as Partial<AnalyticEventInput>;

    if (!rawEventData.linkId) {
      return NextResponse.json({ message: 'Missing required field: linkId' }, { status: 400 });
    }

    const originalIp = getIpFromRequest(request);
    const userAgentString = request.headers.get('user-agent');
    
    // 1. Derive GeoLocation from Original IP
    const geoLocation = await geoService.getGeoFromIp(originalIp);

    // 2. Anonymize IP
    const anonymizedIpAddress = anonymizeIp(originalIp);

    // 3. Parse User Agent
    const userAgentDetails = parseUserAgent(userAgentString);

    // 4. Parse Referrer
    const referrerHostname = getReferrerHostname(rawEventData.referrer);

    const processedEventData: Omit<AnalyticEventInput, 'id' | 'timestamp'> = {
      linkId: rawEventData.linkId,
      ipAddress: anonymizedIpAddress, // Store anonymized IP
      userAgent: undefined, // Do not store full User-Agent string
      country: geoLocation.country,
      city: geoLocation.city,
      deviceType: userAgentDetails.deviceType,
      browser: userAgentDetails.browserName,
      os: userAgentDetails.osName,
      referrer: referrerHostname, // Store only hostname or truncated referrer
      // Include other fields if they are part of AnalyticEventInput and directly passed
      // e.g., targetUrl: rawEventData.targetUrl (if it's a field)
    };
    
    // Ensure no undefined fields that are non-optional in the DB model are passed
    // For example, if 'browser' is non-optional in DB, provide a default like 'Unknown' if userAgentDetails.browserName is undefined.
    // The current AnalyticEvent table schema in db.ts allows NULL for these derived fields.

    // Concurrently record event and increment click count
    await Promise.all([
        recordAnalyticEvent(processedEventData), // Pass the processed data
        incrementLinkClickCount(rawEventData.linkId)
    ]);
    
    return NextResponse.json({ message: 'Event recorded' }, { status: 201 });

  } catch (error: any) {
    console.error('[API ANALYTICS EVENT] Error recording analytic event:', error);
    return NextResponse.json({ message: 'Error recording event' }, { status: 500 });
  }
}
