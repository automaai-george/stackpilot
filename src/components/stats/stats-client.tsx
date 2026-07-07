"use client";

import { useMemo, useState } from "react";

/** Bootstrap: reamostra os resultados diários e projeta cenários futuros */
function simularVariancia(amostra: number[], diasFuturos = 60, runs = 2000) {
  const finais: number[] = [];
  const drawdowns: number[] = [];
  for (let r = 0; r < runs; r++) {
    let acc = 0;
    let pico = 0;
    let dd = 0;
    for (let d = 0; d < diasFuturos; d++) {
      acc += amostra[Math.floor(Math.random() * amostra.length)];
      if (acc > pico) pico = acc;
      dd = Math.min(dd, acc - pico);
    }
    finais.push(acc);
    drawdowns.push(dd);
  }
  finais.sort((a, b) => a - b);
  drawdowns.sort((a, b) => a - b);
  const pct = (arr: number[], p: number) => arr[Math.floor((arr.length - 1) * p)];
  return {
    p5: pct(finais, 0.05),
    p50: pct(finais, 0.5),
    p95: pct(finais, 0.95),
    probNegativo: finais.filter((f) => f < 0).length / finais.length,
    ddTipico: pct(drawdowns, 0.5),
    ddSevero: pct(drawdowns, 0.05),
    diasFuturos,
  };
}
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown, Waves } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fmtUSD, fmtHoras } from "@/lib/format";
import {
  lucroPorHora,
  paraUSD,
  resultado,
  type CotacaoMap,
  type RegistroT,
  type SiteT,
} from "@/lib/calc";

