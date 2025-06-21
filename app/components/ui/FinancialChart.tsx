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
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
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

// Professional chart colors matching shadcn/ui theme
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))", 
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export default function FinancialChart({ chartData, className = "" }: FinancialChartProps) {
  // Transform data for Recharts format
  const transformedData = chartData.labels.map((label, index) => {
    const dataPoint: any = { name: label }
    chartData.datasets.forEach((dataset, datasetIndex) => {
      dataPoint[dataset.label] = dataset.data[index] || 0
    })
    return dataPoint
  })

  // For pie charts, we need a different data structure
  const pieData = chartData.type === 'pie' || chartData.type === 'doughnut' 
    ? chartData.labels.map((label, index) => ({
        name: label,
        value: chartData.datasets[0]?.data[index] || 0,
        fill: CHART_COLORS[index % CHART_COLORS.length]
      }))
    : []

  // Create chart config for shadcn/ui
  const chartConfig: ChartConfig = {
    ...chartData.datasets.reduce((acc, dataset, index) => {
      acc[dataset.label] = {
        label: dataset.label,
        color: CHART_COLORS[index % CHART_COLORS.length]
      }
      return acc
    }, {} as ChartConfig),
    // For pie charts
    ...chartData.labels.reduce((acc, label, index) => {
      acc[label] = {
        label: label,
        color: CHART_COLORS[index % CHART_COLORS.length]
      }
      return acc
    }, {} as ChartConfig)
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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
              />
              {chartData.datasets.map((dataset, index) => (
                <Bar
                  key={dataset.label}
                  dataKey={dataset.label}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ChartContainer>
        )

      case 'line':
        return (
          <ChartContainer config={chartConfig} className="h-[350px]">
            <LineChart data={transformedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent />}
              />
              {chartData.datasets.map((dataset, index) => (
                <Line
                  key={dataset.label}
                  type="monotone"
                  dataKey={dataset.label}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={3}
                  dot={{ 
                    fill: CHART_COLORS[index % CHART_COLORS.length], 
                    strokeWidth: 2, 
                    r: 5 
                  }}
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
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={chartData.type === 'doughnut' ? 80 : 0}
                outerRadius={120}
                paddingAngle={2}
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
    <Card className={`w-full ${className}`}>
      <CardHeader className="flex flex-col items-start space-y-2 pb-4">
        <div className="grid gap-1">
          <CardTitle className="text-xl font-semibold">{chartData.title}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {chartData.type === 'pie' || chartData.type === 'doughnut' 
              ? "Data distribution and composition analysis" 
              : "Financial performance trends and insights"
            }
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="pb-0">
        {renderChart()}
      </CardContent>
      
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            {trend > 0 && (
              <div className="flex items-center gap-2 font-medium leading-none">
                {isPositive ? "Trending up" : "Trending down"} by {trend.toFixed(1)}% this period
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-muted"></div>
              Generated from uploaded financial reports
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
} 