// src/app/api/subscription/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { SubscriptionModel } from '@/models/Subscription';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const subscription = await SubscriptionModel.getByUserId(session.user.id);
    return NextResponse.json(subscription);
  } catch (err) {
    console.error('[API SUBSCRIPTION GET] Error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { planId } = await request.json();
    if (!planId || typeof planId !== 'string') {
      return NextResponse.json({ message: 'Plan ID is required' }, { status: 400 });
    }
    const updated = await SubscriptionModel.updatePlan(session.user.id, planId);
    return NextResponse.json(updated);
  } catch (err) {
    console.error('[API SUBSCRIPTION POST] Error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}