'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type Plan = { id: string; name: string; price: number; period: string; features: string[] };
type FeatureDef = { key: string; label: string };
type FeatureSection = { section: string; features: FeatureDef[] };
type Subscription = { planId: string; nextBillingDate: string; usage: number; limit: number };

export function SubscriptionSettings() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [featureSections, setFeatureSections] = useState<FeatureSection[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'Monthly' | 'Annual'>('Monthly');
  const [filter, setFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/subscription/plans');
        if (!res.ok) throw new Error('Failed to load plans');
        const { plans: p, featureSections: fs } = await res.json();
        setPlans(p);
        setFeatureSections(fs);
        const subRes = await fetch('/api/subscription');
        if (!subRes.ok) throw new Error('Failed to load subscription');
        setSub(await subRes.json());
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  const handleChangePlan = async (planId: string) => {
    setActionLoading(planId);
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) throw new Error('Failed to update plan');
      setSub(await res.json());
      toast({ title: 'Subscription updated!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading…</div>;

  // Build all rows once
  const rows: React.ReactNode[] = [];
  featureSections.forEach(({ section, features }) => {
    rows.push(
      <TableRow key={section + '-header'}>
        <TableCell colSpan={plans.length + 1} className="bg-muted font-semibold">
          {section}
        </TableCell>
      </TableRow>
    );
    features
      .filter((f) => f.label.toLowerCase().includes(filter.toLowerCase()))
      .forEach(({ key, label }) => {
        rows.push(
          <TableRow key={key}>
            <TableCell>{label}</TableCell>
            {plans.map((plan) => (
              <TableCell
                key={plan.id}
                className={
                  `text-center ${plan.id === sub?.planId ? 'bg-primary/10 dark:bg-primary/20' : ''}`
                }
              >
                {plan.features.includes(key) ? (
                  <span className="text-primary font-bold">✓</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            ))}
          </TableRow>
        );
      });
  });

  return (
    <div className="p-8 space-y-8">
      {/* Subscription Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Manage your subscription plan</CardDescription>
        </CardHeader>
        <CardContent>
          {sub && (
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <p>
                  Current Plan:&nbsp;
                  <strong>{plans.find((p) => p.id === sub.planId)?.name}</strong>
                </p>
                <p>
                  Next Billing:&nbsp;
                  <strong>{new Date(sub.nextBillingDate).toLocaleDateString()}</strong>
                </p>
                <p>
                  Usage:&nbsp;
                  <strong>{sub.usage} / {sub.limit === 0 ? '∞' : sub.limit}</strong>
                </p>
              </div>
              <Button disabled>Manage Billing</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Plans & Features */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>Compare features and select your plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as any)}>
              <TabsList>
                <TabsTrigger value="Monthly">Monthly</TabsTrigger>
                <TabsTrigger value="Annual">Annual</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input
              placeholder="Find feature"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>Feature</TableHead>
                {plans.map((plan) => {
                  const isCurrent = plan.id === sub?.planId;
                  return (
                    <TableHead
                      key={plan.id}
                      className={`text-center ${isCurrent ? 'bg-primary text-primary-foreground' : ''}`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="font-semibold">{plan.name}</span>
                        <span className="text-sm text-muted-foreground">
                          ${plan.price}/{billingCycle === 'Monthly' ? 'mo' : 'yr'}
                        </span>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Render the pre-built rows array */}
              {rows}

              {/* Action Row */}
              <TableRow>
                <TableCell />
                {plans.map((plan) => (
                  <TableCell key={plan.id} className="text-center">
                    <Button
                      size="sm"
                      variant={plan.id === sub?.planId ? 'secondary' : 'default'}
                      disabled={plan.id === sub?.planId || Boolean(actionLoading)}
                      onClick={() => handleChangePlan(plan.id)}
                    >
                      {plan.id === sub?.planId
                        ? 'Current'
                        : actionLoading === plan.id
                        ? 'Updating…'
                        : 'Select'}
                    </Button>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
