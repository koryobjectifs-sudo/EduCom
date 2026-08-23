"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export type DonutDataItem = {
  name: string;
  value: number;
  color?: string;
};

interface DonutChartProps {
  data: DonutDataItem[];
  valueFormatter?: (value: number) => string;
  centerLabel?: string;
  centerValue?: string;
  height?: number;
  className?: string;
  colors?: string[];
}

const DEFAULT_COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#f43f5e"];

export function DonutChart({
  data,
  valueFormatter = (v) => v.toString(),
  centerLabel,
  centerValue,
  height = 250,
  className,
  colors = DEFAULT_COLORS,
}: DonutChartProps) {
  // Add colors if missing
  const chartData = React.useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      color: item.color || colors[index % colors.length],
    }));
  }, [data, colors]);

  const total = React.useMemo(() => {
    return data.reduce((sum, item) => sum + item.value, 0);
  }, [data]);

  return (
    <div className={["relative w-full", className].filter(Boolean).join(" ")} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius="65%"
            outerRadius="85%"
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any, name: any) => [valueFormatter(Number(value)), name]}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              fontSize: "13px",
              fontWeight: 500,
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: "13px", paddingTop: "20px" }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center Label (absolute positioned in the middle of the donut) */}
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-8">
          {centerValue && (
            <span className="text-2xl font-bold tracking-tight text-text">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="text-xs font-semibold uppercase tracking-wider text-text-faint mt-0.5">
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
