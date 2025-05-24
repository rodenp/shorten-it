import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { DomainModel } from "@/models/Domains";
import type { DomainType } from '@/types'; 

interface RouteContext {
  params: { id: string };
}

// GET a specific Domain
export async function GET(request: Request, context: RouteContext) {
  const { params } = context;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Read “type” from ?type=local,custom
    const url    = new URL(request.url);
    const raw    = url.searchParams.get('types') || '';      // e.g. "local,custom"
    const types  = raw.split(',').filter(t => t === 'local' || t === 'custom') as DomainType[];

    const Domain = await DomainModel.findById(params.id);
    if (!Domain) {
      return NextResponse.json({ message: "Domain not found" }, { status: 404 });
    }

    return NextResponse.json(Domain);
  } catch (error) {
    console.error(`[API DOMAINS ID GET] Error fetching ${params.id}:`, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// DELETE a specific Domain
export async function DELETE(request: Request, context: RouteContext) {
  const { params } = context;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await DomainModel.delete(params.id;
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error(`[API SUB-DOMAINS ID DELETE] Error deleting ${params.id}:`, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}