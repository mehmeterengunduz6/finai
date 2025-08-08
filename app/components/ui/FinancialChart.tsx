"use client"

import React from "react"
import { TrendingUp, TrendingDown, SquareArrowOutUpRight } from "lucide-react"
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
  Legend,
  ResponsiveContainer
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
  onAddToBoard?: (chartData: ChartData, title: string) => void
  showAddToBoardButton?: boolean
}

// Custom tooltip component with color indicators
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // Debug logging to see what data we're getting
    console.log('Tooltip payload:', payload);
    console.log('Tooltip label:', label);
    
    return (
      <div className="bg-black border border-gray-600 rounded-lg p-3 shadow-lg">
        {label && <p className="text-sm font-medium text-white mb-2">{label}</p>}
        {payload.map((entry: any, index: number) => {
          // Try multiple ways to get the color for different chart types
          const color = entry.payload?.fill || // Pie chart color
                       entry.color ||        // Bar/Line chart color  
                       entry.fill ||         // Alternative
                       entry.stroke ||       // Line chart stroke
                       '#3B82F6';           // Fallback color
          
          console.log(`Entry ${index}:`, entry, 'Color:', color);
          
          return (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-300" 
                style={{ backgroundColor: color }}
              />
              <span className="text-white">
                {entry.name || entry.dataKey}: <span className="font-semibold">{entry.value}</span>
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};


export default function FinancialChart({ 
  chartData, 
  className = "", 
  onAddToBoard, 
  showAddToBoardButton = false 
}: FinancialChartProps) {
  const [hasBeenClicked, setHasBeenClicked] = React.useState(false);
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
          <div className="relative">
            <ChartContainer config={chartConfig} className="h-[350px]">
              <BarChart data={transformedData}>
                <CartesianGrid vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => {
                    // If it's a 4-digit year, show the full year
                    if (/^\d{4}$/.test(value)) {
                      return value;
                    }
                    // For other values, truncate to 3 characters for space
                    return value.slice(0, 3);
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<CustomTooltip />}
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
            {/* Legend for bar charts */}
            {chartData.datasets.length > 1 && (
              <div className="flex flex-wrap gap-3 mt-4 px-4">
                {chartData.datasets.map((dataset, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: `hsl(var(--chart-${(index % 5) + 1}))` }}
                    />
                    <span className="text-foreground font-medium">{dataset.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'line':
        return (
          <div className="relative">
            <ChartContainer config={chartConfig} className="h-[350px]">
              <LineChart data={transformedData}>
                <CartesianGrid vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => {
                    // If it's a 4-digit year, show the full year
                    if (/^\d{4}$/.test(value)) {
                      return value;
                    }
                    // For other values, truncate to 3 characters for space
                    return value.slice(0, 3);
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<CustomTooltip />}
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
            {/* Legend for line charts */}
            {chartData.datasets.length > 1 && (
              <div className="flex flex-wrap gap-3 mt-4 px-4">
                {chartData.datasets.map((dataset, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: `hsl(var(--chart-${(index % 5) + 1}))` }}
                    />
                    <span className="text-foreground font-medium">{dataset.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'pie':
      case 'doughnut':
        return (
          <div className="relative">
            <ChartContainer config={chartConfig} className="h-[350px]">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<CustomTooltip />}
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
            {/* Custom Legend at bottom left for pie/doughnut charts */}
            <div className="absolute bottom-4 left-4 flex flex-wrap gap-3 max-w-[60%]">
              {pieData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: entry.fill }}
                  />
                  <span className="text-foreground font-medium">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        )

      default:
        return (
          <div className="flex items-center justify-center h-[350px] text-muted-foreground">
            Desteklenmeyen grafik türü
          </div>
        )
    }
  }

  const handleAddToBoard = () => {
    if (onAddToBoard) {
      setHasBeenClicked(true);
      onAddToBoard(chartData, chartData.title || 'Chart');
    }
  };

  return (
    <Card className={`${className} relative`}>
      {/* Add to Board Button */}
      {showAddToBoardButton && onAddToBoard && (
        <button
          onClick={handleAddToBoard}
          className="absolute top-2 right-2 z-50 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 w-10"
          title="Add to Chart Board"
          style={{ right: '8px', top: '8px' }}
        >
          <SquareArrowOutUpRight className="h-4 w-4" />
          {!hasBeenClicked && (
            <span className="border-2 border-background rounded-full size-3 bg-primary absolute -top-1 -end-1 animate-bounce" />
          )}
        </button>
      )}
      
      <CardHeader>
        <CardTitle>{chartData.title}</CardTitle>
        {/* Removed description text */}
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
      {/* Removed footer text - chart only display */}
    </Card>
  )
} 