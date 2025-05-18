import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { CampaignTemplateModel } from "@/models/CampaignTemplate";
import { NextResponse } from "next/server";

// GET all campaign templates for the logged-in user
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const templates = await CampaignTemplateModel.findByUserId(session.user.id);
    return NextResponse.json(templates);
  } catch (error) {
    console.error("[API CAMPAIGN_TEMPLATE GET] Error fetching templates:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// POST a new campaign template
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const {
      name,
      source,
      medium,
      campaign,
      term,
      content
    } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ message: "Template name is required" }, { status: 400 });
    }

    const created = await CampaignTemplateModel.create(session.user.id, {
      name, source, medium, campaign, term, content
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[API CAMPAIGN_TEMPLATE POST] Error creating template:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}