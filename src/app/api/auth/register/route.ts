
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { UserModel } from '@/models/User';
import { DB_TYPE, createPostgresTables } from '@/lib/db'; // Import createPostgresTables

export async function POST(request: Request) {
  try {
    // Ensure tables are created if using Postgres and they don't exist
    // This is a good place to do it for the register route
    if (DB_TYPE === 'postgres') {
      try {
        await createPostgresTables();
      } catch (tableError) {
        console.error("Failed to ensure PostgreSQL tables exist:", tableError);
        return NextResponse.json({ message: 'Database initialization error.' }, { status: 500 });
      }
    }

    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Missing required fields (name, email, password).' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return NextResponse.json({ message: 'User with this email already exists.' }, { status: 409 }); // 409 Conflict
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      // emailVerified and image can be null or set later
    });

    // Don't return the full user object, especially not the password
    return NextResponse.json({ message: 'User registered successfully', userId: newUser.id || newUser._id?.toHexString() }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    let message = 'An internal server error occurred.';
    if (error instanceof Error) {
        // Check for specific DB errors if needed, e.g., unique constraint violation if findByEmail somehow missed it
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}
