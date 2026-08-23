"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatAmount } from "@/lib/moneyFormat";
import { DonutChart } from "@/components/ui/DonutChart";

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

export function RevenueChart({ data }: { data: { label: string; amount: number }[] }) {
  if (!data || data.length === 0) return <div className="p-4 text-center text-text-faint">Aucune donnée disponible.</div>;

  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickFormatter={(value) => `${(value / 1000)}k`}
          />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            formatter={(value: any) => [`${formatAmount(Number(value))} FCFA`, "Montant"]}
            contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
          />
          <Bar dataKey="amount" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={50} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PaymentMethodsChart({ data }: { data: { method: string; label: string; amount: number; count: number }[] }) {
  if (!data || data.length === 0) return <div className="p-4 text-center text-text-faint">Aucune donnée disponible.</div>;

  const pieData = data.map((d) => ({
    name: d.label,
    value: d.amount,
  }));

  return (
    <div className="h-72 w-full mt-4">
      <DonutChart 
        data={pieData} 
        valueFormatter={(val) => `${formatAmount(val)} FCFA`} 
        centerLabel="Total Encaissé"
        centerValue={formatAmount(pieData.reduce((a, b) => a + b.value, 0))}
        height={250}
      />
    </div>
  );
}
