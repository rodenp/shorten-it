import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOGIN_REDIRECT, authRoutes, publicRoutes, protectedAppRoutesPrefixes } from "@/lib/auth-routes";
import { withAuth } from 'next-auth/middleware';
import { debugLog, debugWarn } from '@/lib/logging';

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
  const { pathname, search } = request.nextUrl;
  const originalRequestUrl = request.url;
  const forwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = request.headers.get('host');

  let hostname: string | null = null;
  if (forwardedHost) {
    hostname = forwardedHost.split(',')[0].trim();
  } else if (hostHeader) {
    hostname = hostHeader;
  } else if (originalRequestUrl) {
    try {
      hostname = new URL(originalRequestUrl).hostname;
    } catch (e) {
      console.error('[MiddlewareV6] Error parsing URL for hostname:', e);
    }
  }

<<<<<<< Updated upstream
  // ✅ APPLY ONLY TO lnker.me
  const baseDomain = 'lnker.me';
  if (!hostname?.endsWith(baseDomain)) {
    return NextResponse.next(); // 👈 skip middleware for other domains
  }

  // ✅ Extract subdomain if present
=======
  const baseDomain = process.env.NEXT_PUBLIC_SHORTENER_DOMAIN;
  const appSubdomainAndScheme = process.env.APP_URL;
  const appSubdomain = new URL(process.env.APP_URL!).hostname;
  const isAppHost = hostname === appSubdomain;

  debugLog(`[MiddlewareV6 - ENTRY] Request for pathname: '${pathname}'. appSubdomain: ${appSubdomain}, Determined host: ${hostname} (from ${determinedHostForLog})`);

>>>>>>> Stashed changes
  let subdomain: string | null = null;
  if (hostname !== baseDomain && hostname.endsWith(`.${baseDomain}`)) {
    subdomain = hostname.replace(`.${baseDomain}`, '');
    request.headers.set('x-subdomain', subdomain);
    debugLog(`[MiddlewareV6] Detected appSubdomain = ${appSubdomain}, subdomain: ${subdomain}`);
  }

  debugLog(`[MiddlewareV6] appsubdomain: ${appSubdomain} Hostname: ${hostname}, Pathname: '${pathname}'`);

