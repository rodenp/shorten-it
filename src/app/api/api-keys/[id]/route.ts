
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ApiKeyModel } from "@/models/ApiKey";
import { NextResponse } from "next/server";

interface RouteParams {
  params: { id: string };
}

// DELETE (revoke) an API key
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // The ApiKeyModel.delete method already includes a check for userId
    // to ensure a user can only delete their own keys.
    const result = await ApiKeyModel.delete(params.id, session.user.id);

    if (!result.success) {
      // If the model returned a specific message (e.g., "Invalid ID format" or key not found for user)
      const message = result.message || "API Key not found or you do not have permission to delete it.";
      // Determine appropriate status code. 404 if not found, 403 if technically found but not owned (though model prevents this)
      return NextResponse.json({ message }, { status: result.message?.includes("Invalid ID") ? 400 : 404 });
    }
    
    return NextResponse.json({ message: "API Key revoked successfully" }, { status: 200 }); // Or 204 No Content

  } catch (error) {
    console.error(`[API API-KEYS ID DELETE] Error revoking API key ${params.id}:`, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
