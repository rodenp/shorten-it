
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { DomainModel } from "@/models/Domains";
import { NextResponse } from "next/server";
import { DomainType } from '@/types';
import { debugLog } from '@/lib/logging';

// GET all custom domains for the logged-in user
export async function GET(request: Request) {
  try {

    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const url  = new URL(request.url);
    const raw = url.searchParams.get('types') ?? ''
    const types = raw
        .split(',')
        .map(t => t.trim())
        .filter((t): t is DomainType => t === 'local' || t === 'custom')
    debugLog("src/app/api/doamins:Domain type:", types);

    const domains = await DomainModel.findByUserId(session.user.id, types);
    return NextResponse.json(domains);

  } catch (error) {
    console.error("[API DOMAINS GET] Error fetching sub domains:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// POST a new custom domain for the logged-in user
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { domainName, type } = body;

    if (!domainName || typeof domainName !== 'string' || domainName.trim().length === 0) {
      return NextResponse.json({ message: "Sub Domain name is required" }, { status: 400 });
    }
    if (type !== 'local' && type !== 'custom') {
      return NextResponse.json({ message: "invalid domain type" }, { status: 400 });
    }

    const domain = domainName.trim().toLowerCase();

    // permissive check:
    const simpleHostRegex = /^(?!-)(?:[A-Za-z0-9-]+\.)+[A-Za-z0-9-]+$/;
    if (!simpleHostRegex.test(domain)) {
      return NextResponse.json(
        { message: "Invalid domain name format" },
        { status: 400 }
      );
    }

    try {
        const newDomain = await DomainModel.create(session.user.id, domainName.trim());
        return NextResponse.json(newDomain, { status: 201 });
    } catch (dbError: any) {
        // Check for unique constraint violation (e.g., PostgreSQL error code 23505)
        // MongoDB driver might throw an error with a code property (e.g., 11000 for duplicate key)
        if (dbError.code === '23505' || dbError.code === 11000) { 
             return NextResponse.json({ message: "Sub Domain already added or conflict." }, { status: 409 }); // 409 Conflict
        }
        throw dbError; // Re-throw if it's not a known duplicate error
    }

  } catch (error: any) {
    console.error("[API DOMAINS POST] Error creating sub domain:", error);
    // Ensure a response is always sent for other errors too
    if (error.message.includes("Invalid sub domain name format")) { // Example of re-checking specific error
        return NextResponse.json({ message: "Invalid sub domain name format" }, { status: 400 });
    }
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