<<<<<<< Updated upstream
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    ['.+', '/manifest.json', '/robots.txt', '/favicon.ico'].includes(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/internal/redirect/')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    if (pathname.startsWith('/api/auth/')) {
      // @ts-ignore
      return nextAuthMiddleware(request);
    } else if (pathname.startsWith('/api/internal/validate-api-key')) {
=======
  if (isAppHost) {
    debugLog(`[MiddlewareV6-DEBUG] in isAppHost condition: appsubdomain: ${appSubdomain} Hostname: ${hostname}, Pathname: '${pathname}`);
    if (pathname.startsWith('/_next') || pathname.startsWith('/static') || ['.+', '/manifest.json', '/robots.txt', '/favicon.ico'].includes(pathname)) {
      debugLog(`[MiddlewareV6-DEBUG] Path '${pathname}' is a static/framework asset. Calling NextResponse.next().`);
>>>>>>> Stashed changes
      return NextResponse.next();
    } else {
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
            } else if (apiKeyValidationApiResponse.status === 401) {
              const errorData = await apiKeyValidationApiResponse.json();
              return NextResponse.json({ message: errorData.message || 'Invalid API Key' }, { status: 401 });
            }
          } catch (e) {
            console.error('[MiddlewareV6] Error calling API key validation:', e);
          }

          if (apiKeyInfo?.success && apiKeyInfo.userId && apiKeyInfo.permissions) {
            let requiredPermission = '';
            if (pathname.startsWith('/api/links')) {
              if (['POST', 'PUT', 'DELETE'].includes(request.method)) requiredPermission = 'links:write';
              else if (request.method === 'GET') requiredPermission = 'links:read';
            } else if (pathname.startsWith('/api/analytics')) {
              requiredPermission = 'analytics:read';
            } else if (pathname.startsWith('/api/domains')) {
              if (['POST', 'PUT', 'DELETE'].includes(request.method)) requiredPermission = 'domains:write';
              else requiredPermission = 'domains:read';
            } else if (pathname.startsWith('/api/folders')) {
              if (['POST', 'PUT', 'DELETE'].includes(request.method)) requiredPermission = 'domains:write';
              else requiredPermission = 'domains:read';
            } else if (pathname.startsWith('/api/campaign-templates')) {
              if (['POST', 'PUT', 'DELETE'].includes(request.method)) requiredPermission = 'campaigns:write';
              else requiredPermission = 'campaigns:read';
            } else if (pathname.startsWith('/api/retargeting-pixels')) {
              if (['POST', 'PUT', 'DELETE'].includes(request.method)) requiredPermission = 'pixels:write';
              else requiredPermission = 'pixels:read';
            }

            if (hasApiPermission(apiKeyInfo.permissions, requiredPermission)) {
              const requestHeaders = new Headers(request.headers);
              requestHeaders.set('x-api-user-id', apiKeyInfo.userId);
              requestHeaders.set('x-api-key-permissions', apiKeyInfo.permissions.join(','));
              requestHeaders.set('x-api-key-authenticated', 'true');
              if (subdomain) requestHeaders.set('x-subdomain', subdomain);
              return NextResponse.next({ request: { headers: requestHeaders } });
            } else {
              return NextResponse.json({ message: `Missing permission: ${requiredPermission}` }, { status: 403 });
            }
          } else if (!apiKeyValidationApiResponse?.ok && apiKeyValidationApiResponse.status !== 401) {
            return NextResponse.json({ message: 'API key validation error' }, { status: 500 });
          }
        }
      }

      // Fallback to next-auth
      // @ts-ignore
      return nextAuthMiddleware(request);
    }
  } else {
      debugLog(`[MiddlewareV6-DEBUG] NOT in isAppHost condition: appsubdomain: ${appSubdomain} Hostname: ${hostname}, Pathname: '${pathname}`);
  }

  if (pathname.startsWith('/api')) {
    debugLog(`[MiddlewareV6-DEBUG] pathname starts with /api skipping: request.url: ${request.url} appsubdomain: ${appSubdomain} Hostname: ${hostname}, Pathname: '${pathname}`);
    return NextResponse.next();
  }

  // Slug rewrites for public short URLs
  const isAppRoute = protectedAppRoutesPrefixes.some(prefix => pathname.startsWith(prefix));
  const isAuthRoutePage = authRoutes.includes(pathname);

<<<<<<< Updated upstream
  if (pathname !== '/' && !isAppRoute && !isAuthRoutePage) {
    const slug = decodeURIComponent(pathname.substring(1));
    if (slug) {
      const rewriteUrl = new URL(`/api/internal/redirect/${slug}${search}`, originalRequestUrl);
      const newHeaders = new Headers(request.headers);
      if (hostname) newHeaders.set('x-original-host', hostname);
      if (subdomain) newHeaders.set('x-subdomain', subdomain);
      newHeaders.set('x-link-redirect-lookup', 'true');
      return NextResponse.rewrite(rewriteUrl, { request: { headers: newHeaders } });
    }
=======
  if (pathname && pathname !== '/' && !isAppHost) {
      debugLog(`[MiddlewareV6-DEBUG] Pathname '${pathname}' ENTERED SLUG REWRITE Block's main IF condition.`);
      const slug = decodeURIComponent(pathname.substring(1));
      if (slug) {
        debugLog(`[MiddlewareV6-DEBUG] Slug detected: '${slug}' for pathname '${pathname}, hostname=${hostname}, subdomain=${subdomain}'. Preparing to rewrite.`);
        const rewriteUrl = new URL(`/api/internal/redirect/${slug}${search}`, appSubdomainAndScheme);
        const newHeaders = new Headers(request.headers);
        if (hostname) newHeaders.set('x-original-host', hostname);
        if (subdomain) newHeaders.set('x-subdomain', subdomain);
        newHeaders.set('x-link-redirect-lookup', 'true');
        debugLog(`[MiddlewareV6-ACTION] REWRITING slug '${slug}' for pathname '${pathname}' to: ${rewriteUrl.toString()}`);
        return NextResponse.rewrite(rewriteUrl, { request: { headers: newHeaders } });
      } else {
        debugWarn(`[MiddlewareV6-DEBUG] Pathname '${pathname}' entered slug block, but extracted slug was empty. Passing to nextAuthMiddleware.`);
        // @ts-ignore
        return NextResponse.next();
      }
>>>>>>> Stashed changes
  }

  // Default protected route check
  // @ts-ignore
  return nextAuthMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/internal/validate-api-key).*)',
  ],
};