"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Clock,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
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
  MESES,
  MESES_CURTO,
  diasNoMes,
  lucroPorHora,
  paraUSD,
  resultado,
  type CarteiraT,
  type CotacaoMap,
  type RegistroT,
  type SiteT,
} from "@/lib/calc";
import { MetasSection, type MetaValores } from "@/components/dashboard/metas-section";
import { toast } from "sonner";

type DiaFull = {
  ano: number;
  mes: number;
  dia: number;
  jogou: boolean;
  horas: number | null;
  horasEstudo?: number | null;
};
type SaldoFull = { carteiraId: number; ano: number; mes: number; valor: number };
type MetaT = { ano: number; mes: number } & MetaValores;
type MovT = {
  id: number; ano: number; mes: number; dia: number;
  tipo: string; valor: number; descricao: string | null;
};
type ConfigT = {
  concentracaoMaxPct: number | null;
  saldoMinimo: number | null;
  abi: number | null;
  buyinsMin: number | null;
  buyinsTeto: number | null;
} | null;
// ano = 0 significa "todos os anos"
type Filtro = { ano: number; deMes: number; ateMes: number };

function corLucro(v: number) {
  if (v > 0) return "text-emerald-600 dark:text-emerald-400";
  if (v < 0) return "text-red-600 dark:text-red-400";
  return "";
}

