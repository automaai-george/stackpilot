"use client";

import { cn } from "@/lib/utils";
import { fmtUSD } from "@/lib/format";
import { MESES_CURTO, diasNoMes } from "@/lib/calc";

/**
 * Heatmap do ano (estilo GitHub): uma linha por mês, um quadrado por dia,
 * colorido pelo resultado do dia. Minimalista, sem libs.
 */
export function HeatmapAno({
  ano,
  valores, // chave "mes-dia" -> resultado do dia
}: {
  ano: number;
  valores: Record<string, number>;
}) {
  const maxAbs = Math.max(1, ...Object.values(valores).map((v) => Math.abs(v)));

  function classe(v: number | undefined): string {
    if (v === undefined) return "bg-muted/40";
    if (v === 0) return "bg-muted";
    const forca = Math.abs(v) / maxAbs; // 0..1
    if (v > 0) {
      if (forca > 0.6) return "bg-emerald-600";
      if (forca > 0.25) return "bg-emerald-500/80";
      return "bg-emerald-400/50";
    }
    if (forca > 0.6) return "bg-red-600";
    if (forca > 0.25) return "bg-red-500/80";
    return "bg-red-400/50";
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max space-y-1">
        {MESES_CURTO.map((nome, i) => {
          const mes = i + 1;
          const nDias = diasNoMes(ano, mes);
          return (
            <div key={nome} className="flex items-center gap-1">
              <span className="w-8 text-right text-[10px] text-muted-foreground">
                {nome}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: 31 }, (_, d) => {
                  const dia = d + 1;
                  if (dia > nDias) return <span key={dia} className="size-3.5" />;
                  const v = valores[`${mes}-${dia}`];
                  return (
                    <span
                      key={dia}
                      className={cn("size-3.5 rounded-[3px]", classe(v))}
                      title={`${dia}/${mes}/${ano}${v !== undefined ? ` · ${fmtUSD(v)}` : " · sem registro"}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-2 pl-9 pt-2 text-[10px] text-muted-foreground">
          <span>prejuízo</span>
          <span className="size-3 rounded-[3px] bg-red-600" />
          <span className="size-3 rounded-[3px] bg-red-500/80" />
          <span className="size-3 rounded-[3px] bg-red-400/50" />
          <span className="size-3 rounded-[3px] bg-muted" />
          <span className="size-3 rounded-[3px] bg-emerald-400/50" />
          <span className="size-3 rounded-[3px] bg-emerald-500/80" />
          <span className="size-3 rounded-[3px] bg-emerald-600" />
          <span>lucro</span>
        </div>
      </div>
    </div>
  );
}
