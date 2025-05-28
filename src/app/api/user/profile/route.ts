
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { UserModel, User } from "@/models/User";
import { NextResponse } from "next/server";
import { DB_TYPE } from "@/lib/db";
import bcrypt from 'bcryptjs'; // Moved bcrypt import to the top

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await UserModel.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      fullName: user.name,
      email: user.email,
      avatarUrl: user.image,
    });

  } catch (error) {
    console.error("[API PROFILE GET] Error fetching user profile:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, email, avatarUrl, currentPassword, newPassword, confirmPassword } = body;

    const updateData: Partial<Pick<User, 'name' | 'email' | 'image' | 'password'>> = {};

    if (fullName !== undefined) updateData.name = fullName;
    if (email !== undefined) updateData.email = email; // Note: consider email uniqueness and verification flow if changed
    if (avatarUrl !== undefined) updateData.image = avatarUrl;

    // Password change logic
    if (newPassword) {
      if (newPassword !== confirmPassword) {
        return NextResponse.json({ message: "New passwords do not match" }, { status: 400 });
      }
      // Verify current password before allowing update
      if (!currentPassword) {
        return NextResponse.json({ message: "Current password is required to set a new password" }, { status: 400 });
      }
      const currentUser = await UserModel.findById(session.user.id);
      if (!currentUser || !currentUser.password) {
        return NextResponse.json({ message: "User not found or no password set" }, { status: 404 });
      }
      
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
      if (!isCurrentPasswordValid) {
        return NextResponse.json({ message: "Invalid current password" }, { status: 400 });
      }
      updateData.password = newPassword; // The UserModel.update will hash this
    }

    if (Object.keys(updateData).length === 0) {
        // If only password fields were sent but they were empty or didn't meet criteria above,
        // it's possible to reach here. Check if only password related fields were intended for update.
        const onlyPasswordFieldsSent = newPassword !== undefined || currentPassword !== undefined || confirmPassword !== undefined;
        if (!onlyPasswordFieldsSent) {
            return NextResponse.json({ message: "No update data provided" }, { status: 400 });
        }
    }

    const updatedUser = await UserModel.update(session.user.id, updateData);

    if (!updatedUser) {
      // This could happen if UserModel.update returns null (e.g. user not found after an update attempt)
      // or if no actual fields were updated and UserModel.update returned the original unmodified user or null.
      // For simplicity, we'll treat it as a failure if updatedUser is null.
      return NextResponse.json({ message: "Failed to update user profile or no changes made" }, { status: 500 });
    }

    return NextResponse.json({
      message: "Profile updated successfully",
      user: {
        fullName: updatedUser.name,
        email: updatedUser.email,
        avatarUrl: updatedUser.image,
      }
    });

  } catch (error) {
    console.error("[API PROFILE PUT] Error updating user profile:", error);
    if (error instanceof SyntaxError) { 
        return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
