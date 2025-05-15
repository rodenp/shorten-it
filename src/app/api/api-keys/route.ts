
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ApiKeyModel, NewApiKeyResponse } from "@/models/ApiKey";
import { NextResponse } from "next/server";

// GET all API keys for the logged-in user (excluding the full key)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const apiKeys = await ApiKeyModel.findByUserId(session.user.id);
    return NextResponse.json(apiKeys);

  } catch (error) {
    console.error("[API API-KEYS GET] Error fetching API keys:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// POST to generate a new API key for the logged-in user
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, permissions } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ message: "Key name is required" }, { status: 400 });
    }
    // Basic validation for permissions array
    if (!Array.isArray(permissions) || !permissions.every(p => typeof p === 'string')) {
        return NextResponse.json({ message: "Permissions must be an array of strings" }, { status: 400 });
    }
    // You might want to validate against a predefined list of allowed permissions here

    const newApiKeyResponse: NewApiKeyResponse = await ApiKeyModel.create(
      session.user.id,
      name.trim(),
      permissions
    );
    
    // The raw key is in newApiKeyResponse.key and should be displayed to the user once.
    // The client-side will receive this full response.
    return NextResponse.json(newApiKeyResponse, { status: 201 });

  } catch (error: any) {
    console.error("[API API-KEYS POST] Error creating API key:", error);
    // Handle potential unique constraint errors if any (e.g. if key generation somehow conflicted, though unlikely with random + hash)
     if (error.code === '23505' || error.code === 11000) { // DB specific duplicate error codes
        return NextResponse.json({ message: "Failed to create key due to a conflict. Please try again." }, { status: 409 });
    }
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
