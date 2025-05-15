import { NextResponse } from 'next/server';
import {
  getRetargetingPixelsByUserId,
  addRetargetingPixel,
} from '@/lib/retargetingPixelService';
import { RetargetingPixel } from '@/types';
import { getUserIdFromRequest } from '@/lib/auth-utils'; // Placeholder for your auth logic

// GET /api/retargeting-pixels
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const pixels = await getRetargetingPixelsByUserId(userId);
    return NextResponse.json(pixels);
  } catch (error: any) {
    console.error('Error fetching retargeting pixels:', error);
    return NextResponse.json({ message: error.message || 'Error fetching retargeting pixels' }, { status: 500 });
  }
}

// POST /api/retargeting-pixels
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { name, type, pixelIdValue } = await request.json() as Omit<RetargetingPixel, 'id' | 'createdAt' | 'userId'>;

    if (!name || !type || !pixelIdValue) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const newPixel = await addRetargetingPixel(userId, name, type, pixelIdValue);
    return NextResponse.json(newPixel, { status: 201 });

  } catch (error: any) {
    console.error('Error adding retargeting pixel:', error);
    const statusCode = error.message.includes('already exists') ? 409 : 500;
    return NextResponse.json({ message: error.message || 'Error adding retargeting pixel' }, { status: statusCode });
  }
}
