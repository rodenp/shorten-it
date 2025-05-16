
import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOGIN_REDIRECT, authRoutes, publicRoutes, protectedAppRoutesPrefixes } from "@/lib/auth-routes";
import { withAuth } from 'next-auth/middleware';
// REMOVED direct import of ApiKeyModel for Edge compatibility in middleware
// import { ApiKeyModel, type ApiKey } from '@/models/ApiKey'; 

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

function hasApiPermission(apiKeyPermissions: string[], requiredPermission: string): boolean {
  if (!requiredPermission) return true; 
  return apiKeyPermissions.includes(requiredPermission);
}

const nextAuthMiddleware = withAuth({
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized: ({ req, token }) => {
      const { pathname } = req.nextUrl;
      if (req.headers.get('x-api-key-authenticated') === 'true') {
        return true;
      }
      const isAuthRoute = authRoutes.includes(pathname);
      const isPublicRoute = publicRoutes.includes(pathname);
      const isApiAuthRoute = pathname.startsWith("/api/auth");
      if (isApiAuthRoute || isAuthRoute) return true; 
      if (isPublicRoute && !token && !protectedAppRoutesPrefixes.some(prefix => pathname.startsWith(prefix))) return true; 
      if (token) return true; 
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

  if (pathname.startsWith('/_next') || pathname.startsWith('/static') || ['.+', '/manifest.json', '/robots.txt', '/favicon.ico'].includes(pathname)) {
    debugLog(`[MiddlewareV6-DEBUG] Path '${pathname}' is a static/framework asset. Calling NextResponse.next().`);
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/internal/redirect/')) {
    debugLog(`[MiddlewareV6-DEBUG] Path '${pathname}' is internal redirect API. Calling NextResponse.next().`);
    return NextResponse.next();
  }
  
  // API Route Handling
  if (pathname.startsWith('/api/')) {
    if (pathname.startsWith('/api/auth/')) {
      debugLog(`[MiddlewareV6-DEBUG] Path '${pathname}' is an auth API. Passing to nextAuthMiddleware.`);
      // @ts-ignore
      return nextAuthMiddleware(request);
    } else if (pathname.startsWith('/api/internal/validate-api-key')) {
      // This internal route is called by this middleware itself, should bypass further auth in middleware.
      // It has its own logic and runtime (Node.js).
      debugLog(`[MiddlewareV6-DEBUG] Path '${pathname}' is internal validate-api-key. Calling NextResponse.next().`);
      return NextResponse.next();
    } else {
      debugLog(`[MiddlewareV6-DEBUG] Path '${pathname}' is a non-auth, non-internal API. Checking for API Key.`);
      const authHeader = request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const apiKeyString = authHeader.substring(7);
        if (apiKeyString) {
          let apiKeyValidationApiResponse;
          let apiKeyInfo: { success: boolean; userId?: string; permissions?: string[]; message?: string } | null = null;
          try {
            const internalValidateUrl = new URL('/api/internal/validate-api-key', request.nextUrl.origin);
            apiKeyValidationApiResponse = await fetch(internalValidateUrl.toString(), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey: apiKeyString }),
            });
            if (apiKeyValidationApiResponse.ok) {
              apiKeyInfo = await apiKeyValidationApiResponse.json();
            } else {
              debugWarn(`[MiddlewareV6-DEBUG] Internal API key validation failed with status: ${apiKeyValidationApiResponse.status}`);
              if (apiKeyValidationApiResponse.status === 401) {
                const errorData = await apiKeyValidationApiResponse.json();
                return NextResponse.json({ message: errorData.message || 'Invalid API Key' }, { status: 401 });
              }
            }
          } catch (e) {
            console.error('[MiddlewareV6] Error calling internal API key validation route:', e);
            // Treat as if no valid key was found and let session auth handle it, or return a generic server error for API key attempt.
            // For now, let it fall through to session auth if API key validation system itself fails.
          }

          if (apiKeyInfo && apiKeyInfo.success && apiKeyInfo.userId && apiKeyInfo.permissions) {
            debugLog(`[MiddlewareV6-DEBUG] Valid API Key (via internal route) for user: ${apiKeyInfo.userId}, permissions: ${apiKeyInfo.permissions.join(', ')}`);
            let requiredPermission = '';
            if (pathname.startsWith('/api/links')) {
              if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') requiredPermission = 'links:write';
              else if (request.method === 'GET') requiredPermission = 'links:read';
            } else if (pathname.startsWith('/api/analytics')) {
              requiredPermission = 'analytics:read';
            } else if (pathname.startsWith('/api/custom-domains')) {
                if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') requiredPermission = 'domains:write';
                else if (request.method === 'GET') requiredPermission = 'domains:read';
            } else if (pathname.startsWith('/api/retargeting-pixels')) {
                if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') requiredPermission = 'pixels:write';
                else if (request.method === 'GET') requiredPermission = 'pixels:read';
            }
             // Add more specific route/method to permission mappings here

            if (hasApiPermission(apiKeyInfo.permissions, requiredPermission)) {
              debugLog(`[MiddlewareV6-DEBUG] API Key has required permission: ${requiredPermission || 'none'}`);
              const requestHeaders = new Headers(request.headers);
              requestHeaders.set('x-api-user-id', apiKeyInfo.userId);
              requestHeaders.set('x-api-key-permissions', apiKeyInfo.permissions.join(','));
              requestHeaders.set('x-api-key-authenticated', 'true');
              return NextResponse.next({ request: { headers: requestHeaders } });
            } else {
              debugWarn(`[MiddlewareV6-DEBUG] API Key for user ${apiKeyInfo.userId} missing required permission: ${requiredPermission}`);
              return NextResponse.json({ message: `API Key missing required permission: ${requiredPermission}` }, { status: 403 });
            }
          } else if (apiKeyValidationApiResponse && !apiKeyValidationApiResponse.ok && apiKeyValidationApiResponse.status !== 401) {
             return NextResponse.json({ message: 'API Key validation service error' }, { status: 500 });
          }
        }
      } // End of API Key check
      debugLog(`[MiddlewareV6-DEBUG] No/invalid API Key for '${pathname}', or validation call failed. Passing to nextAuthMiddleware for session check.`);
      // @ts-ignore
      return nextAuthMiddleware(request);
    }
  }
  
  // Slug rewriting and default auth for pages
  debugLog(`[MiddlewareV6 - PRE-SLUG-CHECK] Pathname: '${pathname}'. Evaluating if it is a slug.`);
  const isAppRoute = protectedAppRoutesPrefixes.some(prefix => pathname.startsWith(prefix));
  const isAuthRoutePage = authRoutes.includes(pathname);
  debugLog(`[MiddlewareV6 - PRE-SLUG-VARS] For pathname '${pathname}': isAppRoute=${isAppRoute}, isAuthRoutePage=${isAuthRoutePage}`);

  if (pathname && pathname !== '/' && !isAppRoute && !isAuthRoutePage ) {
    debugLog(`[MiddlewareV6-DEBUG] Pathname '${pathname}' ENTERED SLUG REWRITE Block's main IF condition.`);
    const slug = decodeURIComponent(pathname.substring(1));
    if (slug) {
      debugLog(`[MiddlewareV6-DEBUG] Slug detected: '${slug}' for pathname '${pathname}'. Preparing to rewrite.`);
      const rewriteUrl = new URL(`/api/internal/redirect/${slug}${search}`, originalRequestUrl);
      const newHeaders = new Headers(request.headers);
      if (typeof hostname === 'string' && hostname) newHeaders.set('x-original-host', hostname);
      else debugWarn('[MiddlewareV6] hostname is invalid or missing for slug rewrite, NOT setting x-original-host.');
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
    '/((?!_next/static|_next/image|favicon.ico|api/internal/validate-api-key).*)', // Exclude validate-api-key from general matcher if it causes loops
  ],
};
