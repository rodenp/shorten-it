
import { NextResponse } from 'next/server';
import { debugLog, debugWarn } from '@/lib/logging';

export async function POST(request: Request) {
  try {
    // You could optionally try to parse the request body if you send one
    // const body = await request.json();
    // debugLog("Test POST request body:", body);
    debugLog("Test POST API route hit successfully.");
    return NextResponse.json({ message: "Test POST successful!", timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error("Error in test POST API route:", error);
    return NextResponse.json({ message: "Error in test POST", error: error.message }, { status: 500 });
  }
}
