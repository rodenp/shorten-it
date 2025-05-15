
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { UserPreferenceModel, UserPreference, Theme } from "@/models/UserPreference";
import { NextResponse } from "next/server";

// GET user preferences
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const preferences = await UserPreferenceModel.findByUserId(session.user.id);
    return NextResponse.json(preferences);

  } catch (error) {
    console.error("[API USER-PREFERENCES GET] Error fetching preferences:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// PUT (update/create) user preferences
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { theme, isCompactMode } = body;

    const updateData: Partial<Pick<UserPreference, 'theme' | 'isCompactMode'>> = {};

    if (theme !== undefined) {
      if (!['light', 'dark', 'system'].includes(theme)) {
        return NextResponse.json({ message: "Invalid theme value" }, { status: 400 });
      }
      updateData.theme = theme as Theme;
    }

    if (isCompactMode !== undefined) {
      if (typeof isCompactMode !== 'boolean') {
        return NextResponse.json({ message: "Invalid isCompactMode value" }, { status: 400 });
      }
      updateData.isCompactMode = isCompactMode;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No preferences data provided" }, { status: 400 });
    }

    const updatedPreferences = await UserPreferenceModel.upsert(session.user.id, updateData);
    return NextResponse.json(updatedPreferences);

  } catch (error: any) {
    console.error("[API USER-PREFERENCES PUT] Error updating preferences:", error);
    if (error instanceof SyntaxError) { 
        return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
