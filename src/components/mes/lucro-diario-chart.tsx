"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtUSD } from "@/lib/format";

export function LucroDiarioChart({
  data,
}: {
  data: { dia: number; valor: number }[];
}) {
  const temDados = data.some((d) => d.valor !== 0);
  if (!temDados) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Sem resultados neste mês ainda.
      </div>
    );
  }
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis
            dataKey="dia"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            interval={2}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={70}
            tickFormatter={(v: number) => fmtUSD(v)}
          />
          <Tooltip
            cursor={{ fill: "var(--accent)", opacity: 0.4 }}
            formatter={(v) => [fmtUSD(Number(v)), "Resultado"]}
            labelFormatter={(dia) => `Dia ${dia}`}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--popover-foreground)",
              fontSize: 12,
            }}
          />
          <ReferenceLine y={0} stroke="var(--border)" />
          <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={18}>
            {data.map((d) => (
              <Cell
                key={d.dia}
                fill={d.valor >= 0 ? "#10b981" : "#ef4444"}
                fillOpacity={d.valor === 0 ? 0 : 0.9}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
