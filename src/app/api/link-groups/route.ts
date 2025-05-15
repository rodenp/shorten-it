
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { LinkGroupModel } from "@/models/LinkGroup";
import { NextResponse } from "next/server";

// GET all link groups for the logged-in user
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const groups = await LinkGroupModel.findByUserId(session.user.id);
    return NextResponse.json(groups);

  } catch (error) {
    console.error("[API LINK-GROUPS GET] Error fetching link groups:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// POST a new link group for the logged-in user
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ message: "Group name is required" }, { status: 400 });
    }
    if (description && typeof description !== 'string') {
        return NextResponse.json({ message: "Description must be a string if provided" }, { status: 400 });
    }

    try {
        const newGroup = await LinkGroupModel.create(session.user.id, name.trim(), description?.trim());
        return NextResponse.json(newGroup, { status: 201 });
    } catch (dbError: any) {
        // Check for unique constraint violation (e.g., PostgreSQL error code 23505 or MongoDB 11000)
        if (dbError.code === '23505' || dbError.code === 11000) { 
             return NextResponse.json({ message: "A group with this name already exists." }, { status: 409 });
        }
        console.error("[API LINK-GROUPS POST] DB Error:", dbError); // Log other DB errors
        throw dbError; // Re-throw if it's not a known duplicate error
    }

  } catch (error: any) {
    console.error("[API LINK-GROUPS POST] Error creating link group:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
