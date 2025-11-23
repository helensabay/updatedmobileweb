import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import {
  CHART_COLORS,
  ANIMATION_CONFIG,
  CustomNumericTooltip,
} from '@/utils/chartConfig';

const PopularItems = ({ itemsToday, itemsYesterday }) => {
  // Calculate total for percentages
  const todayTotal = itemsToday.reduce((sum, item) => sum + item.count, 0);
  const yesterdayTotal = itemsYesterday.reduce(
    (sum, item) => sum + item.count,
    0
  );

  // Prepare data for pie charts with colors
  const todayData = itemsToday.map((item, index) => ({
    name: item.name,
    value: item.count,
    total: todayTotal,
    color: CHART_COLORS.palette[index % CHART_COLORS.palette.length],
  }));

  const yesterdayData = itemsYesterday.map((item, index) => ({
    name: item.name,
    value: item.count,
    total: yesterdayTotal,
    color: CHART_COLORS.palette[index % CHART_COLORS.palette.length],
  }));

  // Custom tooltip to show item name, count, and percentage
  const CustomPieTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0];
    const percentage = ((data.value / data.payload.total) * 100).toFixed(1);

    return (
      <div
        className="bg-popover border border-border rounded-md p-2 shadow-lg"
        style={{ fontSize: '12px' }}
      >
        <p className="font-semibold mb-1">{data.name}</p>
        <p className="text-muted-foreground">
          <span className="font-medium">Orders:</span>{' '}
          <span className="font-semibold">{data.value}</span>
        </p>
        <p className="text-muted-foreground">
          <span className="font-medium">Share:</span>{' '}
          <span className="font-semibold">{percentage}%</span>
        </p>
      </div>
    );
  };

  // Empty state for both charts
  const EmptyPieChart = ({ label }) => (
    <div className="flex-1 flex flex-col items-center justify-center py-8">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
          <TrendingUp className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">No data available</p>
      </div>
    </div>
  );

  return (
    <Card className="border-0 bg-gradient-to-br from-background to-muted/20 hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Popular Items
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Most ordered items comparison
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4">
          {/* Today's Popular Items */}
          <div className="flex flex-col">
            <h4 className="text-sm font-semibold text-center mb-2 text-primary">
              Today
            </h4>
            {todayData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart margin={{ top: 20, right: 5, bottom: 5, left: 5 }}>
                  <Pie
                    data={todayData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                    {...ANIMATION_CONFIG.entrance}
                  >
                    {todayData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyPieChart label="Today" />
            )}
            {/* Legend for today */}
            {todayData.length > 0 && (
              <div className="mt-3 space-y-1">
                {todayData.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate flex-1" title={item.name}>
                      {item.name}
                    </span>
                    <span className="font-semibold text-muted-foreground">
                      {item.value}
                    </span>
                  </div>
                ))}
                {todayData.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center pt-1">
                    +{todayData.length - 3} more
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Yesterday's Popular Items */}
          <div className="flex flex-col">
            <h4 className="text-sm font-semibold text-center mb-2 text-muted-foreground">
              Yesterday
            </h4>
            {yesterdayData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart margin={{ top: 20, right: 5, bottom: 5, left: 5 }}>
                  <Pie
                    data={yesterdayData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                    {...ANIMATION_CONFIG.entrance}
                  >
                    {yesterdayData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyPieChart label="Yesterday" />
            )}
            {/* Legend for yesterday */}
            {yesterdayData.length > 0 && (
              <div className="mt-3 space-y-1">
                {yesterdayData.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate flex-1" title={item.name}>
                      {item.name}
                    </span>
                    <span className="font-semibold text-muted-foreground">
                      {item.value}
                    </span>
                  </div>
                ))}
                {yesterdayData.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center pt-1">
                    +{yesterdayData.length - 3} more
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PopularItems;
