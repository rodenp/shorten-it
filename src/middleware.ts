
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
  const { pathname, search } = request.nextUrl;
  const hostname = request.headers.get('host') || new URL(request.url).hostname;

  // Static files, Next.js internals, and specific public assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') || // If you have a /static folder
    ['/favicon.ico', '/manifest.json', '/robots.txt'].includes(pathname)
  ) {
    return NextResponse.next();
  }

  // API routes (except our redirect handler)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/internal/redirect/')) {
     // If it's an API auth route, let NextAuth handle it via its own mechanisms or by falling through to nextAuthMiddleware
    if (pathname.startsWith('/api/auth/')) {
        // nextAuthMiddleware will correctly handle /api/auth calls if needed
    } else {
        return NextResponse.next(); // Other API routes pass through
    }
  }
  
  // Check if it's a potential short link slug (not a known app path, auth path, or root)
  const isAppRoute = protectedAppRoutesPrefixes.some(prefix => pathname.startsWith(prefix));
  const isAuthRoutePage = authRoutes.includes(pathname);

  if (
    pathname && 
    pathname !== '/' && 
    !isAppRoute && 
    !isAuthRoutePage &&
    !pathname.startsWith('/api/auth/') // Exclude next-auth api routes from slug handling
  ) {
    const slug = decodeURIComponent(pathname.substring(1));
    if (slug) {
      // Rewrite to the internal API redirect handler
      const rewriteUrl = new URL(`/api/internal/redirect/${slug}${search}`, request.url);
      rewriteUrl.headers.set('x-original-host', hostname);
      
      // Add a header to signal it's a rewrite for a potential link
      const headers = new Headers(request.headers);
      headers.set('x-link-redirect-lookup', 'true');
      headers.set('x-original-host', hostname);

      return NextResponse.rewrite(rewriteUrl, { request: { headers } });
    }
  }
  
  // If not a short link rewrite, defer to NextAuth.js middleware for app routes
  // @ts-ignore 
  return nextAuthMiddleware(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Public files in /public directory are implicitly excluded by Next.js if not matched here.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
