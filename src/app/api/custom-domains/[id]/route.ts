
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { CustomDomainModel } from "@/models/CustomDomain";
import { NextResponse } from "next/server";

interface RouteParams {
  params: { id: string };
}

// GET a specific custom domain by ID (mainly for checking ownership)
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const domain = await CustomDomainModel.findById(params.id);
    if (!domain) {
      return NextResponse.json({ message: "Domain not found" }, { status: 404 });
    }
    if (domain.userId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden - You do not own this domain" }, { status: 403 });
    }
    return NextResponse.json(domain);
  } catch (error) {
    console.error(`[API CUSTOM-DOMAINS ID GET] Error fetching domain ${params.id}:`, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}


// PUT to update a custom domain (e.g., verify status, or potentially change name though less common)
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const existingDomain = await CustomDomainModel.findById(params.id);
    if (!existingDomain) {
      return NextResponse.json({ message: "Domain not found" }, { status: 404 });
    }
    if (existingDomain.userId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden - You do not own this domain" }, { status: 403 });
    }

    const body = await request.json();
    // We only allow updating 'verified' status and potentially 'domainName' via this route.
    const { domainName, verified } = body;
    
    const updateData: Partial<Pick<CustomDomain, 'domainName' | 'verified'>> = {};
    if (domainName !== undefined && typeof domainName === 'string' && domainName.trim().length > 0) {
        // Add domain name validation if you allow updates to it
        const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$/;
        if (!domainRegex.test(domainName.trim())) {
            return NextResponse.json({ message: "Invalid domain name format for update" }, { status: 400 });
        }
        updateData.domainName = domainName.trim();
    }
    if (verified !== undefined && typeof verified === 'boolean') {
      updateData.verified = verified;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No update data provided" }, { status: 400 });
    }

    const updatedDomain = await CustomDomainModel.update(params.id, updateData);
    if (!updatedDomain) {
      return NextResponse.json({ message: "Failed to update domain" }, { status: 500 });
    }
    return NextResponse.json(updatedDomain);

  } catch (error) {
    console.error(`[API CUSTOM-DOMAINS ID PUT] Error updating domain ${params.id}:`, error);
    if (error instanceof SyntaxError) { 
        return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// DELETE a custom domain
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const domain = await CustomDomainModel.findById(params.id);
    if (!domain) {
      return NextResponse.json({ message: "Domain not found" }, { status: 404 });
    }
    if (domain.userId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden - You do not own this domain" }, { status: 403 });
    }

    const result = await CustomDomainModel.delete(params.id);
    if (!result.success) {
      return NextResponse.json({ message: result.message || "Failed to delete domain" }, { status: 500 });
    }
    return NextResponse.json({ message: "Domain deleted successfully" }, { status: 200 }); // Or 204 No Content

  } catch (error) {
    console.error(`[API CUSTOM-DOMAINS ID DELETE] Error deleting domain ${params.id}:`, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
