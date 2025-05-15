
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { CustomDomainModel } from "@/models/CustomDomain";
import { NextResponse } from "next/server";

// GET all custom domains for the logged-in user
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const domains = await CustomDomainModel.findByUserId(session.user.id);
    return NextResponse.json(domains);

  } catch (error) {
    console.error("[API CUSTOM-DOMAINS GET] Error fetching custom domains:", error);
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
    const { domainName } = body;

    if (!domainName || typeof domainName !== 'string' || domainName.trim().length === 0) {
      return NextResponse.json({ message: "Domain name is required" }, { status: 400 });
    }

    // Basic domain name validation (can be enhanced)
    // This regex is a simple check, not fully RFC compliant but covers common cases.
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$/;
    if (!domainRegex.test(domainName.trim())) {
        return NextResponse.json({ message: "Invalid domain name format" }, { status: 400 });
    }

    try {
        const newDomain = await CustomDomainModel.create(session.user.id, domainName.trim());
        return NextResponse.json(newDomain, { status: 201 });
    } catch (dbError: any) {
        // Check for unique constraint violation (e.g., PostgreSQL error code 23505)
        // MongoDB driver might throw an error with a code property (e.g., 11000 for duplicate key)
        if (dbError.code === '23505' || dbError.code === 11000) { 
             return NextResponse.json({ message: "Domain already added or conflict." }, { status: 409 }); // 409 Conflict
        }
        throw dbError; // Re-throw if it's not a known duplicate error
    }

  } catch (error: any) {
    console.error("[API CUSTOM-DOMAINS POST] Error creating custom domain:", error);
    // Ensure a response is always sent for other errors too
    if (error.message.includes("Invalid domain name format")) { // Example of re-checking specific error
        return NextResponse.json({ message: "Invalid domain name format" }, { status: 400 });
    }
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
