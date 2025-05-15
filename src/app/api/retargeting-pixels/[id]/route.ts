import { NextResponse } from 'next/server';
import {
  getRetargetingPixelById,
  updateRetargetingPixel,
  deleteRetargetingPixel,
} from '@/lib/retargetingPixelService';
import { RetargetingPixel } from '@/types';
import { getUserIdFromRequest } from '@/lib/auth-utils'; // Placeholder for your auth logic

interface Params {
  params: {
    id: string;
  };
}

// GET /api/retargeting-pixels/[id]
export async function GET(request: Request, { params }: Params) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { id } = params;
    const pixel = await getRetargetingPixelById(id, userId);

    if (!pixel) {
      return NextResponse.json({ message: 'Retargeting pixel not found' }, { status: 404 });
    }
    return NextResponse.json(pixel);
  } catch (error: any) {
    console.error(`Error fetching retargeting pixel ${params.id}:`, error);
    return NextResponse.json({ message: error.message || 'Error fetching retargeting pixel' }, { status: 500 });
  }
}


// PUT /api/retargeting-pixels/[id]
export async function PUT(request: Request, { params }: Params) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { id } = params;
    const { name, type, pixelIdValue } = await request.json() as Omit<RetargetingPixel, 'id' | 'createdAt' | 'userId'>;

    if (!name || !type || !pixelIdValue) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const updatedPixel = await updateRetargetingPixel(id, userId, name, type, pixelIdValue);

    if (!updatedPixel) {
      return NextResponse.json({ message: 'Retargeting pixel not found or update failed' }, { status: 404 });
    }
    return NextResponse.json(updatedPixel);
  } catch (error: any) {
    console.error(`Error updating retargeting pixel ${params.id}:`, error);
    const statusCode = error.message.includes('already exists') ? 409 : (error.message.includes('not found') ? 404 : 500);
    return NextResponse.json({ message: error.message || 'Error updating retargeting pixel' }, { status: statusCode });
  }
}

// DELETE /api/retargeting-pixels/[id]
export async function DELETE(request: Request, { params }: Params) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { id } = params;
    const success = await deleteRetargetingPixel(id, userId);

    if (!success) {
      return NextResponse.json({ message: 'Retargeting pixel not found or could not be deleted' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Retargeting pixel deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error(`Error deleting retargeting pixel ${params.id}:`, error);
    return NextResponse.json({ message: error.message || 'Error deleting retargeting pixel' }, { status: 500 });
  }
}
