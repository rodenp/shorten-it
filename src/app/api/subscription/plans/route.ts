// src/app/api/subscription/plans/route.ts
import { NextResponse } from 'next/server';
import { SubscriptionModel } from '@/models/Subscription';

export async function GET() {
  const plans = await SubscriptionModel.listPlans();
  const featureSections = await SubscriptionModel.listFeatureSections();
  return NextResponse.json({ plans, featureSections });
}