import { prisma } from "@/lib/prisma";
import { exigirUid } from "@/lib/sessao";
import { BankrollClient } from "@/components/bankroll/bankroll-client";

export const dynamic = "force-dynamic";

export default async function BankrollPage() {
  const uid = await exigirUid();
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;

  const [sites, registros, carteiras, saldos, cotacoesRaw, config] = await Promise.all([
    prisma.site.findMany({
      where: { usuarioId: uid, ativo: true },
      orderBy: { ordem: "asc" },
    }),
    prisma.registroDiario.findMany({
      where: { usuarioId: uid, saldoFinal: { not: null } },
      orderBy: [{ ano: "asc" }, { mes: "asc" }, { dia: "asc" }],
    }),
    prisma.carteira.findMany({
      where: { usuarioId: uid, ativo: true },
      orderBy: { ordem: "asc" },
    }),
    prisma.saldoCarteira.findMany({
      where: { usuarioId: uid },
      orderBy: [{ ano: "asc" }, { mes: "asc" }],
    }),
    prisma.cotacao.findMany({ where: { usuarioId: uid } }),
    prisma.config.findUnique({ where: { usuarioId: uid } }),
  ]);

  // ABI real: média dos buy-ins de torneios dos últimos ~90 dias
  const corte = new Date(hoje.getTime() - 90 * 86400000);
  const torneiosRecentes = (
    await prisma.torneio.findMany({ where: { usuarioId: uid } })
  ).filter((t) => {
    const d = new Date(t.ano, t.mes - 1, t.dia);
    return d >= corte;
  });
  const abiReal =
    torneiosRecentes.length >= 5
      ? {
          valor:
            torneiosRecentes.reduce((s, t) => s + t.buyIn, 0) /
            torneiosRecentes.length,
          n: torneiosRecentes.length,
        }
      : null;
  const cotacoes = Object.fromEntries(cotacoesRaw.map((c) => [c.moeda, c.paraUSD]));

  // banca atual de cada site = último saldo final lançado (valor na moeda do site)
  const porSite = new Map<number, { valor: number; quando: string }>();
  for (const r of registros) {
    if (r.saldoFinal === null) continue;
    porSite.set(r.siteId, {
      valor: r.saldoFinal,
      quando: `${r.dia}/${r.mes}/${r.ano}`,
    });
  }

  // contas digitais: valor do mês atual + último valor conhecido
  const contas = carteiras.map((c) => {
    const meus = saldos.filter((s) => s.carteiraId === c.id);
    const doMes = meus.find((s) => s.ano === ano && s.mes === mes);
    const ultimo = meus[meus.length - 1];
    return {
      id: c.id,
      nome: c.nome,
      valorMes: doMes?.valor ?? null,
      ultimo: ultimo ? { valor: ultimo.valor, quando: `${ultimo.mes}/${ultimo.ano}` } : null,
    };
  });

  return (
    <BankrollClient
      ano={ano}
      mes={mes}
      sitesIniciais={sites.map((s) => ({
        id: s.id,
        nome: s.nome,
        moeda: s.moeda,
        banca: porSite.get(s.id)?.valor ?? null, // na moeda do site
        quando: porSite.get(s.id)?.quando ?? null,
      }))}
      contasIniciais={contas}
      cotacoes={cotacoes}
      gestaoInicial={{
        abi: config?.abi ?? null,
        buyinsMin: config?.buyinsMin ?? 200,
        buyinsTeto: config?.buyinsTeto ?? 250,
      }}
      abiReal={abiReal}
      carreiraInicial={{
        custoVida: config?.custoVida ?? null,
        reservaImpostoPct: config?.reservaImpostoPct ?? null,
      }}
      saquesAno={
        (
          await prisma.movimentacao.findMany({
            where: { usuarioId: uid, ano, tipo: "saque" },
          })
        ).reduce((s, m) => s + m.valor, 0)
      }
    />
  );
}
