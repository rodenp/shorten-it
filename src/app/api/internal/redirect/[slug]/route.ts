
import { NextResponse, type NextRequest } from 'next/server';
import { getLinkBySlugAndDomain, incrementLinkClickCount } from '@/lib/linkService';
import type { LinkItem } from '@/types'; // Ensure LinkItem is imported

// Helper to determine the target URL from a link item
function getTargetUrl(link: LinkItem): string | null {
  if (link.abTestConfig && link.abTestConfig.enabled && link.targets && link.targets.length > 0) {
    const totalWeight = link.targets.reduce((sum, target) => sum + (target.weight || 0), 0);
    if (totalWeight === 0 && link.targets.length > 0) {
        const randomIndex = Math.floor(Math.random() * link.targets.length);
        return link.targets[randomIndex].url;
    }
    let randomNum = Math.random() * totalWeight;
    for (const target of link.targets) {
      if (randomNum < (target.weight || 0)) {
        return target.url;
      }
      randomNum -= (target.weight || 0);
    }
    return link.targets[0]?.url || link.originalUrl; 
  }
  if (link.targets && link.targets.length > 0 && link.targets[0].url) {
    return link.targets[0].url; 
  }
  return link.originalUrl || null; 
}

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const slug = params.slug;
  const originalHost = request.headers.get('x-original-host');
  
  if (!slug || !originalHost) {
    // If essential information is missing, redirect to homepage or show a generic error
    // This shouldn't happen if middleware is setting headers correctly.
    return NextResponse.redirect(new URL('/', request.url)); 
  }

  try {
    const link = await getLinkBySlugAndDomain(slug, originalHost);

    if (link) {
      const targetUrl = getTargetUrl(link);

      if (targetUrl) {
        // Asynchronously increment click count - no need to await
        incrementLinkClickCount(link.id).catch(console.error);

        if (link.isCloaked) {
          try {
            const response = await fetch(targetUrl);
            if (!response.ok) {
                console.error(`Cloaking failed: Target URL ${targetUrl} returned ${response.status}`);
                return NextResponse.redirect(new URL(targetUrl), 301); 
            }
            const body = await response.text();
            const headers = new Headers(response.headers);
            headers.delete('Content-Security-Policy');
            headers.delete('X-Frame-Options');

            return new NextResponse(body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
            });
          } catch (e) {
            console.error(`Error during cloaking fetch for ${targetUrl}:`, e);
            return NextResponse.redirect(new URL(targetUrl), 301);
          }
        }
        // Standard redirect
        return NextResponse.redirect(new URL(targetUrl), 301); // 301 for permanent, 302/307 for temporary
      }
    }
  } catch (error) {
    console.error(`Error processing redirect for slug '${slug}' on host '${originalHost}':`, error);
    // Fallthrough to 404 if any error occurs or link/target is not found
  }

  // If link not found or no target URL, return a 404
  // You can customize this to redirect to a specific 404 page or your homepage
  const notFoundUrl = new URL('/404', request.url); // Or just request.url for site's 404
  return NextResponse.rewrite(notFoundUrl); // Rewrite to keep the original URL in browser for 404
}
