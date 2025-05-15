
// src/lib/auth-routes.ts

/**
 * An array of routes that are accessible to the public.
 * These routes do not require authentication.
 * @type {string[]}
 */
export const publicRoutes: string[] = [
  "/", // Your homepage
  // Add any other public pages like /about, /pricing, etc.
];

/**
 * An array of routes that are used for authentication.
 * These routes will redirect logged-in users to DEFAULT_LOGIN_REDIRECT.
 * @type {string[]}
 */
export const authRoutes: string[] = [
  "/login",
  "/register",
  // Add other auth-related routes like /api/auth/error, /forgot-password, etc.
];

/**
 * The prefix for API authentication routes.
 * Routes that start with this prefix are used for API authentication purposes.
 * @type {string}
 */
export const apiAuthPrefix: string = "/api/auth";

/**
 * The default redirect path after a successful login.
 * @type {string}
 */
export const DEFAULT_LOGIN_REDIRECT: string = "/dashboard";

/**
 * Routes that require authentication to access.
 * Add prefixes of your protected application areas here.
 * @type {string[]}
 */
export const protectedAppRoutesPrefixes: string[] = [
  "/dashboard",
  "/settings",
  "/links",
  "/analytics",
  "/features",
];
