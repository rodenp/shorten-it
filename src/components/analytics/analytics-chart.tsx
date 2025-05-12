'use client';

import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Line, LineChart } from 'recharts';
import { ChartConfig, ChartContainer } from '@/components/ui/chart'; // Removed ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AnalyticsChartProps {
  data: { date: string; clicks: number }[];
  chartType?: 'bar' | 'line';
  title?: string;
  description?: string;
}

const chartConfig = {
  clicks: {
    label: "Clicks",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const AnalyticsChartInternal = ({ 
    data, 
    chartType = 'bar', 
    title = "Link Performance", 
    description = "Clicks over the selected period." 
}: AnalyticsChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No data available to display the chart.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          {chartType === 'bar' ? (
            <BarChart accessibilityLayer data={data}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis allowDecimals={false}/>
              {/* <ChartTooltip content={<ChartTooltipContent />} /> */} {/* Temporarily removed */}
              {/* <Legend content={<ChartLegend content={<ChartLegendContent />} />} /> */} {/* Temporarily removed */}
              <Bar dataKey="clicks" fill="var(--color-clicks)" radius={4} />
            </BarChart>
          ) : (
            <LineChart accessibilityLayer data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="date"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis allowDecimals={false} />
              {/* <ChartTooltip content={<ChartTooltipContent />} /> */} {/* Temporarily removed */}
              {/* <Legend content={<ChartLegend content={<ChartLegendContent />} />} /> */} {/* Temporarily removed */}
              <Line type="monotone" dataKey="clicks" stroke="var(--color-clicks)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-clicks)" }} activeDot={{ r: 6 }} />
            </LineChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export const AnalyticsChart = React.memo(AnalyticsChartInternal);