type DiaFull = {
  ano: number; mes: number; dia: number; jogou: boolean; horas: number | null;
  estado: string | null; tipoJogo: string | null;
};
type SessaoT = { ano: number; mes: number; dia: number; inicio: string; fim: string | null };

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const FAIXAS = [
  { nome: "Madrugada", de: 0, ate: 6 },
  { nome: "Manhã", de: 6, ate: 12 },
  { nome: "Tarde", de: 12, ate: 18 },
  { nome: "Noite", de: 18, ate: 24 },
];
const TIPOS: Record<string, string> = {
  cash: "Cash", mtt: "MTT", spin: "Spins", misto: "Misto", sem: "Sem etiqueta",
};
const CORES_PIZZA = ["#10b981", "#6366f1", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#84cc16", "#ec4899", "#f97316"];

function corLucro(v: number) {
  if (v > 0) return "text-emerald-600 dark:text-emerald-400";
  if (v < 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--popover-foreground)",
  fontSize: 12,
};

export function StatsClient({
  sites,
  registros,
  dias,
  sessoes,
  cotacoes,
  anos,
}: {
  sites: SiteT[];
  registros: RegistroT[]; // ordem cronológica
  dias: DiaFull[];
  sessoes: SessaoT[];
  cotacoes: CotacaoMap;
  anos: number[];
}) {
  const [ano, setAno] = useState(0); // 0 = todos
  const [sim, setSim] = useState<ReturnType<typeof simularVariancia> | null>(null);
  const [simulando, setSimulando] = useState(false);

  const stats = useMemo(() => {
    const moedaDoSite = new Map(sites.map((s) => [s.id, s.moeda ?? "USD"]));
    const emUSD = (v: number, siteId: number) =>
      paraUSD(v, moedaDoSite.get(siteId), cotacoes);
    const doAno = (r: { ano: number }) => ano === 0 || r.ano === ano;

    const regsP = registros.filter(doAno);
    const diasP = dias.filter(doAno);
    const sessP = sessoes.filter(doAno);

    // ---- resultado por dia (USD) e sites com registro por dia ----
    const chave = (a: number, m: number, d: number) =>
      `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const resPorDia = new Map<string, number>();
    const sitesDoDia = new Map<string, Set<number>>();
    for (const r of regsP) {
      const k = chave(r.ano, r.mes, r.dia);
      resPorDia.set(k, (resPorDia.get(k) ?? 0) + emUSD(resultado(r), r.siteId));
      if (r.bancaInicial !== null || r.saldoFinal !== null) {
        if (!sitesDoDia.has(k)) sitesDoDia.set(k, new Set());
        sitesDoDia.get(k)!.add(r.siteId);
      }
    }

    // ---- downswing / drawdown ----
    const chavesOrdenadas = [...resPorDia.keys()].sort();
    let acc = 0;
    let pico = 0;
    let picoChave = "";
    let maxDD = 0;
    let maxDDIni = "";
    let maxDDFim = "";
    const underwater: { label: string; dd: number }[] = [];
    for (const k of chavesOrdenadas) {
      const v = resPorDia.get(k)!;
      if (v === 0) continue;
      acc += v;
      if (acc >= pico) {
        pico = acc;
        picoChave = k;
      }
      const dd = acc - pico;
      if (dd < maxDD) {
        maxDD = dd;
        maxDDIni = picoChave;
        maxDDFim = k;
      }
      const [a, m, d] = k.split("-");
      underwater.push({ label: `${Number(d)}/${Number(m)}${ano === 0 ? `/${a.slice(2)}` : ""}`, dd: Number(dd.toFixed(2)) });
    }
    const ddAtual = acc - pico;
    const diffDias = (k1: string, k2: string) => {
      if (!k1 || !k2) return 0;
      const [a1, m1, d1] = k1.split("-").map(Number);
      const [a2, m2, d2] = k2.split("-").map(Number);
      return Math.round(
        (Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000
      );
    };
    const fmtChave = (k: string) => {
      if (!k) return "—";
      const [a, m, d] = k.split("-").map(Number);
      return `${d}/${m}/${a}`;
    };

    // ---- por dia da semana ----
    const semana = DIAS_SEMANA.map((nome) => ({ nome, total: 0, dias: 0, positivos: 0 }));
    for (const k of chavesOrdenadas) {
      const v = resPorDia.get(k)!;
      if (v === 0) continue;
      const [a, m, d] = k.split("-").map(Number);
      const dw = new Date(a, m - 1, d).getDay();
      semana[dw].total += v;
      semana[dw].dias++;
      if (v > 0) semana[dw].positivos++;
    }
    const serieSemana = semana.map((s) => ({
      nome: s.nome,
      total: Number(s.total.toFixed(2)),
      media: s.dias > 0 ? Number((s.total / s.dias).toFixed(2)) : 0,
      dias: s.dias,
      winrate: s.dias > 0 ? Math.round((s.positivos / s.dias) * 100) : 0,
    }));

    // ---- por faixa de horário (primeira sessão do dia) ----
    const inicioDoDia = new Map<string, string>();
    for (const s of sessP) {
      const k = chave(s.ano, s.mes, s.dia);
      const atual = inicioDoDia.get(k);
      if (!atual || s.inicio < atual) inicioDoDia.set(k, s.inicio);
    }
    const faixas = FAIXAS.map((f) => ({ nome: f.nome, total: 0, dias: 0 }));
    let diasComHorario = 0;
    for (const [k, inicio] of inicioDoDia) {
      const v = resPorDia.get(k);
      if (v === undefined || v === 0) continue;
      const hora = Number(inicio.split(":")[0]);
      const f = faixas[FAIXAS.findIndex((x) => hora >= x.de && hora < x.ate)];
      f.total += v;
      f.dias++;
      diasComHorario++;
    }
    const serieFaixas = faixas.map((f) => ({
      nome: f.nome,
      total: Number(f.total.toFixed(2)),
      media: f.dias > 0 ? Number((f.total / f.dias).toFixed(2)) : 0,
      dias: f.dias,
    }));

    // ---- por site (horas do dia rateadas entre os sites jogados) ----
    const horasDoDia = new Map<string, number>();
    for (const d of diasP) {
      if (d.horas) horasDoDia.set(chave(d.ano, d.mes, d.dia), d.horas);
    }
    const porSite = new Map<number, { lucro: number; horasEst: number; dias: number }>();
    for (const r of regsP) {
      const v = emUSD(resultado(r), r.siteId);
      const atual = porSite.get(r.siteId) ?? { lucro: 0, horasEst: 0, dias: 0 };
      atual.lucro += v;
      porSite.set(r.siteId, atual);
    }
    for (const [k, setSites] of sitesDoDia) {
      const horas = horasDoDia.get(k) ?? 0;
      if (horas === 0 || setSites.size === 0) continue;
      const porCada = horas / setSites.size;
      for (const id of setSites) {
        const atual = porSite.get(id) ?? { lucro: 0, horasEst: 0, dias: 0 };
        atual.horasEst += porCada;
        atual.dias++;
        porSite.set(id, atual);
      }
    }
    const tabelaSites = sites
      .map((s) => {
        const v = porSite.get(s.id);
        if (!v || (v.lucro === 0 && v.dias === 0)) return null;
        return {
          nome: s.nome,
          lucro: v.lucro,
          dias: v.dias,
          horasEst: v.horasEst,
          lph: lucroPorHora(v.lucro, v.horasEst),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.lucro - a!.lucro) as {
      nome: string; lucro: number; dias: number; horasEst: number; lph: number | null;
    }[];

    // ---- distribuição da banca atual (sites ativos, todos os anos) ----
    const bancaPorSite = new Map<number, number>();
    for (const r of registros) {
      if (r.saldoFinal !== null) bancaPorSite.set(r.siteId, emUSD(r.saldoFinal, r.siteId));
    }
    const pizza = sites
      .filter((s) => s.ativo && (bancaPorSite.get(s.id) ?? 0) > 0)
      .map((s) => ({ nome: s.nome, valor: Number((bancaPorSite.get(s.id) ?? 0).toFixed(2)) }));

    // ---- por tipo de jogo e por estado mental ----
    const agrupar = (campo: "tipoJogo" | "estado") => {
      const grupos = new Map<string, { lucro: number; horas: number; dias: number }>();
      for (const d of diasP) {
        const jogou = d.jogou || (d.horas ?? 0) > 0;
        const res = resPorDia.get(chave(d.ano, d.mes, d.dia)) ?? 0;
        if (!jogou && res === 0) continue;
        const g = d[campo] ?? "sem";
        const atual = grupos.get(g) ?? { lucro: 0, horas: 0, dias: 0 };
        atual.lucro += res;
        atual.horas += d.horas ?? 0;
        atual.dias++;
        grupos.set(g, atual);
      }
      return [...grupos.entries()]
        .map(([g, v]) => ({ grupo: g, ...v, lph: lucroPorHora(v.lucro, v.horas) }))
        .sort((a, b) => b.lucro - a.lucro);
    };

    // ---- conquistas / recordes ----
    let melhorDia: { k: string; v: number } | null = null;
    let streak = 0;
    let streakMax = 0;
    const resultadosDiarios: number[] = [];
    for (const k of chavesOrdenadas) {
      const v = resPorDia.get(k)!;
      if (v === 0) continue;
      resultadosDiarios.push(v);
      if (!melhorDia || v > melhorDia.v) melhorDia = { k, v };
      if (v > 0) {
        streak++;
        streakMax = Math.max(streakMax, streak);
      } else {
        streak = 0;
      }
    }
    const porMesLucro = new Map<string, number>();
    const porMesHoras = new Map<string, number>();
    for (const k of chavesOrdenadas) {
      const [a, m] = k.split("-");
      const km = `${Number(m)}/${a}`;
      porMesLucro.set(km, (porMesLucro.get(km) ?? 0) + resPorDia.get(k)!);
    }
    for (const d of diasP) {
      const km = `${d.mes}/${d.ano}`;
      porMesHoras.set(km, (porMesHoras.get(km) ?? 0) + (d.horas ?? 0));
    }
    const melhorMes = [...porMesLucro.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
    const mesMaisHoras = [...porMesHoras.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

    return {
      maxDD, maxDDIni: fmtChave(maxDDIni), maxDDFim: fmtChave(maxDDFim),
      maxDDDuracao: diffDias(maxDDIni, maxDDFim),
      ddAtual,
      diasDesdePico: diffDias(picoChave, chavesOrdenadas[chavesOrdenadas.length - 1] ?? ""),
      pico,
      picoData: fmtChave(picoChave),
      underwater,
      serieSemana,
      serieFaixas,
      diasComHorario,
      tabelaSites,
      pizza,
      porTipo: agrupar("tipoJogo"),
      porEstado: agrupar("estado"),
      resultadosDiarios,
      melhorDia: melhorDia ? { data: fmtChave(melhorDia.k), v: melhorDia.v } : null,
      streakVerde: streakMax,
      melhorMes,
      mesMaisHoras,
    };
  }, [sites, registros, dias, sessoes, cotacoes, ano]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Estatísticas</h1>
          <p className="text-sm text-muted-foreground">
            Variância, padrões e comparativos —{" "}
            {ano === 0 ? "todo o histórico" : ano}.
          </p>
        </div>
        <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
          <SelectTrigger size="sm" className="w-36" aria-label="Ano">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Todo o histórico</SelectItem>
            {anos.map((a) => (
              <SelectItem key={a} value={String(a)}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Downswing */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="gap-1.5 py-4">
          <CardHeader className="px-4 py-0">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <TrendingDown className="size-3.5" /> Maior downswing
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 py-0">
            <div className="text-xl font-semibold tabular-nums text-red-600 dark:text-red-400">
              {stats.maxDD < 0 ? fmtUSD(stats.maxDD) : "—"}
            </div>
            {stats.maxDD < 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {stats.maxDDIni} → {stats.maxDDFim} · {stats.maxDDDuracao} dias
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="gap-1.5 py-4">
          <CardHeader className="px-4 py-0">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Waves className="size-3.5" /> Downswing atual
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 py-0">
            {stats.ddAtual < -0.005 ? (
              <>
                <div className="text-xl font-semibold tabular-nums text-red-600 dark:text-red-400">
                  {fmtUSD(stats.ddAtual)}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  há {stats.diasDesdePico} dias abaixo do pico
                </p>
              </>
            ) : (
              <>
                <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                  No pico! 🏔️
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  banca acumulada no ponto mais alto
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="gap-1.5 py-4 lg:col-span-2">
          <CardHeader className="px-4 py-0">
            <CardDescription className="text-xs">
              Gráfico &quot;underwater&quot; — distância do pico ao longo do tempo
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 py-0">
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.underwater} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                  <XAxis dataKey="label" hide />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v) => [fmtUSD(Number(v)), "Abaixo do pico"]}
                    labelFormatter={(l) => `Dia ${l}`}
                    contentStyle={tooltipStyle}
                  />
                  <ReferenceLine y={0} stroke="var(--border)" />
                  <Area
                    type="monotone"
                    dataKey="dd"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    fill="#ef4444"
                    fillOpacity={0.25}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dia da semana + horário */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado por dia da semana</CardTitle>
            <CardDescription>
              Média por dia jogado; passe o mouse para ver total e winrate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.serieSemana} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="nome" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={70} tickFormatter={(v: number) => fmtUSD(v)} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, nome, item) => {
                      const p = item?.payload as (typeof stats.serieSemana)[0];
                      return [
                        `${fmtUSD(Number(v))} · total ${fmtUSD(p.total)} · ${p.dias} dias · ${p.winrate}% verdes`,
                        "Média/dia",
                      ];
                    }}
                  />
                  <ReferenceLine y={0} stroke="var(--border)" />
                  <Bar dataKey="media" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {stats.serieSemana.map((s) => (
                      <Cell key={s.nome} fill={s.media >= 0 ? "#10b981" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado por horário de início</CardTitle>
            <CardDescription>
              {stats.diasComHorario > 0
                ? `Baseado na primeira sessão de ${stats.diasComHorario} dias com horário registrado.`
                : "Registre os horários das sessões no grind para liberar esta análise."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.serieFaixas} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="nome" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={70} tickFormatter={(v: number) => fmtUSD(v)} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, nome, item) => {
                      const p = item?.payload as (typeof stats.serieFaixas)[0];
                      return [`${fmtUSD(Number(v))} · total ${fmtUSD(p.total)} · ${p.dias} dias`, "Média/dia"];
                    }}
                  />
                  <ReferenceLine y={0} stroke="var(--border)" />
                  <Bar dataKey="media" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {stats.serieFaixas.map((s) => (
                      <Cell key={s.nome} fill={s.media >= 0 ? "#10b981" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Por site */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Comparativo entre sites</CardTitle>
            <CardDescription>
              Horas rateadas igualmente entre os sites jogados no dia (estimativa).
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-max border-collapse text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 text-left font-medium">Site</th>
                  <th className="px-3 py-2 text-right font-medium">Lucro</th>
                  <th className="px-3 py-2 text-right font-medium">Dias</th>
                  <th className="px-3 py-2 text-right font-medium">Horas est.</th>
                  <th className="py-2 pl-3 text-right font-medium">Lucro/h est.</th>
                </tr>
              </thead>
              <tbody>
                {stats.tabelaSites.map((s) => (
                  <tr key={s.nome} className="border-b transition-colors last:border-0 hover:bg-accent/40">
                    <td className="py-2 pr-3 font-medium">{s.nome}</td>
                    <td className={cn("px-3 py-2 text-right tabular-nums font-semibold", corLucro(s.lucro))}>
                      {fmtUSD(s.lucro)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{s.dias}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {fmtHoras(s.horasEst)}
                    </td>
                    <td className={cn("py-2 pl-3 text-right tabular-nums", corLucro(s.lph ?? 0))}>
                      {s.lph === null ? "—" : fmtUSD(s.lph)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Distribuição da banca</CardTitle>
            <CardDescription>Entre os sites ativos, agora.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.pizza.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem bancas positivas.</p>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.pizza}
                      dataKey="valor"
                      nameKey="nome"
                      innerRadius="55%"
                      outerRadius="85%"
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {stats.pizza.map((p, i) => (
                        <Cell key={p.nome} fill={CORES_PIZZA[i % CORES_PIZZA.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmtUSD(Number(v))} contentStyle={tooltipStyle} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conquistas + simulador de variância */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recordes</CardTitle>
            <CardDescription>Marcos da sua carreira no período.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            {[
              {
                t: "Melhor dia",
                v: stats.melhorDia ? fmtUSD(stats.melhorDia.v) : "—",
                r: stats.melhorDia?.data,
                cor: "text-emerald-600 dark:text-emerald-400",
              },
              {
                t: "Melhor mês",
                v: stats.melhorMes ? fmtUSD(stats.melhorMes[1]) : "—",
                r: stats.melhorMes?.[0],
                cor: "text-emerald-600 dark:text-emerald-400",
              },
              {
                t: "Pico da banca acumulada",
                v: fmtUSD(stats.pico),
                r: stats.picoData,
                cor: "",
              },
              {
                t: "Sequência verde",
                v: `${stats.streakVerde} dias`,
                r: "dias positivos seguidos",
                cor: "",
              },
              {
                t: "Mês com mais volume",
                v: stats.mesMaisHoras ? fmtHoras(stats.mesMaisHoras[1]) : "—",
                r: stats.mesMaisHoras?.[0],
                cor: "",
              },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border px-3 py-2.5">
                <div className="text-[11px] text-muted-foreground">{c.t}</div>
                <div className={cn("font-semibold tabular-nums", c.cor)}>{c.v}</div>
                {c.r && <div className="text-[11px] text-muted-foreground">{c.r}</div>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Simulador de variância</CardTitle>
            <CardDescription>
              Reamostra seus {stats.resultadosDiarios.length} dias de resultado e
              projeta 2.000 cenários para os próximos 60 dias jogados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.resultadosDiarios.length < 30 ? (
              <p className="text-sm text-muted-foreground">
                Amostra pequena (mínimo 30 dias com resultado) — jogue mais dias
                ou mude o filtro para &quot;Todo o histórico&quot;.
              </p>
            ) : (
              <>
                <Button
                  size="sm"
                  disabled={simulando}
                  onClick={() => {
                    setSimulando(true);
                    // deixa o botão renderizar antes do cálculo
                    setTimeout(() => {
                      setSim(simularVariancia(stats.resultadosDiarios));
                      setSimulando(false);
                    }, 30);
                  }}
                >
                  {sim ? "Simular de novo" : "Simular"}
                </Button>
                {sim && (
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { t: "Cenário ruim (5%)", v: sim.p5, cor: corLucro(sim.p5) },
                        { t: "Mediana", v: sim.p50, cor: corLucro(sim.p50) },
                        { t: "Cenário bom (95%)", v: sim.p95, cor: corLucro(sim.p95) },
                      ].map((c) => (
                        <div key={c.t} className="rounded-xl border px-3 py-2.5">
                          <div className="text-[11px] text-muted-foreground">{c.t}</div>
                          <div className={cn("font-semibold tabular-nums", c.cor)}>
                            {fmtUSD(c.v)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Em {sim.diasFuturos} dias jogados: downswing típico de{" "}
                      <span className="font-medium text-foreground">
                        {fmtUSD(sim.ddTipico)}
                      </span>
                      ; nos 5% piores cenários passa de{" "}
                      <span className="font-medium text-foreground">
                        {fmtUSD(sim.ddSevero)}
                      </span>
                      . Chance de terminar no negativo:{" "}
                      <span className="font-medium text-foreground">
                        {Math.round(sim.probNegativo * 100)}%
                      </span>
                      . Downswing dentro disso é matemática, não sinal de jogo ruim.
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tipo de jogo + estado mental */}
      <div className="grid gap-6 lg:grid-cols-2">
        {(
          [
            { titulo: "Por tipo de jogo", dados: stats.porTipo, dica: "Etiquete os dias no grind (Cash/MTT/Spins)." },
            { titulo: "Por estado mental (A/B/C)", dados: stats.porEstado, dica: "Marque seu jogo A/B/C no grind para cruzar com o resultado." },
          ] as const
        ).map(({ titulo, dados, dica }) => (
          <Card key={titulo}>
            <CardHeader>
              <CardTitle className="text-base">{titulo}</CardTitle>
              {dados.every((d) => d.grupo === "sem") && (
                <CardDescription>{dica}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-max border-collapse text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3 text-left font-medium">Grupo</th>
                    <th className="px-3 py-2 text-right font-medium">Lucro</th>
                    <th className="px-3 py-2 text-right font-medium">Dias</th>
                    <th className="px-3 py-2 text-right font-medium">Horas</th>
                    <th className="py-2 pl-3 text-right font-medium">Lucro/h</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map((g) => (
                    <tr key={g.grupo} className="border-b transition-colors last:border-0 hover:bg-accent/40">
                      <td className="py-2 pr-3 font-medium">{TIPOS[g.grupo] ?? g.grupo}</td>
                      <td className={cn("px-3 py-2 text-right tabular-nums font-semibold", corLucro(g.lucro))}>
                        {fmtUSD(g.lucro)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{g.dias}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {fmtHoras(g.horas)}
                      </td>
                      <td className={cn("py-2 pl-3 text-right tabular-nums", corLucro(g.lph ?? 0))}>
                        {g.lph === null ? "—" : fmtUSD(g.lph)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
