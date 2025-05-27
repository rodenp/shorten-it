
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ApiKeyModel } from "@/models/ApiKey";
import { NextResponse } from "next/server";

interface RouteParams {
  params: { id: string };
}

// PUT (update) an API key's name and/or permissions
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const apiKeyId = params.id;

    const body = await request.json();
    const { name, permissions } = body;

    const updateData: Partial<Pick<ApiKey, 'name' | 'permissions'>> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
        return NextResponse.json({ message: "Invalid API key name (must be 1-100 chars)" }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (permissions !== undefined) {
      if (!Array.isArray(permissions) || !permissions.every(p => typeof p === 'string' && p.trim().length > 0)) {
        return NextResponse.json({ message: "Invalid permissions format (must be an array of non-empty strings)" }, { status: 400 });
      }
      // TODO: Validate permissions against a known list of valid permission strings if applicable
      updateData.permissions = permissions;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No update data provided (name or permissions)" }, { status: 400 });
    }

    // ApiKeyModel.update will handle checking if the key belongs to the user
    const updatedApiKey = await ApiKeyModel.update(apiKeyId, userId, updateData);

    if (!updatedApiKey) {
      return NextResponse.json({ message: "API Key not found or update failed" }, { status: 404 });
    }

    // Return the updated key metadata (excluding the hashedKey)
    return NextResponse.json(updatedApiKey);

  } catch (error: any) {
    console.error(`[API API-KEYS ID PUT] Error updating API key ${params.id}:`, error);
    if (error instanceof SyntaxError) { // JSON parsing error
        return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
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
