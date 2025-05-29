import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions, getUserIdFromRequest } from "@/lib/auth"; // Assuming getUserIdFromRequest is in auth
import { UserConsentModel, ConsentType } from '@/models/UserConsent';

// GET /api/user/me/consents - Fetch all consents for the logged-in user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const consents = await UserConsentModel.findAllByUserId(userId);
    
    // Optionally, transform into a map for easier client-side consumption
    // e.g., { ANALYTICS_PROCESSING: true, MARKETING_EMAILS: false }
    const consentMap: Partial<Record<ConsentType, boolean>> = {};
    for (const consent of consents) {
        consentMap[consent.consentType] = consent.isGiven;
    }
    // Ensure all known consent types are present, defaulting to false if not explicitly set
    const allConsentTypes: ConsentType[] = ['ANALYTICS_PROCESSING', 'MARKETING_EMAILS']; // Define all manageable types
    for (const type of allConsentTypes) {
        if (!(type in consentMap)) {
            consentMap[type] = false; // Default to false if no record found
        }
    }

    return NextResponse.json(consentMap);

  } catch (error) {
    console.error("[API USER CONSENTS GET] Error fetching user consents:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// POST /api/user/me/consents - Update a specific consent for the logged-in user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const { consentType, isGiven } = body;

    // Validate input
    if (!consentType || typeof consentType !== 'string') {
      return NextResponse.json({ message: "consentType is required and must be a string" }, { status: 400 });
    }
    if (typeof isGiven !== 'boolean') {
      return NextResponse.json({ message: "isGiven is required and must be a boolean" }, { status: 400 });
    }

    // Validate consentType against known types if necessary
    const validConsentTypes: ConsentType[] = ['ANALYTICS_PROCESSING', 'MARKETING_EMAILS']; // Add other types as they become manageable
    if (!validConsentTypes.includes(consentType as ConsentType)) {
        return NextResponse.json({ message: `Invalid consentType: ${consentType}` }, { status: 400 });
    }

    const updatedConsent = await UserConsentModel.upsert(userId, consentType as ConsentType, isGiven);
    
    return NextResponse.json(updatedConsent, { status: 200 }); // Return updated consent or 204 No Content

  } catch (error: any) {
    console.error("[API USER CONSENTS POST] Error updating user consent:", error);
    if (error.message.includes("Invalid consentType")) { // Example of specific error handling
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
