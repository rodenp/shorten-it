import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { SubDomainModel } from "@/models/SubDomain";

interface RouteContext {
  params: { id: string };
}

// GET a specific subdomain
export async function GET(request: Request, context: RouteContext) {
  const { params } = context;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const subdomain = await SubDomainModel.findById(params.id, session.user.id);
    if (!subdomain) {
      return NextResponse.json({ message: "Subdomain not found" }, { status: 404 });
    }

    return NextResponse.json(subdomain);
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

    const { name } = await request.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ message: "Missing subdomain name" }, { status: 400 });
    }

    const updated = await SubDomainModel.update(params.id, session.user.id, name);
    return NextResponse.json(updated);
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

    await SubDomainModel.delete(params.id, session.user.id);
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error(`[API SUB-DOMAINS ID DELETE] Error deleting ${params.id}:`, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}