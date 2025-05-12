
'use client';

import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Line, LineChart, Legend, Tooltip } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
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
    color: "hsl(var(--chart-1))", // Use a chart-specific color
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
              <Tooltip 
                cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                content={<ChartTooltipContent indicator="dot" />} 
              />
              <Legend content={<ChartLegendContent />} />
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
              <Tooltip 
                cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3' }}
                content={<ChartTooltipContent indicator="line" />} 
              />
              <Legend content={<ChartLegendContent />} />
              <Line 
                type="monotone" 
                dataKey="clicks" 
                stroke="var(--color-clicks)" 
                strokeWidth={2} 
                dot={{ r: 4, fill: "var(--color-clicks)", stroke: "var(--background)" }} 
                activeDot={{ r: 6, stroke: "var(--background)", strokeWidth: 1 }} 
              />
            </LineChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export const AnalyticsChart = React.memo(AnalyticsChartInternal);

