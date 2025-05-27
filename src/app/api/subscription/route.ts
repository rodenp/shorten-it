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
    // The userEmail might be needed if creating a Stripe customer for the first time
    // For now, assuming SubscriptionModel.updatePlan handles this or user already has a stripeCustomerId
    const updated = await SubscriptionModel.updatePlan(session.user.id, planId, session.user.email || undefined);
    return NextResponse.json(updated);
  } catch (err) {
    console.error('[API SUBSCRIPTION POST] Error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // SubscriptionModel.cancelSubscription returns the updated subscription (e.g., reflecting 'free' plan)
    const cancelledSubscription = await SubscriptionModel.cancelSubscription(session.user.id);
    
    return NextResponse.json(cancelledSubscription);

  } catch (err) {
    console.error('[API SUBSCRIPTION DELETE] Error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}