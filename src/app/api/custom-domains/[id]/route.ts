
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { DomainModel } from "@/models/Domains"; // Changed to DomainModel
import { NextResponse } from "next/server";
import { Domain } from "@/models/Domains"; // Import Domain interface for type casting

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

    // Use DomainModel and ensure userId is passed if required by the model's method signature
    const domain = await DomainModel.findById(params.id); // Assuming findById in DomainModel does not require userId, or it's handled if it does.
                                                          // Based on the updated DomainModel, findById does NOT take userId.
                                                          // Ownership check is manual after fetching.
    if (!domain) {
      return NextResponse.json({ message: "Domain not found" }, { status: 404 });
    }
    if (domain.userId !== session.user.id) { // Manual ownership check
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
    const userId = session.user.id; // Get userId for update method

    const existingDomain = await DomainModel.findById(params.id); // Check existence and ownership
    if (!existingDomain) {
      return NextResponse.json({ message: "Domain not found" }, { status: 404 });
    }
    if (existingDomain.userId !== userId) {
      return NextResponse.json({ message: "Forbidden - You do not own this domain" }, { status: 403 });
    }

    const body = await request.json();
    const { domainName, verified } = body;
    
    // Ensure type compatibility with Domain interface from DomainModel
    const updateData: Partial<Pick<Domain, 'domainName' | 'verified'>> = {}; 
    if (domainName !== undefined && typeof domainName === 'string' && domainName.trim().length > 0) {
        const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$/;
        if (!domainRegex.test(domainName.trim())) {
            return NextResponse.json({ message: "Invalid domain name format for update" }, { status: 400 });
        }
        // Note: DomainModel.update logic should handle if domainName changes are allowed (e.g., for 'custom' type if not verified)
        updateData.domainName = domainName.trim();
    }
    if (verified !== undefined && typeof verified === 'boolean') {
      // Only allow 'verified' to be updated if the domain type is 'custom'
      if (existingDomain.type !== 'custom') {
        return NextResponse.json({ message: "Verification status can only be updated for 'custom' domains." }, { status: 400 });
      }
      updateData.verified = verified;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No update data provided" }, { status: 400 });
    }

    // Use DomainModel.update, ensuring userId is passed
    const updatedDomain = await DomainModel.update(params.id, userId, updateData);
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
    const userId = session.user.id; // Get userId for delete method

    // Check ownership before deleting
    const domain = await DomainModel.findById(params.id); 
    if (!domain) {
      return NextResponse.json({ message: "Domain not found" }, { status: 404 });
    }
    if (domain.userId !== userId) {
      return NextResponse.json({ message: "Forbidden - You do not own this domain" }, { status: 403 });
    }

    // Use DomainModel.delete, ensuring userId is passed
    const result = await DomainModel.delete(params.id, userId);
    if (!result.success) {
      return NextResponse.json({ message: result.message || "Failed to delete domain" }, { status: 500 });
    }
    return NextResponse.json({ message: "Domain deleted successfully" }, { status: 200 }); // Or 204 No Content

  } catch (error) {
    console.error(`[API CUSTOM-DOMAINS ID DELETE] Error deleting domain ${params.id}:`, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
