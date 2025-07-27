"use client"

import React from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  CartesianGrid,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "./chart"

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'doughnut'
  title: string
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string | string[]
    borderWidth?: number
    fill?: boolean
  }[]
}

interface FinancialChartProps {
  chartData: ChartData
  className?: string
}


export default function FinancialChart({ chartData, className = "" }: FinancialChartProps) {
  // Create dynamic CSS variables for pie chart labels
  React.useEffect(() => {
    if (chartData.type === 'pie' || chartData.type === 'doughnut') {
      const root = document.documentElement;
      chartData.labels.forEach((label, index) => {
        // Sanitize label for CSS variable name (remove spaces and special chars)
        const sanitizedLabel = label.replace(/[^a-zA-Z0-9]/g, '-');
        const colorValue = getComputedStyle(root).getPropertyValue(`--chart-${(index % 5) + 1}`);
        
        // Set both sanitized and original label CSS variables
        root.style.setProperty(`--color-${sanitizedLabel}`, `hsl(${colorValue})`);
        root.style.setProperty(`--color-${label}`, `hsl(${colorValue})`);
      });
    }
  }, [chartData]);
  // Transform data for Recharts format
  const transformedData = chartData.labels.map((label, index) => {
    const dataPoint: Record<string, string | number> = { name: label }
    chartData.datasets.forEach((dataset) => {
      dataPoint[dataset.label] = dataset.data[index] || 0
    })
    return dataPoint
  })

  // Define bright colors for pie charts as fallback
  const fallbackColors = [
    '#3B82F6', // Bright Blue
    '#EF4444', // Bright Red
    '#F59E0B', // Bright Amber
    '#10B981', // Bright Emerald
    '#F97316', // Bright Orange
  ];

  // For pie charts, we need a different data structure following shadcn pattern
  const pieData = chartData.type === 'pie' || chartData.type === 'doughnut' 
    ? chartData.labels.map((label, index) => ({
        name: label,
        value: chartData.datasets[0]?.data[index] || 0,
        fill: chartData.datasets[0]?.backgroundColor?.[index] || fallbackColors[index % fallbackColors.length]
      }))
    : []

  // Create chart config for shadcn/ui following exact documentation pattern
  const chartConfig: ChartConfig = {}
  
  if (chartData.type === 'pie' || chartData.type === 'doughnut') {
    chartData.labels.forEach((label, index) => {
      chartConfig[label] = {
        label: label,
        color: `hsl(var(--chart-${(index % 5) + 1}))`
      }
    })
  } else {
    chartData.datasets.forEach((dataset, index) => {
      chartConfig[dataset.label] = {
        label: dataset.label,
        color: `hsl(var(--chart-${(index % 5) + 1}))`
      }
    })
  }

  // Calculate trend analysis for professional insights
  const calculateTrend = () => {
    if (chartData.datasets.length === 0 || chartData.datasets[0].data.length < 2) {
      return { trend: 0, isPositive: true }
    }
    
    const data = chartData.datasets[0].data
    const lastValue = data[data.length - 1]
    const firstValue = data[0]
    const trend = ((lastValue - firstValue) / firstValue) * 100
    
    return {
      trend: Math.abs(trend),
      isPositive: trend >= 0
    }
  }

  const { trend, isPositive } = calculateTrend()

  const renderChart = () => {
    switch (chartData.type) {
      case 'bar':
        return (
          <ChartContainer config={chartConfig} className="h-[350px]">
            <BarChart data={transformedData}>
              <CartesianGrid vertical={false} />
              <XAxis 
                dataKey="name" 
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" className="bg-background border-border" />}
              />
              {chartData.datasets.map((dataset, index) => (
                <Bar
                  key={dataset.label}
                  dataKey={dataset.label}
                  fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                  radius={8}
                />
              ))}
            </BarChart>
          </ChartContainer>
        )

      case 'line':
        return (
          <ChartContainer config={chartConfig} className="h-[350px]">
            <LineChart data={transformedData}>
              <CartesianGrid vertical={false} />
              <XAxis 
                dataKey="name" 
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent className="bg-background border-border" />}
              />
              {chartData.datasets.map((dataset, index) => (
                <Line
                  key={dataset.label}
                  type="monotone"
                  dataKey={dataset.label}
                  stroke={`hsl(var(--chart-${(index % 5) + 1}))`}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        )

      case 'pie':
      case 'doughnut':
        return (
          <ChartContainer config={chartConfig} className="h-[350px]">
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel className="bg-background border-border" />}
              />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={chartData.type === 'doughnut' ? 60 : 0}
                strokeWidth={2}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        )

      default:
        return (
          <div className="flex items-center justify-center h-[350px] text-muted-foreground">
            Unsupported chart type
          </div>
        )
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{chartData.title}</CardTitle>
        <CardDescription>
          {chartData.type === 'pie' || chartData.type === 'doughnut' 
            ? "Revenue distribution analysis" 
            : "Financial performance overview"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        {trend > 0 && (
          <div className="flex gap-2 font-medium leading-none">
            {isPositive ? "Trending up" : "Trending down"} by {trend.toFixed(1)}% this period
            {isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
          </div>
        )}
        <div className="leading-none text-muted-foreground">
          Based on uploaded financial reports
        </div>
      </CardFooter>
    </Card>
  )
} 