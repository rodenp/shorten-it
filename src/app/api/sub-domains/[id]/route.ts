import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { DomainModel } from "@/models/Domains"; // Changed to DomainModel
import { Domain } from "@/models/Domains"; // Import Domain interface for type casting


interface RouteContext {
  params: { id: string };
}

// GET a specific subdomain (now a 'local' domain)
export async function GET(request: Request, context: RouteContext) {
  const { params } = context;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const domain = await DomainModel.findById(params.id); // Use DomainModel
    if (!domain) {
      return NextResponse.json({ message: "Domain not found" }, { status: 404 });
    }
    // Verify ownership and type
    if (domain.userId !== session.user.id || domain.type !== 'local') {
      return NextResponse.json({ message: "Forbidden or not a local domain" }, { status: 403 });
    }

    return NextResponse.json(domain);
  } catch (error) {
    console.error(`[API SUB-DOMAINS ID GET] Error fetching ${params.id}:`, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// PUT (update) a specific subdomain
export async function PUT(request: Request, context: RouteContext) {
  const { params } = context;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const { subdomainName } = body; // Assuming the payload sends 'subdomainName'

    if (!subdomainName || typeof subdomainName !== "string" || subdomainName.trim().length === 0) {
      return NextResponse.json({ message: "Missing subdomain name" }, { status: 400 });
    }
    
    // Validate subdomainName format (similar to POST in sub-domains/route.ts)
    const domainStr = subdomainName.trim().toLowerCase();
    const simpleHostRegex = /^(?!-)(?:[A-Za-z0-9-]+\.)+[A-Za-z0-9-]+$/; // Or a more specific one for subdomains if needed
    if (!simpleHostRegex.test(domainStr)) {
         return NextResponse.json({ message: "Invalid subdomain name format" }, { status: 400 });
    }

    // Check if domain exists and belongs to user and is of type 'local'
    const existingDomain = await DomainModel.findById(params.id);
    if (!existingDomain) {
        return NextResponse.json({ message: "Domain not found" }, { status: 404 });
    }
    if (existingDomain.userId !== userId || existingDomain.type !== 'local') {
        return NextResponse.json({ message: "Forbidden or not a local domain" }, { status: 403 });
    }
    if (existingDomain.verified) {
        return NextResponse.json({ message: "Verified domains cannot be renamed through this endpoint." }, { status: 400 });
    }

    const updateData: Partial<Pick<Domain, 'domainName'>> = { domainName: domainStr };
    
    const updatedDomain = await DomainModel.update(params.id, userId, updateData);
    if (!updatedDomain) {
        // This might happen if the update fails due to concurrent modification or other DB errors
        return NextResponse.json({ message: "Failed to update subdomain" }, { status: 500 });
    }
    return NextResponse.json(updatedDomain);
  } catch (error) {
    console.error(`[API SUB-DOMAINS ID PUT] Error updating ${params.id}:`, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// DELETE a specific subdomain
export async function DELETE(request: Request, context: RouteContext) {
  const { params } = context;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Check if domain exists and belongs to user and is of type 'local'
    const existingDomain = await DomainModel.findById(params.id);
    if (!existingDomain) {
        return NextResponse.json({ message: "Domain not found" }, { status: 404 });
    }
    if (existingDomain.userId !== userId || existingDomain.type !== 'local') {
        return NextResponse.json({ message: "Forbidden or not a local domain" }, { status: 403 });
    }

    const result = await DomainModel.delete(params.id, userId);
    if (!result.success) {
        return NextResponse.json({ message: result.message || "Failed to delete subdomain" }, { status: 500 });
    }
    return NextResponse.json({ message: "Subdomain deleted successfully" });
  } catch (error) {
    console.error(`[API SUB-DOMAINS ID DELETE] Error deleting ${params.id}:`, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}