function BigCard({
  titulo,
  valor,
  rodape,
  icone,
  destaque,
}: {
  titulo: string;
  valor: React.ReactNode;
  rodape?: React.ReactNode;
  icone: React.ReactNode;
  destaque?: boolean;
}) {
  return (
    <Card
      className={cn(
        "gap-2 py-5 transition-shadow hover:shadow-md",
        destaque && "bg-primary text-primary-foreground"
      )}
    >
      <CardHeader className="px-5 py-0">
        <CardDescription
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium",
            destaque && "text-primary-foreground/70"
          )}
        >
          {icone}
          {titulo}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 py-0">
        <div className="text-2xl font-semibold tracking-tight tabular-nums">
          {valor}
        </div>
        {rodape && (
          <div
            className={cn(
              "mt-1 text-xs text-muted-foreground",
              destaque && "text-primary-foreground/70"
            )}
          >
            {rodape}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardClient({
  sites,
  registros,
  dias,
  carteiras,
  saldos,
  metasIniciais,
  movimentacoes,
  config,
  cotacoes,
  anos,
  anoAtual,
  mesAtual,
  diaAtual,
}: {
  sites: SiteT[];
  registros: RegistroT[]; // ordenados por ano, mês, dia
  dias: DiaFull[];
  carteiras: CarteiraT[];
  saldos: SaldoFull[]; // ordenados por ano, mês
  metasIniciais: MetaT[];
  movimentacoes: MovT[];
  config: ConfigT;
  cotacoes: CotacaoMap;
  anos: number[]; // decrescente
  anoAtual: number;
  mesAtual: number;
  diaAtual: number;
}) {
  const [filtro, setFiltro] = useState<Filtro>(
    // abre no mês atual (para o lucro/metas refletirem o mês); se o ano com
    // dados não for o atual, cai no ano inteiro
    anos.includes(anoAtual)
      ? { ano: anoAtual, deMes: mesAtual, ateMes: mesAtual }
      : { ano: anos[0] ?? anoAtual, deMes: 1, ateMes: 12 }
  );
  const [metas, setMetas] = useState<MetaT[]>(metasIniciais);

  const noPeriodo = (r: { ano: number; mes: number }) =>
    filtro.ano === 0
      ? true
      : r.ano === filtro.ano && r.mes >= filtro.deMes && r.mes <= filtro.ateMes;

  // converte o resultado de um registro para USD conforme a moeda do site
  const moedaDoSite = useMemo(
    () => new Map(sites.map((s) => [s.id, s.moeda ?? "USD"])),
    [sites]
  );
  const emUSD = (valor: number, siteId: number) =>
    paraUSD(valor, moedaDoSite.get(siteId), cotacoes);

  // ---- Banca total ATUAL (independe do filtro) ----
  const atual = useMemo(() => {
    const ativos = sites.filter((s) => s.ativo);
    const bancaPorSite = new Map<number, number>();
    for (const r of registros) {
      if (r.saldoFinal !== null && ativos.some((s) => s.id === r.siteId)) {
        bancaPorSite.set(r.siteId, emUSD(r.saldoFinal, r.siteId)); // já em ordem cronológica
      }
    }
    const saldoPorCarteira = new Map<number, number>();
    for (const s of saldos) {
      if (carteiras.some((c) => c.id === s.carteiraId)) {
        saldoPorCarteira.set(s.carteiraId, s.valor);
      }
    }
    const somaSites = [...bancaPorSite.values()].reduce((a, b) => a + b, 0);
    const somaCarteiras = [...saldoPorCarteira.values()].reduce((a, b) => a + b, 0);
    return { somaSites, somaCarteiras, total: somaSites + somaCarteiras, bancaPorSite };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites, registros, carteiras, saldos, cotacoes]);

  // ---- Alertas de gestão de banca ----
  const alertas = useMemo(() => {
    const avisos: string[] = [];
    const ativos = sites.filter((s) => s.ativo);
    if (config?.concentracaoMaxPct && atual.somaSites > 0) {
      for (const s of ativos) {
        const banca = atual.bancaPorSite.get(s.id) ?? 0;
        const pct = (banca / atual.somaSites) * 100;
        if (pct > config.concentracaoMaxPct) {
          avisos.push(
            `${s.nome} concentra ${pct.toFixed(0)}% da banca dos sites (limite: ${config.concentracaoMaxPct}%). Considere redistribuir.`
          );
        }
      }
    }
    if (config?.saldoMinimo) {
      for (const s of ativos) {
        const banca = atual.bancaPorSite.get(s.id);
        if (banca !== undefined && banca > 0 && banca < config.saldoMinimo) {
          avisos.push(
            `${s.nome} está com ${fmtUSD(banca)} — abaixo do seu mínimo de ${fmtUSD(config.saldoMinimo)}.`
          );
        }
      }
    }
    // gestão por buy-ins (Average Buy-in definido no Bankroll)
    if (config?.abi && config.abi > 0) {
      const min = config.buyinsMin ?? 200;
      const teto = config.buyinsTeto ?? 250;
      const buyins = atual.total / config.abi;
      const fmtBI = buyins.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
      if (buyins < min) {
        avisos.push(
          `Banca curta: ${fmtBI} buy-ins de ${fmtUSD(config.abi)} (mínimo saudável: ${min}). Considere descer o ABI ou reforçar a banca.`
        );
      } else if (buyins > teto) {
        avisos.push(
          `Você está com ${fmtBI} buy-ins — acima do teto de ${teto}. Pode sacar ${fmtUSD(atual.total - teto * config.abi)} ou subir o Average Buy-in.`
        );
      }
    }
    return avisos;
  }, [sites, atual, config]);

  // ---- Tudo que depende do período selecionado ----
  const calc = useMemo(() => {
    const regsP = registros.filter(noPeriodo);
    const diasP = dias.filter(noPeriodo);

    let lucro = 0;
    const porMes = new Map<string, number>(); // "ano-mes" -> lucro (USD)
    for (const r of regsP) {
      const res = emUSD(resultado(r), r.siteId);
      lucro += res;
      const k = `${r.ano}-${r.mes}`;
      porMes.set(k, (porMes.get(k) ?? 0) + res);
    }

    let horas = 0;
    let estudo = 0;
    let diasJogados = 0;
    const diasPorAno = new Map<number, number>();
    // mês/ano "com jogo" = teve dia jogado ou lucro diferente de zero
    // (linhas zeradas da planilha não contam)
    const mesesComDados = new Set<string>();
    const anosComDados = new Set<number>();
    for (const d of diasP) {
      horas += d.horas ?? 0;
      estudo += d.horasEstudo ?? 0;
      if (d.jogou || (d.horas ?? 0) > 0) {
        diasJogados++;
        diasPorAno.set(d.ano, (diasPorAno.get(d.ano) ?? 0) + 1);
        mesesComDados.add(`${d.ano}-${d.mes}`);
        anosComDados.add(d.ano);
      }
    }
    for (const [k, v] of porMes) {
      if (v !== 0) {
        mesesComDados.add(k);
        anosComDados.add(Number(k.split("-")[0]));
      }
    }

    // melhor e pior mês do período
    let melhor: { k: string; v: number } | null = null;
    for (const [k, v] of porMes) {
      if (v === 0) continue;
      if (!melhor || v > melhor.v) melhor = { k, v };
    }
    const nomeMes = (k: string) => {
      const [a, m] = k.split("-").map(Number);
      return filtro.ano === 0 ? `${MESES_CURTO[m - 1]}/${a}` : MESES_CURTO[m - 1];
    };

    // série acumulada (um ponto por dia com resultado)
    const serie: { label: string; acumulado: number }[] = [];
    let acc = 0;
    for (const r of regsP) {
      const res = emUSD(resultado(r), r.siteId);
      if (res === 0) continue;
      acc += res;
      const label =
        filtro.ano === 0
          ? `${r.dia}/${r.mes}/${String(r.ano).slice(2)}`
          : `${r.dia}/${r.mes}`;
      const last = serie[serie.length - 1];
      if (last && last.label === label) last.acumulado = Number(acc.toFixed(2));
      else serie.push({ label, acumulado: Number(acc.toFixed(2)) });
    }

    // por site: só sites com registros no período (ativos ou não)
    const porSite = sites
      .map((s) => {
        const meus = regsP.filter((r) => r.siteId === s.id);
        if (meus.length === 0) return null;
        let lucroSite = 0;
        let banca: number | null = null;
        for (const r of meus) {
          lucroSite += emUSD(resultado(r), r.siteId);
          if (r.saldoFinal !== null) banca = emUSD(r.saldoFinal, r.siteId);
        }
        return { nome: s.nome, ativo: s.ativo, lucro: lucroSite, banca };
      })
      .filter(Boolean) as { nome: string; ativo: boolean; lucro: number; banca: number | null }[];

    const nMeses = mesesComDados.size;
    const nAnos = anosComDados.size;
    return {
      lucro,
      horas,
      estudo,
      diasJogados,
      lph: lucroPorHora(lucro, horas),
      melhor: melhor ? { nome: nomeMes(melhor.k), valor: melhor.v } : null,
      mediaMensal: nMeses > 0 ? lucro / nMeses : null,
      nMeses,
      diasPorMes: nMeses > 0 ? diasJogados / nMeses : null,
      diasPorAnoMedia: nAnos > 0 ? diasJogados / nAnos : null,
      diasPorAno: [...diasPorAno.entries()].sort((a, b) => a[0] - b[0]),
      serie,
      porSite,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registros, dias, sites, filtro]);

  // ---- Metas do período (mês específico ou ano inteiro) ----
  const alcanceMeta = useMemo(() => {
    if (filtro.ano === 0) return null;
    if (filtro.deMes === filtro.ateMes) {
      return { ano: filtro.ano, mes: filtro.deMes };
    }
    if (filtro.deMes === 1 && filtro.ateMes === 12) {
      return { ano: filtro.ano, mes: 0 }; // meta anual
    }
    return null; // intervalos customizados não têm meta
  }, [filtro]);

  const metaResolvida = useMemo<MetaValores | null>(() => {
    if (!alcanceMeta) return null;
    const m = metas.find((x) => x.ano === alcanceMeta.ano && x.mes === alcanceMeta.mes);
    if (m) return { lucroAlvo: m.lucroAlvo, horasAlvo: m.horasAlvo, diasAlvo: m.diasAlvo };
    if (alcanceMeta.mes === 0) {
      // sem meta anual explícita: soma as mensais do ano, se houver
      const doAno = metas.filter((x) => x.ano === alcanceMeta.ano && x.mes > 0);
      if (doAno.length > 0) {
        const soma = (c: keyof MetaValores) =>
          doAno.some((x) => x[c] !== null)
            ? doAno.reduce((s, x) => s + (Number(x[c]) || 0), 0)
            : null;
        return { lucroAlvo: soma("lucroAlvo"), horasAlvo: soma("horasAlvo"), diasAlvo: soma("diasAlvo") };
      }
    }
    return { lucroAlvo: null, horasAlvo: null, diasAlvo: null };
  }, [alcanceMeta, metas]);

  // fração do período decorrida (marcador de ritmo)
  const pace = useMemo(() => {
    if (!alcanceMeta) return 0;
    if (alcanceMeta.ano < anoAtual) return 1;
    if (alcanceMeta.ano > anoAtual) return 0;
    if (alcanceMeta.mes === 0) {
      const diaDoAno =
        Math.floor(
          (Date.UTC(anoAtual, mesAtual - 1, diaAtual) - Date.UTC(anoAtual, 0, 1)) / 86400000
        ) + 1;
      return diaDoAno / 365;
    }
    if (alcanceMeta.mes < mesAtual) return 1;
    if (alcanceMeta.mes > mesAtual) return 0;
    return diaAtual / diasNoMes(anoAtual, mesAtual);
  }, [alcanceMeta, anoAtual, mesAtual, diaAtual]);

  // projeções de fechamento — só para o mês atual
  const projecoes = useMemo(() => {
    if (!alcanceMeta || alcanceMeta.mes !== mesAtual || alcanceMeta.ano !== anoAtual) {
      return null;
    }
    const nDias = diasNoMes(anoAtual, mesAtual);
    const decorridos = Math.max(1, diaAtual);
    const restantes = nDias - decorridos;

    // 1) ritmo deste mês (exige amostra mínima)
    let ritmo: number | null = null;
    if (calc.diasJogados >= 5) {
      const freq = calc.diasJogados / decorridos;
      const diasProjetados = calc.diasJogados + freq * restantes;
      ritmo = (calc.lucro / calc.diasJogados) * diasProjetados;
    }

    // 2) pelo histórico: lucro/hora dos últimos 12 meses (todas as moedas em USD)
    const chave = (a: number, m: number) => a * 12 + m;
    const corte = chave(anoAtual, mesAtual) - 12;
    let lucro12 = 0;
    let horas12 = 0;
    for (const r of registros) {
      if (chave(r.ano, r.mes) >= corte) lucro12 += emUSD(resultado(r), r.siteId);
    }
    let somaHorasDia12 = 0;
    let diasJogados12 = 0;
    for (const d of dias) {
      if (chave(d.ano, d.mes) >= corte) {
        horas12 += d.horas ?? 0;
        if (d.jogou || (d.horas ?? 0) > 0) {
          diasJogados12++;
          somaHorasDia12 += d.horas ?? 0;
        }
      }
    }
    let historico: number | null = null;
    if (horas12 >= 50) {
      const lph12 = lucro12 / horas12;
      const horasRestantes =
        metaResolvida?.horasAlvo != null
          ? Math.max(0, metaResolvida.horasAlvo - calc.horas)
          : (diasJogados12 > 0 ? somaHorasDia12 / diasJogados12 : 0) *
            (calc.diasJogados / decorridos) *
            restantes;
      historico = calc.lucro + lph12 * horasRestantes;
    }

    return { ritmo, historico, downswing: calc.lucro < 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alcanceMeta, calc, registros, dias, metaResolvida, anoAtual, mesAtual, diaAtual]);

  async function salvarMeta(campo: keyof MetaValores, v: number | null) {
    if (!alcanceMeta) return;
    setMetas((prev) => {
      const idx = prev.findIndex(
        (m) => m.ano === alcanceMeta.ano && m.mes === alcanceMeta.mes
      );
      if (idx >= 0) {
        const novo = [...prev];
        novo[idx] = { ...novo[idx], [campo]: v };
        return novo;
      }
      return [
        ...prev,
        { ano: alcanceMeta.ano, mes: alcanceMeta.mes, lucroAlvo: null, horasAlvo: null, diasAlvo: null, [campo]: v },
      ];
    });
    try {
      const res = await fetch("/api/metas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ano: alcanceMeta.ano, mes: alcanceMeta.mes, [campo]: v }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Não foi possível salvar a meta");
    }
  }

  // ---- Caixa (saques/depósitos/despesas) do período ----
  const caixa = useMemo(() => {
    const movP = movimentacoes.filter(noPeriodo);
    const soma = (tipo: string) =>
      movP.filter((m) => m.tipo === tipo).reduce((s, m) => s + m.valor, 0);
    return { saques: soma("saque"), depositos: soma("deposito"), despesas: soma("despesa") };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimentacoes, filtro]);

  // ---- Rótulo do período ----
  const periodoLabel =
    filtro.ano === 0
      ? "todo o histórico"
      : filtro.deMes === 1 && filtro.ateMes === 12
        ? `${filtro.ano}`
        : filtro.deMes === filtro.ateMes
          ? `${MESES[filtro.deMes - 1]} de ${filtro.ano}`
          : `${MESES_CURTO[filtro.deMes - 1]}–${MESES_CURTO[filtro.ateMes - 1]} de ${filtro.ano}`;

  const presets = [
    {
      nome: "Este mês",
      ativo:
        filtro.ano === anoAtual &&
        filtro.deMes === mesAtual &&
        filtro.ateMes === mesAtual,
      aplicar: () => setFiltro({ ano: anoAtual, deMes: mesAtual, ateMes: mesAtual }),
    },
    {
      nome: "Este ano",
      ativo: filtro.ano === anoAtual && filtro.deMes === 1 && filtro.ateMes === 12,
      aplicar: () => setFiltro({ ano: anoAtual, deMes: 1, ateMes: 12 }),
    },
    {
      nome: "Tudo",
      ativo: filtro.ano === 0,
      aplicar: () => setFiltro({ ano: 0, deMes: 1, ateMes: 12 }),
    },
  ];

  const positivo = calc.lucro >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Resultados de <span className="font-medium text-foreground">{periodoLabel}</span>.
          </p>
        </div>
      </div>

      {/* Filtro de período */}
      <Card className="py-3">
        <CardContent className="flex flex-wrap items-center gap-2 px-4">
          <span className="mr-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CalendarRange className="size-3.5" />
            Período
          </span>

          <Select
            value={String(filtro.ano)}
            onValueChange={(v) => setFiltro((f) => ({ ...f, ano: Number(v) }))}
          >
            <SelectTrigger size="sm" className="w-32" aria-label="Ano">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Todos os anos</SelectItem>
              {anos.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(filtro.deMes)}
            onValueChange={(v) =>
              setFiltro((f) => ({
                ...f,
                deMes: Number(v),
                ateMes: Math.max(Number(v), f.ateMes),
              }))
            }
            disabled={filtro.ano === 0}
          >
            <SelectTrigger size="sm" className="w-28" aria-label="Mês inicial">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES_CURTO.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>
                  de {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(filtro.ateMes)}
            onValueChange={(v) =>
              setFiltro((f) => ({
                ...f,
                ateMes: Number(v),
                deMes: Math.min(Number(v), f.deMes),
              }))
            }
            disabled={filtro.ano === 0}
          >
            <SelectTrigger size="sm" className="w-28" aria-label="Mês final">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES_CURTO.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>
                  até {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex gap-1.5">
            {presets.map((p) => (
              <Button
                key={p.nome}
                size="sm"
                variant={p.ativo ? "default" : "outline"}
                onClick={p.aplicar}
              >
                {p.nome}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alertas de gestão de banca */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((a) => (
            <div
              key={a}
              className="flex items-center gap-2.5 rounded-xl border border-amber-400/50 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-300"
            >
              <AlertTriangle className="size-4 shrink-0" />
              {a}
            </div>
          ))}
        </div>
      )}

      {/* Metas com pace e projeções */}
      {alcanceMeta && metaResolvida && (
        <MetasSection
          titulo={
            alcanceMeta.mes === 0
              ? String(alcanceMeta.ano)
              : `${MESES[alcanceMeta.mes - 1]} de ${alcanceMeta.ano}`
          }
          meta={metaResolvida}
          progresso={{ lucro: calc.lucro, horas: calc.horas, dias: calc.diasJogados }}
          pace={pace}
          projecoes={projecoes}
          onMeta={salvarMeta}
        />
      )}

      {/* Cards principais */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <BigCard
          destaque
          titulo="Banca total atual"
          icone={<PiggyBank className="size-4" />}
          valor={fmtUSD(atual.total)}
          rodape={`Sites ${fmtUSD(atual.somaSites)} · Carteiras ${fmtUSD(atual.somaCarteiras)} · não muda com o filtro`}
        />
        <BigCard
          titulo="Lucro no período"
          icone={
            positivo ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />
          }
          valor={<span className={corLucro(calc.lucro)}>{fmtUSD(calc.lucro)}</span>}
        />
        <BigCard
          titulo="Média mensal"
          icone={<BarChart3 className="size-4" />}
          valor={
            calc.mediaMensal === null ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <span className={corLucro(calc.mediaMensal)}>
                {fmtUSD(calc.mediaMensal)}
              </span>
            )
          }
          rodape={
            calc.nMeses > 0
              ? `em ${calc.nMeses} ${calc.nMeses === 1 ? "mês com jogo" : "meses com jogo"}`
              : undefined
          }
        />
        <BigCard
          titulo="Melhor mês"
          icone={<Trophy className="size-4" />}
          valor={
            calc.melhor ? (
              <span className={corLucro(calc.melhor.valor)}>
                {fmtUSD(calc.melhor.valor)}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
          rodape={calc.melhor?.nome}
        />
        <BigCard
          titulo="Horas jogadas"
          icone={<Clock className="size-4" />}
          valor={fmtHoras(calc.horas)}
          rodape={
            calc.diasJogados > 0
              ? `média de ${fmtHoras(calc.horas / calc.diasJogados)} por dia jogado${calc.estudo > 0 ? ` · ${fmtHoras(calc.estudo)} de estudo` : ""}`
              : undefined
          }
        />
        <BigCard
          titulo="Lucro por hora"
          icone={<Trophy className="size-4" />}
          valor={
            calc.lph === null ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <span className={corLucro(calc.lph)}>{fmtUSD(calc.lph)}</span>
            )
          }
        />
        <BigCard
          titulo="Dias jogados por mês"
          icone={<CalendarCheck className="size-4" />}
          valor={
            calc.diasPorMes === null ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              calc.diasPorMes.toLocaleString("pt-BR", { maximumFractionDigits: 1 })
            )
          }
          rodape={`${calc.diasJogados} ${calc.diasJogados === 1 ? "dia no período" : "dias no período"}`}
        />
        <BigCard
          titulo="Dias jogados por ano"
          icone={<CalendarDays className="size-4" />}
          valor={
            calc.diasPorAnoMedia === null ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              calc.diasPorAnoMedia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })
            )
          }
          rodape={
            calc.diasPorAno.length > 0
              ? calc.diasPorAno.map(([a, n]) => `${a}: ${n}`).join(" · ")
              : undefined
          }
        />
      </div>

      {/* Caixa: dinheiro que entrou e saiu (lançado na página do mês) */}
      {(caixa.saques > 0 || caixa.depositos > 0 || caixa.despesas > 0) && (
        <Card className="py-3">
          <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 text-sm">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Banknote className="size-3.5" />
              Caixa no período
            </span>
            <span>
              Saques{" "}
              <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {fmtUSD(caixa.saques)}
              </span>
            </span>
            <span>
              Depósitos{" "}
              <span className="font-semibold tabular-nums">{fmtUSD(caixa.depositos)}</span>
            </span>
            <span>
              Despesas{" "}
              <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                {fmtUSD(caixa.despesas)}
              </span>
            </span>
            <span className="ml-auto">
              Lucro líquido (após despesas){" "}
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  corLucro(calc.lucro - caixa.despesas)
                )}
              >
                {fmtUSD(calc.lucro - caixa.despesas)}
              </span>
            </span>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de evolução */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução do lucro acumulado</CardTitle>
          <CardDescription>
            Cada ponto é um dia com resultado em {periodoLabel}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calc.serie.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Nenhum resultado registrado neste período.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={calc.serie}
                  margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
                >
                  <defs>
                    <linearGradient id="gradLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={positivo ? "#10b981" : "#ef4444"}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor={positivo ? "#10b981" : "#ef4444"}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    minTickGap={24}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={82}
                    tickFormatter={(v: number) => fmtUSD(v)}
                  />
                  <Tooltip
                    formatter={(v) => [fmtUSD(Number(v)), "Acumulado"]}
                    labelFormatter={(l) => `Dia ${l}`}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--popover-foreground)",
                      fontSize: 12,
                    }}
                  />
                  <ReferenceLine y={0} stroke="var(--border)" />
                  {metaResolvida?.lucroAlvo != null && (
                    <ReferenceLine
                      y={metaResolvida.lucroAlvo}
                      stroke="#f59e0b"
                      strokeDasharray="6 4"
                      label={{
                        value: `Meta ${fmtUSD(metaResolvida.lucroAlvo)}`,
                        position: "insideTopRight",
                        fontSize: 11,
                        fill: "#f59e0b",
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="acumulado"
                    stroke={positivo ? "#10b981" : "#ef4444"}
                    strokeWidth={2.5}
                    fill="url(#gradLucro)"
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Por site */}
      <Card>
        <CardHeader>
          <CardTitle>Resultado por site</CardTitle>
          <CardDescription>
            Lucro e última banca de cada site em {periodoLabel}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calc.porSite.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum site com registros neste período.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {calc.porSite.map((s) => (
                <div
                  key={s.nome}
                  className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-accent/40"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {s.nome}
                      {!s.ativo && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          (inativo)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      banca {s.banca === null ? "—" : fmtUSD(s.banca)}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      corLucro(s.lucro)
                    )}
                  >
                    {s.lucro > 0 ? "+" : ""}
                    {fmtUSD(s.lucro)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
