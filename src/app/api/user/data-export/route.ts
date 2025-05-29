import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { generateUserDataExport } from '@/lib/userDataExportService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const dataExport = await generateUserDataExport(userId);

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Disposition', 'attachment; filename="user_data_export.json"');

    return new NextResponse(JSON.stringify(dataExport, null, 2), {
      status: 200,
      headers: headers,
    });

  } catch (error: any) {
    console.error("[API USER DATA EXPORT GET] Error generating data export:", error);
    // Ensure a generic error message for the client
    return NextResponse.json({ message: "Error generating data export. Please try again later." }, { status: 500 });
  }
}
