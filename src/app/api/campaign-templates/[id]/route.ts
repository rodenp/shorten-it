import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { CampaignTemplateModel } from "@/models/CampaignTemplate";
import { NextResponse } from "next/server";

interface RouteParams {
  params: { id: string };
}

// GET a specific campaign template
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const template = await CampaignTemplateModel.findById(params.id, session.user.id);
    if (!template) {
      return NextResponse.json({ message: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error(`[API CAMPAIGN_TEMPLATE ID GET] Error fetching template ${params.id}:`, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// PATCH to update a campaign template
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updated = await CampaignTemplateModel.update(params.id, session.user.id, {
      name: body.name,
      source: body.source,
      medium: body.medium,
      campaign: body.campaign,
      term: body.term,
      content: body.content
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(`[API CAMPAIGN_TEMPLATE ID PATCH] Error updating template ${params.id}:`, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// DELETE a campaign template
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await CampaignTemplateModel.delete(params.id, session.user.id);
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error(`[API CAMPAIGN_TEMPLATE ID DELETE] Error deleting template ${params.id}:`, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}