
import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOGIN_REDIRECT, authRoutes, publicRoutes, protectedAppRoutesPrefixes } from "@/lib/auth-routes";
import { withAuth } from 'next-auth/middleware';

const nextAuthMiddleware = withAuth({
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized: ({ req, token }) => {
      const { pathname } = req.nextUrl;
      const isAuthRoute = authRoutes.includes(pathname);
      const isPublicRoute = publicRoutes.includes(pathname);
      const isApiAuthRoute = pathname.startsWith("/api/auth"); // NextAuth.js API routes

      if (isApiAuthRoute || isAuthRoute) {
        return true; 
      }
      if (isPublicRoute && !token && !protectedAppRoutesPrefixes.some(prefix => pathname.startsWith(prefix))) {
         return true; 
      }
      if (token) {
        return true; 
      }
      return false; 
    },
  },
});

export async function middleware(request: NextRequest) {
  console.log("RUNNING LATEST MIDDLEWARE - Firebase Studio V6 Host Detection"); 

  const { pathname, search } = request.nextUrl;
  const originalRequestUrl = request.url;
  
  const forwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = request.headers.get('host');
  let determinedHostForLog = ''; 

  let hostname: string | null = null;
  if (forwardedHost) {
      hostname = forwardedHost.split(',')[0].trim(); 
      determinedHostForLog = `x-forwarded-host (${hostname})`;
  } else if (hostHeader) {
      hostname = hostHeader;
      determinedHostForLog = `host header (${hostname})`;
  } else if (originalRequestUrl) {
      try {
          hostname = new URL(originalRequestUrl).hostname;
          determinedHostForLog = `URL object fallback (${hostname})`;
      } catch (e) {
          console.error('[MiddlewareV6] Error parsing originalRequestUrl for hostname fallback:', e);
          determinedHostForLog = 'Error/Unavailable';
      }
  }
  console.log(`[MiddlewareV6] Determined hostname for x-original-host: ${hostname} (from ${determinedHostForLog}) for pathname: ${pathname}`);

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') || 
    ['/favicon.ico', '/manifest.json', '/robots.txt'].includes(pathname)
  ) {
    console.log(`[MiddlewareV6-DEBUG] Path ${pathname} is a static/framework asset. Calling NextResponse.next().`);
    return NextResponse.next();
  }

  // Allow /api/internal/redirect/ to pass through without hitting the later API checks that might block it.
  if (pathname.startsWith('/api/internal/redirect/')) {
    console.log(`[MiddlewareV6-DEBUG] Path ${pathname} is internal redirect API. Calling NextResponse.next().`);
    return NextResponse.next();
  }

  // General API routes (excluding auth and our internal redirect)
  if (pathname.startsWith('/api/')) { // This condition now excludes /api/internal/redirect/
    if (pathname.startsWith('/api/auth/')) {
        console.log(`[MiddlewareV6-DEBUG] Path ${pathname} is an auth API. Passing to nextAuthMiddleware.`);
        // @ts-ignore 
        return nextAuthMiddleware(request); // Let nextAuthMiddleware handle /api/auth/* including its own NextResponse.next()
    } else {
        console.log(`[MiddlewareV6-DEBUG] Path ${pathname} is a non-auth, non-internal-redirect API. Calling NextResponse.next().`);
        return NextResponse.next(); 
    }
  }
  
  const isAppRoute = protectedAppRoutesPrefixes.some(prefix => pathname.startsWith(prefix));
  const isAuthRoutePage = authRoutes.includes(pathname);

  if (pathname === '/my-firebase-lnk') { 
    console.log(`[MiddlewareV6-TARGET] Path IS /my-firebase-lnk. Evaluating slug rewrite conditions...`);
    console.log(`[MiddlewareV6-TARGET] isAppRoute: ${isAppRoute}, !isAppRoute: ${!isAppRoute}`);
    console.log(`[MiddlewareV6-TARGET] isAuthRoutePage: ${isAuthRoutePage}, !isAuthRoutePage: ${!isAuthRoutePage}`);
  } 

  // SLUG REWRITE BLOCK - For non-app, non-auth-page, non-root paths
  if (
    pathname && 
    pathname !== '/' && 
    !isAppRoute && 
    !isAuthRoutePage 
    // No need for !pathname.startsWith('/api/auth/') here as /api/ paths are handled above
  ) {
    if (pathname === '/my-firebase-lnk') { // Specific log for your test case
        console.log(`[MiddlewareV6-TARGET] Path /my-firebase-lnk ENTERED SLUG REWRITE Block.`);
    }
    const slug = decodeURIComponent(pathname.substring(1));

    if (slug) {
      console.log(`[MiddlewareV6-DEBUG] Slug detected: '${slug}'. Preparing to rewrite.`);
      const rewriteUrl = new URL(`/api/internal/redirect/${slug}${search}`, originalRequestUrl);
      
      const newHeaders = new Headers(request.headers);
      if (typeof hostname === 'string' && hostname) { 
        newHeaders.set('x-original-host', hostname);
      } else {
        console.warn('[MiddlewareV6] hostname is invalid or missing for slug rewrite, NOT setting x-original-host.');
      }
      newHeaders.set('x-link-redirect-lookup', 'true');

      console.log(`[MiddlewareV6-ACTION] REWRITING slug '${slug}' for pathname '${pathname}' to: ${rewriteUrl.toString()}`);
      return NextResponse.rewrite(rewriteUrl, { request: { headers: newHeaders } });
    } else {
      // This case means pathname passed the main conditions, but slug ended up empty (e.g. path was just "/" after substring, though initial check prevents root)
      console.warn(`[MiddlewareV6-DEBUG] Pathname '${pathname}' passed slug conditions but extracted slug was empty. Passing to nextAuthMiddleware.`);
      // @ts-ignore 
      return nextAuthMiddleware(request);
    }
  } 
  
  // If it didn't match any of the above special handling (static, API, slug rewrite), it's likely an app page or auth page.
  console.log(`[MiddlewareV6-DEBUG] Pathname '${pathname}' did not match slug rewrite conditions or other specific handlers. Passing to nextAuthMiddleware for default auth protection/handling.`);
  // @ts-ignore 
  return nextAuthMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
