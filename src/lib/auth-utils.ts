
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Assuming authOptions is exported from src/lib/auth.ts

export async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (session && session.user && session.user.id) {
    return session.user.id;
  }
  console.warn("No active session or user ID found from getServerSession.");
  return null;
}
