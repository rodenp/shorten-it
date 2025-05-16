// src/app/api/internal/redirect/[slug]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import {
  getLinkBySlugAndDomain,
  incrementLinkClickCount,
  updateLinkLastUsedTarget,
} from '@/lib/linkService';
import { recordAnalyticEvent } from '@/lib/analyticsService';
import type { LinkItem, AnalyticEvent } from '@/types';

// Determine target URL with rotation logic
function determineTargetUrlAndIndex(link: LinkItem): { targetUrl: string | null; nextIndexToSave?: number } {
  if (!link.targets || link.targets.length === 0) {
    console.log('[RedirectRouteV10-NoGeoIP] No targets for link ' + link.id + '. Using originalUrl.');
    return { targetUrl: link.originalUrl, nextIndexToSave: undefined }; 
  }

  console.log('[RedirectRouteV10-NoGeoIP] Link ' + link.id + ' targets received: ' + JSON.stringify(link.targets) + ' (Length: ' + link.targets.length + ')'); // Added log for targets array and its length

  const currentKnownIndex =
    typeof link.lastUsedTargetIndex === 'number' && link.lastUsedTargetIndex !== null 
      ? link.lastUsedTargetIndex 
      : -1;
  console.log('[RedirectRouteV10-NoGeoIP] Link ' + link.id + ': lastUsedTargetIndex from DB = ' + link.lastUsedTargetIndex + ', currentKnownIndex = ' + currentKnownIndex);

  const nextIndex = (currentKnownIndex + 1) % link.targets.length;
  const selectedTarget = link.targets[nextIndex];
  console.log('[RedirectRouteV10-NoGeoIP] Link ' + link.id + ': Calculated nextIndex = ' + nextIndex + ' (targets.length was ' + link.targets.length + ')'); // Added targets.length to this log too

  if (selectedTarget?.url) {
    return { targetUrl: selectedTarget.url, nextIndexToSave: nextIndex };
  }
  console.warn('[RedirectRouteV10-NoGeoIP] Selected target at index ' + nextIndex + ' for link ' + link.id + ' is invalid or missing URL. Falling back to originalUrl.');
  return { targetUrl: link.originalUrl, nextIndexToSave: undefined }; 
}

function isValidHttpUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest, context: { params?: { slug?: string } }) {
  console.log('!!!!!! MEGA DEBUG: REDIRECT ROUTE GET HANDLER ENTERED !!!!!!');
  console.log('[RedirectRouteV10-NoGeoIP] Entered GET handler.');

  const resolvedParams = await Promise.resolve(context.params);
  const slug = resolvedParams?.slug;
  
  if (!slug) {
    console.error('[RedirectRouteV10-NoGeoIP] Slug was not resolved. Check routing and params.');
    return NextResponse.redirect(new URL('/?error=slug_missing', request.url));
  }

  const originalHost = request.headers.get('x-original-host');
  if (!originalHost) { 
    console.error('[RedirectRouteV10-NoGeoIP] Missing x-original-host header for slug ' + slug + '.');
    return NextResponse.redirect(new URL('/?error=original_host_missing', request.url));
  }

  console.log('[RedirectRouteV10-NoGeoIP] Processing slug ' + slug + ' for host ' + originalHost + '.');

  try {
    const link = await getLinkBySlugAndDomain(slug, originalHost);
    console.log('[RedirectRouteV10-NoGeoIP] Link fetched for ' + slug + ': ', JSON.stringify(link, null, 2));

    if (link) {
      const { targetUrl, nextIndexToSave } = determineTargetUrlAndIndex(link);
      console.log('[RedirectRouteV10-NoGeoIP] Link ' + link.id + ': Determined targetUrl = ' + targetUrl + ', nextIndexToSave = ' + nextIndexToSave);

      if (targetUrl && isValidHttpUrl(targetUrl)) {
        console.log('!!!!!! MEGA DEBUG: Just before incrementLinkClickCount for link ID: ' + link.id);
        incrementLinkClickCount(link.id).catch(err => {
          console.error('[RedirectRouteV10-NoGeoIP] Error incrementing click count for link ' + link.id + ':', err);
        });

        if (typeof nextIndexToSave === 'number') {
          console.log('!!!!!! MEGA DEBUG: Just before updateLinkLastUsedTarget for link ID: ' + link.id + ' with index: ' + nextIndexToSave);
          updateLinkLastUsedTarget(link.id, nextIndexToSave).catch(err => {
            console.error('[RedirectRouteV10-NoGeoIP] Error updating last used target index for link ' + link.id + ':', err);
          });
        }

        const ipAddress = request.ip;
        const userAgentString = request.headers.get('user-agent');
        const referrer = request.headers.get('referer');
        let deviceType: AnalyticEvent['deviceType'] = 'other';
        if (userAgentString) {
            if (/bot|crawl|slurp|spider|mediapartners/i.test(userAgentString)) deviceType = 'bot';
            else if (/tablet|ipad|playbook|silk|(android(?!.*mobile))/i.test(userAgentString)) deviceType = 'tablet';
            else if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle/i.test(userAgentString)) deviceType = 'mobile';
            else deviceType = 'desktop';
        }
      
        const eventToRecord: Omit<AnalyticEvent, 'id' | 'timestamp'> = {
          linkId: link.id,
          ipAddress: ipAddress || null,
          userAgent: userAgentString || null,
          referrer: referrer || null,
          deviceType,
        };
      
        recordAnalyticEvent(eventToRecord).catch(err =>
         console.error('[RedirectRouteV10-NoGeoIP] Analytics record error for link ' + link.id + ':', err)
        );
      
        if (link.isCloaked) {
          try {
            console.log('[RedirectRouteV10-NoGeoIP] Cloaking: Fetching ' + targetUrl + ' for slug ' + slug + '.');
            const response = await fetch(targetUrl);
            if (!response.ok) {
                console.warn('[RedirectRouteV10-NoGeoIP] Cloak fetch failed with status ' + response.status + ' for ' + targetUrl);
                return NextResponse.redirect(new URL(targetUrl), { status: 307 }); 
            }
            const body = await response.text();
            const headers = new Headers(response.headers);
            headers.delete('Content-Security-Policy');
            headers.delete('X-Frame-Options');
            return new NextResponse(body, {
              status: response.status,
              statusText: response.statusText,
              headers,
            });
          } catch (e) {
            console.error('[RedirectRouteV10-NoGeoIP] Cloaking fetch error for ' + targetUrl + ':', e);
            return NextResponse.redirect(new URL(targetUrl), { status: 307 });
          }
        }
        console.log('[RedirectRouteV10-NoGeoIP] Redirecting to ' + targetUrl);
        return NextResponse.redirect(new URL(targetUrl), { status: 307 });

      } else { 
        console.warn('[RedirectRouteV10-NoGeoIP] Invalid or missing target URL determined for slug ' + slug + '. Link data: ' + JSON.stringify(link));
        return NextResponse.redirect(new URL('/?error=invalid_target_url_logic_issue', request.url)); 
      }
    } else { 
      console.warn('[RedirectRouteV10-NoGeoIP] No link found for slug ' + slug + ' on ' + originalHost + '.');
    }
  } catch (error) {
    console.error('[RedirectRouteV10-NoGeoIP] General redirect processing error for slug ' + slug + ':', error);
  }

  console.warn('[RedirectRouteV10-NoGeoIP] Fallback: Redirecting to homepage due to error or link not found for slug ' + (slug || "UNKNOWN_SLUG") + '.');
  return NextResponse.redirect(new URL('/?error=link_processing_failed', request.url));
}
