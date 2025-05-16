
import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOGIN_REDIRECT, authRoutes, publicRoutes, protectedAppRoutesPrefixes } from "@/lib/auth-routes";
import { withAuth } from 'next-auth/middleware';

const IS_DEBUG_LOGGING_ENABLED = process.env.DEBUG_LOGGING === 'true';

function debugLog(...args: any[]) {
  if (IS_DEBUG_LOGGING_ENABLED) {
    console.log(...args);
  }
}

function debugWarn(...args: any[]) {
  if (IS_DEBUG_LOGGING_ENABLED) {
    console.warn(...args);
  }
}

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
  debugLog("RUNNING LATEST MIDDLEWARE - Firebase Studio V6 Host Detection"); 

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
  debugLog(`[MiddlewareV6 - ENTRY] Request for pathname: '${pathname}'. Determined host: ${hostname} (from ${determinedHostForLog})`);

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') || 
    ['/favicon.ico', '/manifest.json', '/robots.txt'].includes(pathname)
  ) {
    debugLog(`[MiddlewareV6-DEBUG] Path '${pathname}' is a static/framework asset. Calling NextResponse.next().`);
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/internal/redirect/')) {
    debugLog(`[MiddlewareV6-DEBUG] Path '${pathname}' is internal redirect API. Calling NextResponse.next().`);
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) { 
    if (pathname.startsWith('/api/auth/')) {
        debugLog(`[MiddlewareV6-DEBUG] Path '${pathname}' is an auth API. Passing to nextAuthMiddleware.`);
        // @ts-ignore 
        return nextAuthMiddleware(request); 
    } else {
        debugLog(`[MiddlewareV6-DEBUG] Path '${pathname}' is a non-auth, non-internal-redirect API. Calling NextResponse.next().`);
        return NextResponse.next(); 
    }
  }
  
  debugLog(`[MiddlewareV6 - PRE-SLUG-CHECK] Pathname: '${pathname}'. Evaluating if it is a slug.`);

  const isAppRoute = protectedAppRoutesPrefixes.some(prefix => pathname.startsWith(prefix));
  const isAuthRoutePage = authRoutes.includes(pathname);
  
  debugLog(`[MiddlewareV6 - PRE-SLUG-VARS] For pathname '${pathname}': isAppRoute=${isAppRoute}, isAuthRoutePage=${isAuthRoutePage}`);

  if (
    pathname && 
    pathname !== '/' && 
    !isAppRoute && 
    !isAuthRoutePage 
  ) {
    debugLog(`[MiddlewareV6-DEBUG] Pathname '${pathname}' ENTERED SLUG REWRITE Block's main IF condition.`);
    const slug = decodeURIComponent(pathname.substring(1));

    if (slug) {
      debugLog(`[MiddlewareV6-DEBUG] Slug detected: '${slug}' for pathname '${pathname}'. Preparing to rewrite.`);
      const rewriteUrl = new URL(`/api/internal/redirect/${slug}${search}`, originalRequestUrl);
      
      const newHeaders = new Headers(request.headers);
      if (typeof hostname === 'string' && hostname) { 
        newHeaders.set('x-original-host', hostname);
      } else {
        debugWarn('[MiddlewareV6] hostname is invalid or missing for slug rewrite, NOT setting x-original-host.');
      }
      newHeaders.set('x-link-redirect-lookup', 'true');

      debugLog(`[MiddlewareV6-ACTION] REWRITING slug '${slug}' for pathname '${pathname}' to: ${rewriteUrl.toString()}`);
      return NextResponse.rewrite(rewriteUrl, { request: { headers: newHeaders } });
    } else {
      debugWarn(`[MiddlewareV6-DEBUG] Pathname '${pathname}' entered slug block, but extracted slug was empty. Passing to nextAuthMiddleware.`);
      // @ts-ignore 
      return nextAuthMiddleware(request);
    }
  } 
  
  debugLog(`[MiddlewareV6-DEBUG] Pathname '${pathname}' did NOT enter SLUG REWRITE Block's main IF. Passing to nextAuthMiddleware for default auth protection/handling.`);
  // @ts-ignore 
  return nextAuthMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
