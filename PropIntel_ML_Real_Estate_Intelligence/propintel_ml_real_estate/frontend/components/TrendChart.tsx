"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function TrendChart({ data }: { data: Array<{ month: string; history?: number; forecast?: number }> }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6d8dff" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#6d8dff" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#27304a" strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fill: "#8892ad", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#8892ad", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 10000000).toFixed(1)}Cr`} />
          <Tooltip
            contentStyle={{ background: "#11172a", border: "1px solid #2a3450", borderRadius: 12, color: "#eef2ff" }}
            formatter={(value: number) => [`PKR ${(value / 10000000).toFixed(2)} Cr`, "Median price"]}
          />
          <Area type="monotone" dataKey="history" stroke="#7696ff" fill="url(#trendFill)" strokeWidth={2.5} dot={false} />
          <Area type="monotone" dataKey="forecast" stroke="#b9c5ff" strokeDasharray="7 5" fill="transparent" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
