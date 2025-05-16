
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; 

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

export async function getUserIdFromRequest(request: Request): Promise<string | null> {
  // Check for API key-derived user ID first
  const apiUserId = request.headers.get('x-api-user-id');
  if (apiUserId) {
    debugLog(`[auth-utils] User ID from x-api-user-id header: ${apiUserId}`);
    return apiUserId;
  }

  // Fallback to session-based user ID
  // Ensure that authOptions are correctly passed or accessible if this is called in a different context
  // For Next.js API routes and middleware, getServerSession typically handles this correctly.
  const session = await getServerSession(authOptions);
  if (session && session.user && session.user.id) {
    debugLog(`[auth-utils] User ID from session: ${session.user.id}`);
    return session.user.id;
  }
  
  debugWarn("[auth-utils] No user ID found from x-api-user-id header or active session.");
  return null;
}
