import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { exigirUid } from "@/lib/sessao";
import {
  MESES,
  lucroPorHora,
  paraUSD,
  resultado,
  type CotacaoMap,
} from "@/lib/calc";
import { fmtUSD, fmtHoras } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/relatorio/print-button";

export const dynamic = "force-dynamic";

function corLucro(v: number) {
  if (v > 0) return "text-emerald-600 dark:text-emerald-400";
  if (v < 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

async function resumoDoMes(uid: number, ano: number, mes: number, cot: CotacaoMap) {
  const [sites, registros, dias] = await Promise.all([
    prisma.site.findMany({ where: { usuarioId: uid } }),
    prisma.registroDiario.findMany({
      where: { usuarioId: uid, ano, mes },
      orderBy: { dia: "asc" },
    }),
    prisma.diaMes.findMany({ where: { usuarioId: uid, ano, mes } }),
  ]);
  const moedaDe = new Map(sites.map((s) => [s.id, s.moeda]));
  let lucro = 0;
  const porDia = new Map<number, number>();
  for (const r of registros) {
    const v = paraUSD(resultado(r), moedaDe.get(r.siteId), cot);
    lucro += v;
    porDia.set(r.dia, (porDia.get(r.dia) ?? 0) + v);
  }
  let horas = 0;
  let diasJogados = 0;
  for (const d of dias) {
    horas += d.horas ?? 0;
    if (d.jogou || (d.horas ?? 0) > 0) diasJogados++;
  }
  return { lucro, horas, diasJogados, porDia, registros, moedaDe };
}

export default async function RelatorioPage({
  params,
}: {
  params: Promise<{ ano: string; mes: string }>;
}) {
  const p = await params;
  const ano = Number(p.ano);
  const mes = Number(p.mes);
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12) notFound();

  const uid = await exigirUid();
  const cotacoes = Object.fromEntries(
    (await prisma.cotacao.findMany({ where: { usuarioId: uid } })).map((c) => [
      c.moeda,
      c.paraUSD,
    ])
  );

  const anterior = mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 };
  const [atual, mesAnterior, anoPassado, sites, movs] = await Promise.all([
    resumoDoMes(uid, ano, mes, cotacoes),
    resumoDoMes(uid, anterior.ano, anterior.mes, cotacoes),
    resumoDoMes(uid, ano - 1, mes, cotacoes),
    prisma.site.findMany({ where: { usuarioId: uid }, orderBy: { ordem: "asc" } }),
    prisma.movimentacao.findMany({
      where: { usuarioId: uid, ano, mes },
      orderBy: { dia: "asc" },
    }),
  ]);

  // melhor e pior dia
  let melhorDia: [number, number] | null = null;
  let piorDia: [number, number] | null = null;
  for (const [dia, v] of atual.porDia) {
    if (v === 0) continue;
    if (!melhorDia || v > melhorDia[1]) melhorDia = [dia, v];
    if (!piorDia || v < piorDia[1]) piorDia = [dia, v];
  }

  // por site no mês
  const porSite = sites
    .map((s) => {
      const meus = atual.registros.filter((r) => r.siteId === s.id);
      if (meus.length === 0) return null;
      let lucro = 0;
      let banca: number | null = null;
      for (const r of meus) {
        lucro += paraUSD(resultado(r), s.moeda, cotacoes);
        if (r.saldoFinal !== null) banca = paraUSD(r.saldoFinal, s.moeda, cotacoes);
      }
      return { nome: s.nome, lucro, banca };
    })
    .filter(Boolean) as { nome: string; lucro: number; banca: number | null }[];
  porSite.sort((a, b) => b.lucro - a.lucro);

  const soma = (tipo: string) =>
    movs.filter((m) => m.tipo === tipo).reduce((s, m) => s + m.valor, 0);
  const caixa = { saques: soma("saque"), depositos: soma("deposito"), despesas: soma("despesa") };

  const lph = lucroPorHora(atual.lucro, atual.horas);
  const proximo = mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };

  const Comparacao = ({ rotulo, base }: { rotulo: string; base: { lucro: number; horas: number } }) => {
    const delta = atual.lucro - base.lucro;
    return (
      <div className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
        <span className="text-muted-foreground">{rotulo}</span>
        <span className="text-right">
          <span className={cn("font-semibold tabular-nums", corLucro(base.lucro))}>
            {fmtUSD(base.lucro)}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">
            ({delta >= 0 ? "+" : ""}
            {fmtUSD(delta)} este mês · {fmtHoras(base.horas)})
          </span>
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild aria-label="Relatório anterior">
            <Link href={`/relatorio/${anterior.ano}/${anterior.mes}`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="min-w-56 text-center text-2xl font-semibold tracking-tight">
            Relatório · {MESES[mes - 1]} {ano}
          </h1>
          <Button variant="outline" size="icon" asChild aria-label="Próximo relatório">
            <Link href={`/relatorio/${proximo.ano}/${proximo.mes}`}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
        <PrintButton />
      </div>
      {/* título só para impressão */}
      <h1 className="hidden text-2xl font-semibold tracking-tight print:block">
        Poker Bankroll — Relatório de {MESES[mes - 1]} {ano}
      </h1>

      {/* números do mês */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { t: "Lucro do mês", v: <span className={corLucro(atual.lucro)}>{fmtUSD(atual.lucro)}</span> },
          { t: "Horas jogadas", v: fmtHoras(atual.horas) },
          { t: "Dias jogados", v: String(atual.diasJogados) },
          { t: "Lucro por hora", v: lph === null ? "—" : <span className={corLucro(lph)}>{fmtUSD(lph)}</span> },
        ].map((c) => (
          <Card key={c.t} className="gap-1.5 py-4">
            <CardHeader className="px-4 py-0">
              <CardDescription className="text-xs">{c.t}</CardDescription>
            </CardHeader>
            <CardContent className="px-4 py-0 text-2xl font-semibold tabular-nums">
              {c.v}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* comparações e destaques */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comparações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Comparacao
              rotulo={`${MESES[anterior.mes - 1]} ${anterior.ano} (mês anterior)`}
              base={mesAnterior}
            />
            <Comparacao rotulo={`${MESES[mes - 1]} ${ano - 1} (ano passado)`} base={anoPassado} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Destaques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <span className="text-muted-foreground">Melhor dia</span>
              {melhorDia ? (
                <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  dia {melhorDia[0]} · {fmtUSD(melhorDia[1])}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <span className="text-muted-foreground">Pior dia</span>
              {piorDia ? (
                <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                  dia {piorDia[0]} · {fmtUSD(piorDia[1])}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <span className="text-muted-foreground">Média por dia jogado</span>
              <span className={cn("font-semibold tabular-nums", corLucro(atual.lucro))}>
                {atual.diasJogados > 0 ? fmtUSD(atual.lucro / atual.diasJogados) : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* por site */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por site</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {porSite.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem registros neste mês.</p>
          ) : (
            <table className="w-full min-w-max border-collapse text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 text-left font-medium">Site</th>
                  <th className="px-3 py-2 text-right font-medium">Lucro no mês</th>
                  <th className="py-2 pl-3 text-right font-medium">Banca (fim do mês)</th>
                </tr>
              </thead>
              <tbody>
                {porSite.map((s) => (
                  <tr key={s.nome} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{s.nome}</td>
                    <td className={cn("px-3 py-2 text-right font-semibold tabular-nums", corLucro(s.lucro))}>
                      {fmtUSD(s.lucro)}
                    </td>
                    <td className="py-2 pl-3 text-right tabular-nums text-muted-foreground">
                      {s.banca === null ? "—" : fmtUSD(s.banca)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* caixa do mês */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Caixa do mês</CardTitle>
          <CardDescription>Saques, depósitos e despesas lançados na página do mês.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { t: "Saques", v: caixa.saques, cor: "text-emerald-600 dark:text-emerald-400" },
              { t: "Depósitos", v: caixa.depositos, cor: "" },
              { t: "Despesas", v: caixa.despesas, cor: "text-red-600 dark:text-red-400" },
              {
                t: "Lucro líquido",
                v: atual.lucro - caixa.despesas,
                cor: corLucro(atual.lucro - caixa.despesas),
              },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border px-4 py-3">
                <div className="text-xs text-muted-foreground">{c.t}</div>
                <div className={cn("text-lg font-semibold tabular-nums", c.cor)}>
                  {fmtUSD(c.v)}
                </div>
              </div>
            ))}
          </div>
          {movs.length > 0 && (
            <table className="w-full min-w-max border-collapse text-sm">
              <tbody>
                {movs.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-3 text-muted-foreground">dia {m.dia}</td>
                    <td className="px-3 py-1.5 capitalize">{m.tipo}</td>
                    <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                      {fmtUSD(m.valor)}
                    </td>
                    <td className="py-1.5 pl-3 text-muted-foreground">{m.descricao ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
