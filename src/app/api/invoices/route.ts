// src/app/api/invoices/route.ts
import { NextResponse } from 'next/server';
import { InvoiceModel } from '@/models/InvoiceModel'; 
// Assume an auth utility exists. If not, this is a placeholder for how user ID might be obtained.
// import { getCurrentUser } from '@/lib/session'; // Example auth utility

// Placeholder for getting userId - replace with actual auth mechanism
async function getUserIdFromRequest(request: Request): Promise<string | null> {
  // In a real app, this would involve checking session cookies, JWTs, etc.
  // For example, using NextAuth.js:
  // const session = await getServerSession(authOptions);
  // return session?.user?.id || null;
  
  // For now, let's simulate a logged-in user.
  // In a real scenario, this MUST be replaced with actual authentication.
  console.warn("Using placeholder user ID in /api/invoices. Replace with actual authentication.");
  return 'test-user-id'; // Replace with actual user ID from session
}

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoices = await InvoiceModel.listByUserId(userId);
    
    // The amounts are stored in cents, convert them to dollars for display if needed on client,
    // or ensure client is aware they are in cents.
    // For this API, we'll return them as cents. Client can format.
    return NextResponse.json(invoices);

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}
