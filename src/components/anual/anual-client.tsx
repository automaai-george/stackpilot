"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fmtUSD, fmtHoras } from "@/lib/format";
import {
  MESES_CURTO,
  lucroPorHora,
  resultado,
  type DiaT,
  type RegistroT,
  type SiteT,
} from "@/lib/calc";
import { HeatmapAno } from "@/components/anual/heatmap-ano";

function CorValor({ v, zeroMudo = true }: { v: number; zeroMudo?: boolean }) {
  const cor =
    v > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : v < 0
        ? "text-red-600 dark:text-red-400"
        : zeroMudo
          ? "text-muted-foreground/40"
          : "";
  return (
    <span className={cn("tabular-nums", cor)}>
      {v === 0 && zeroMudo ? "—" : fmtUSD(v)}
    </span>
  );
}

export function AnualClient({
  ano,
  sites,
  registros,
  dias,
}: {
  ano: number;
  sites: SiteT[];
  registros: RegistroT[];
  dias: (DiaT & { mes: number })[];
}) {
  const calc = useMemo(() => {
    // lucro[siteId][mes] e totais
    const lucro = new Map<number, number[]>();
    for (const s of sites) lucro.set(s.id, Array(13).fill(0)); // idx 1..12
    for (const r of registros) {
      const arr = lucro.get(r.siteId);
      if (!arr) continue;
      arr[r.mes] += resultado(r);
    }
    const totalMes = Array(13).fill(0);
    for (const arr of lucro.values()) {
      for (let m = 1; m <= 12; m++) totalMes[m] += arr[m];
    }
    const horasMes = Array(13).fill(0);
    for (const d of dias) horasMes[d.mes] += d.horas ?? 0;

    const totalAno = totalMes.reduce((s, v) => s + v, 0);
    const horasAno = horasMes.reduce((s, v) => s + v, 0);

    // resultado por dia para o heatmap
    const porDia: Record<string, number> = {};
    for (const r of registros) {
      const res = resultado(r);
      if (res === 0 && r.bancaInicial === null && r.saldoFinal === null) continue;
      const k = `${r.mes}-${r.dia}`;
      porDia[k] = (porDia[k] ?? 0) + res;
    }

    const serie = MESES_CURTO.map((nome, i) => ({
      mes: nome,
      lucro: Number(totalMes[i + 1].toFixed(2)),
      horas: Number(horasMes[i + 1].toFixed(2)),
    }));

    return { lucro, totalMes, horasMes, totalAno, horasAno, serie, porDia };
  }, [sites, registros, dias]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Visão anual <span className="text-muted-foreground">{ano}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Lucro por site em cada mês. Clique num mês para editar os registros.
        </p>
      </div>

      <Card className="overflow-hidden py-0 gap-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="sticky left-0 z-10 bg-muted px-3 py-2.5 text-left font-semibold">
                  Site
                </th>
                {MESES_CURTO.map((m, i) => (
                  <th key={m} className="px-3 py-2.5 text-right font-medium">
                    <Link
                      href={`/mes/${ano}/${i + 1}`}
                      className="rounded transition-colors hover:text-foreground hover:underline"
                    >
                      {m}
                    </Link>
                  </th>
                ))}
                <th className="border-l bg-muted px-3 py-2.5 text-right font-semibold">
                  Total {ano}
                </th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => {
                const arr = calc.lucro.get(s.id) ?? [];
                const tot = arr.reduce((sum, v) => sum + v, 0);
                return (
                  <tr
                    key={s.id}
                    className="border-b transition-colors hover:bg-accent/40"
                  >
                    <td className="sticky left-0 z-10 bg-card px-3 py-2 font-medium">
                      {s.nome}
                    </td>
                    {MESES_CURTO.map((_, i) => (
                      <td key={i} className="px-3 py-2 text-right">
                        <CorValor v={arr[i + 1] ?? 0} />
                      </td>
                    ))}
                    <td className="border-l bg-muted/30 px-3 py-2 text-right font-semibold">
                      <CorValor v={tot} zeroMudo={false} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/50 font-semibold">
                <td className="sticky left-0 z-10 bg-muted px-3 py-2.5">TOTAL</td>
                {MESES_CURTO.map((_, i) => (
                  <td key={i} className="px-3 py-2.5 text-right">
                    <CorValor v={calc.totalMes[i + 1]} />
                  </td>
                ))}
                <td className="border-l bg-muted px-3 py-2.5 text-right">
                  <CorValor v={calc.totalAno} zeroMudo={false} />
                </td>
              </tr>
              <tr className="border-t bg-muted/30 text-muted-foreground">
                <td className="sticky left-0 z-10 bg-muted/80 px-3 py-2">
                  Horas jogadas
                </td>
                {MESES_CURTO.map((_, i) => (
                  <td key={i} className="px-3 py-2 text-right tabular-nums">
                    {calc.horasMes[i + 1] > 0 ? fmtHoras(calc.horasMes[i + 1]) : "—"}
                  </td>
                ))}
                <td className="border-l bg-muted/50 px-3 py-2 text-right font-medium tabular-nums">
                  {fmtHoras(calc.horasAno)}
                </td>
              </tr>
              <tr className="border-t bg-muted/30 text-muted-foreground">
                <td className="sticky left-0 z-10 bg-muted/80 px-3 py-2">
                  Lucro por hora
                </td>
                {MESES_CURTO.map((_, i) => {
                  const lph = lucroPorHora(calc.totalMes[i + 1], calc.horasMes[i + 1]);
                  return (
                    <td key={i} className="px-3 py-2 text-right">
                      {lph === null ? (
                        <span className="text-muted-foreground/40">—</span>
                      ) : (
                        <CorValor v={lph} zeroMudo={false} />
                      )}
                    </td>
                  );
                })}
                <td className="border-l bg-muted/50 px-3 py-2 text-right font-medium">
                  {(() => {
                    const lph = lucroPorHora(calc.totalAno, calc.horasAno);
                    return lph === null ? "—" : <CorValor v={lph} zeroMudo={false} />;
                  })()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mapa do ano</CardTitle>
          <CardDescription>
            Cada quadrado é um dia — verde lucro, vermelho prejuízo. Disciplina
            de volume num relance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HeatmapAno ano={ano} valores={calc.porDia} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evolução no ano</CardTitle>
          <CardDescription>
            Lucro e horas jogadas mês a mês.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={calc.serie}
                margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  yAxisId="lucro"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={72}
                  tickFormatter={(v: number) => fmtUSD(v)}
                />
                <YAxis
                  yAxisId="horas"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={40}
                  tickFormatter={(v: number) => `${v}h`}
                />
                <Tooltip
                  formatter={(v, name) =>
                    name === "Lucro"
                      ? [fmtUSD(Number(v)), name]
                      : [fmtHoras(Number(v)), name]
                  }
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                />
                <Legend iconType="plainline" />
                <ReferenceLine yAxisId="lucro" y={0} stroke="var(--border)" />
                <Line
                  yAxisId="lucro"
                  type="monotone"
                  dataKey="lucro"
                  name="Lucro"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="horas"
                  type="monotone"
                  dataKey="horas"
                  name="Horas"
                  stroke="#6366f1"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
