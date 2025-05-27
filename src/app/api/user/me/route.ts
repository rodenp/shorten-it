import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from "next-auth/next";
import { signOut } from "next-auth/react"; // For client-side, but server-side might need different handling for session termination
import { authOptions } from "@/lib/auth";
import { UserModel } from '@/models/User';
import { deleteUserAccount } from '@/lib/userService'; // The service function for actual deletion
import bcrypt from 'bcryptjs';

// DELETE /api/user/me - Delete the authenticated user's account
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Re-authentication: Require current password
    const body = await request.json();
    const { currentPassword } = body;

    if (!currentPassword) {
      return NextResponse.json({ message: "Current password is required for account deletion." }, { status: 400 });
    }

    const user = await UserModel.findById(userId); // Fetches the user including their hashed password
    if (!user || !user.password) {
      // User not found or password not set (e.g., OAuth user without a local password)
      // For OAuth users without a local password, this check would fail.
      // A different re-authentication mechanism might be needed for them, or skip password check if provider is not 'credentials'.
      // For now, assuming users who can delete have a password.
      console.error(`[API USER ME DELETE] User ${userId} not found or has no password for re-authentication.`);
      return NextResponse.json({ message: "Re-authentication failed: User not found or no password set." }, { status: 403 });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ message: "Re-authentication failed: Incorrect password." }, { status: 403 });
    }

    // Proceed with account deletion
    const deletionResult = await deleteUserAccount(userId);

    if (!deletionResult.success) {
      // Use message from service if available, otherwise a generic one
      return NextResponse.json({ message: deletionResult.message || "Account deletion failed." }, { status: 500 });
    }

    // Session Invalidation:
    // If using NextAuth.js with database sessions, the session record is deleted by ON DELETE CASCADE.
    // For JWTs, they remain valid until expiry. Client-side should handle removing the token.
    // No explicit server-side JWT invalidation is done here unless a blocklist mechanism is in place.
    // The client will need to handle the redirect to logout/homepage after this.
    // Forcing a signout for the current session if NextAuth.js is managing it directly via server-side sessions
    // is complex from an API route. Typically, client is responsible for clearing local session state.
    // This response indicates success; client should then call its local signOut().

    return new NextResponse(null, { status: 204 }); // 204 No Content for successful deletion

  } catch (error: any) {
    console.error("[API USER ME DELETE] Error deleting user account:", error);
    if (error instanceof SyntaxError) { // JSON parsing error for request body
        return NextResponse.json({ message: "Invalid JSON payload." }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal server error during account deletion." }, { status: 500 });
  }
}
