
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { LinkGroupModel } from "@/models/LinkGroup";
import { NextResponse } from "next/server";

interface RouteParams {
  params: { id: string };
}

// GET a specific link group (could be useful, though not explicitly in mock UI)
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const group = await LinkGroupModel.findById(params.id);
    if (!group) {
      return NextResponse.json({ message: "Link group not found" }, { status: 404 });
    }
    // Ensure the user owns this group
    if (group.userId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(group);
  } catch (error) {
    console.error(`[API LINK-GROUPS ID GET] Error fetching group ${params.id}:`, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}


// PUT to update a link group
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // First, verify the group exists and belongs to the user (done by LinkGroupModel.update too, but good practice)
    const existingGroup = await LinkGroupModel.findById(params.id);
    if (!existingGroup || existingGroup.userId !== session.user.id) {
      return NextResponse.json({ message: "Link group not found or not owned by user" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description } = body;
    
    const updateData: Partial<Pick<LinkGroup, 'name' | 'description'>> = {};
    if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ message: "Group name cannot be empty" }, { status: 400 });
        }
        updateData.name = name.trim();
    }
    if (description !== undefined) { // Allow empty string for description to clear it
        if (typeof description !== 'string') {
             return NextResponse.json({ message: "Description must be a string" }, { status: 400 });
        }
        updateData.description = description.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No update data provided" }, { status: 400 });
    }
    try {
        const updatedGroup = await LinkGroupModel.update(params.id, session.user.id, updateData);
        if (!updatedGroup) {
            // This could happen if the underlying update failed or did not find the record matching id and userId
            return NextResponse.json({ message: "Failed to update link group, or group not found for user" }, { status: 404 });
        }
        return NextResponse.json(updatedGroup);
    } catch (dbError: any) {
        if (dbError.code === '23505' || dbError.code === 11000) { 
             return NextResponse.json({ message: "A group with this name already exists." }, { status: 409 });
        }
        console.error(`[API LINK-GROUPS ID PUT] DB Error updating group ${params.id}:`, dbError);
        throw dbError;
    }

  } catch (error: any) {
    console.error(`[API LINK-GROUPS ID PUT] Error updating group ${params.id}:`, error);
    if (error instanceof SyntaxError) { 
        return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE a link group
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // The model's delete function ensures user owns the group
    const result = await LinkGroupModel.delete(params.id, session.user.id);
    if (!result.success) {
      return NextResponse.json({ message: result.message || "Link group not found or cannot be deleted" }, { status: 404 });
    }
    return NextResponse.json({ message: "Link group deleted successfully" }, { status: 200 });

  } catch (error) {
    console.error(`[API LINK-GROUPS ID DELETE] Error deleting group ${params.id}:`, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
