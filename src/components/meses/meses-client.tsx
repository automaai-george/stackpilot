"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtUSD, fmtHoras } from "@/lib/format";
import {
  MESES,
  lucroPorHora,
  paraUSD,
  resultado,
  type CotacaoMap,
  type RegistroT,
  type SiteT,
} from "@/lib/calc";

type DiaFull = { ano: number; mes: number; dia: number; jogou: boolean; horas: number | null };

function corLucro(v: number) {
  if (v > 0) return "text-emerald-600 dark:text-emerald-400";
  if (v < 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

export function MesesClient({
  sites,
  registros,
  dias,
  cotacoes,
  anos,
  anoAtual,
  mesAtual,
}: {
  sites: SiteT[];
  registros: RegistroT[];
  dias: DiaFull[];
  cotacoes: CotacaoMap;
  anos: number[];
  anoAtual: number;
  mesAtual: number;
}) {
  const router = useRouter();
  const [ano, setAno] = useState(anos.includes(anoAtual) ? anoAtual : (anos[0] ?? anoAtual));

  const meses = useMemo(() => {
    const moedaDe = new Map(sites.map((s) => [s.id, s.moeda ?? "USD"]));
    const porMes = Array.from({ length: 12 }, () => ({
      lucro: 0,
      horas: 0,
      diasJogados: 0,
    }));
    for (const r of registros) {
      if (r.ano !== ano) continue;
      porMes[r.mes - 1].lucro += paraUSD(resultado(r), moedaDe.get(r.siteId), cotacoes);
    }
    for (const d of dias) {
      if (d.ano !== ano) continue;
      porMes[d.mes - 1].horas += d.horas ?? 0;
      if (d.jogou || (d.horas ?? 0) > 0) porMes[d.mes - 1].diasJogados++;
    }
    return porMes;
  }, [sites, registros, dias, cotacoes, ano]);

  const totalAno = meses.reduce((s, m) => s + m.lucro, 0);
  const horasAno = meses.reduce((s, m) => s + m.horas, 0);
  const diasAno = meses.reduce((s, m) => s + m.diasJogados, 0);
  const lphAno = lucroPorHora(totalAno, horasAno);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meses</h1>
          <p className="text-sm text-muted-foreground">
            Escolha o ano e clique num mês para lançar ou revisar os registros.
          </p>
        </div>
        <div className="flex gap-1.5">
          {anos.map((a) => (
            <Button
              key={a}
              size="sm"
              variant={a === ano ? "default" : "outline"}
              onClick={() => setAno(a)}
            >
              {a}
            </Button>
          ))}
        </div>
      </div>

      {/* resumo do ano escolhido */}
      <Card className="py-3">
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {ano}
          </span>
          <span>
            Lucro{" "}
            <span className={cn("font-semibold tabular-nums", corLucro(totalAno))}>
              {fmtUSD(totalAno)}
            </span>
          </span>
          <span>
            Horas <span className="font-semibold tabular-nums">{fmtHoras(horasAno)}</span>
          </span>
          <span>
            Dias jogados <span className="font-semibold tabular-nums">{diasAno}</span>
          </span>
          <span>
            Lucro/hora{" "}
            <span className={cn("font-semibold tabular-nums", corLucro(lphAno ?? 0))}>
              {lphAno === null ? "—" : fmtUSD(lphAno)}
            </span>
          </span>
          <Button variant="ghost" size="sm" className="ml-auto" asChild>
            <Link href={`/anual/${ano}`}>
              Visão anual completa
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* grade de meses */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {MESES.map((nome, i) => {
          const mes = i + 1;
          const m = meses[i];
          const ehAtual = ano === anoAtual && mes === mesAtual;
          const vazio = m.lucro === 0 && m.diasJogados === 0 && m.horas === 0;
          return (
            <Link
              key={nome}
              href={`/mes/${ano}/${mes}`}
              className={cn(
                "group relative rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md",
                ehAtual && "border-primary shadow-sm",
                vazio && "opacity-70 hover:opacity-100"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold tracking-tight">{nome}</span>
                {ehAtual ? (
                  <Badge className="text-[10px]">atual</Badge>
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
                )}
              </div>
              <div className={cn("mt-3 text-xl font-semibold tabular-nums", corLucro(m.lucro))}>
                {vazio ? <span className="text-muted-foreground/40">—</span> : fmtUSD(m.lucro)}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {m.diasJogados > 0 || m.horas > 0
                    ? `${m.diasJogados} ${m.diasJogados === 1 ? "dia" : "dias"} · ${fmtHoras(m.horas)}`
                    : "sem registros"}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  className="rounded p-1 opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
                  aria-label={`Relatório de ${nome}`}
                  title="Relatório do mês"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/relatorio/${ano}/${mes}`);
                  }}
                >
                  <FileText className="size-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
