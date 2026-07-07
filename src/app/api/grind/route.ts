import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";
import { diasNoMes, paraUSD } from "@/lib/calc";

// Dados do dia para a tela "Iniciar grind": sites ativos (com última banca),
// registros do dia, infos do dia, sessões do dia e progresso da meta do mês.
export async function GET(req: Request) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const url = new URL(req.url);
  const ano = Number(url.searchParams.get("ano"));
  const mes = Number(url.searchParams.get("mes"));
  const dia = Number(url.searchParams.get("dia"));
  if (![ano, mes, dia].every(Number.isInteger)) {
    return NextResponse.json({ error: "ano, mes e dia são obrigatórios" }, { status: 400 });
  }

  const sites = await prisma.site.findMany({
    where: { usuarioId: uid, ativo: true },
    orderBy: { ordem: "asc" },
  });
  const siteIds = sites.map((s) => s.id);

  const [registrosDia, diaMes, historico, sessoes, diasDoMes, meta, config, carteiras, saldosCarteiras, cotacoesRaw] =
    await Promise.all([
      prisma.registroDiario.findMany({ where: { ano, mes, dia, siteId: { in: siteIds } } }),
      prisma.diaMes.findUnique({
        where: { usuarioId_ano_mes_dia: { usuarioId: uid, ano, mes, dia } },
      }),
      prisma.registroDiario.findMany({
        where: { siteId: { in: siteIds }, saldoFinal: { not: null } },
        orderBy: [{ ano: "asc" }, { mes: "asc" }, { dia: "asc" }],
      }),
      prisma.sessao.findMany({
        where: { usuarioId: uid, ano, mes, dia },
        orderBy: { id: "asc" },
      }),
      prisma.diaMes.findMany({ where: { usuarioId: uid, ano, mes } }),
      prisma.meta.findUnique({
        where: { usuarioId_ano_mes: { usuarioId: uid, ano, mes } },
      }),
      prisma.config.findUnique({ where: { usuarioId: uid } }),
      prisma.carteira.findMany({ where: { usuarioId: uid, ativo: true } }),
      prisma.saldoCarteira.findMany({
        where: { usuarioId: uid },
        orderBy: [{ ano: "asc" }, { mes: "asc" }],
      }),
      prisma.cotacao.findMany({ where: { usuarioId: uid } }),
    ]);
  const cotacoes = Object.fromEntries(cotacoesRaw.map((c) => [c.moeda, c.paraUSD]));

  // última banca (saldo final) de cada site ANTES do dia consultado
  const antes = (r: { ano: number; mes: number; dia: number }) =>
    r.ano < ano ||
    (r.ano === ano && (r.mes < mes || (r.mes === mes && r.dia < dia)));
  const bancaAnterior = new Map<number, number>();
  for (const r of historico) {
    if (antes(r) && r.saldoFinal !== null) bancaAnterior.set(r.siteId, r.saldoFinal);
  }

  // progresso do mês
  let horasMes = 0;
  let diasJogadosMes = 0;
  for (const d of diasDoMes) {
    horasMes += d.horas ?? 0;
    if (d.jogou || (d.horas ?? 0) > 0) diasJogadosMes++;
  }

  // banca total ATUAL (sites + contas digitais) para o card de buy-ins
  const ultimoSaldoSite = new Map<number, number>();
  for (const r of historico) {
    const site = sites.find((s) => s.id === r.siteId);
    if (site && r.saldoFinal !== null) {
      ultimoSaldoSite.set(r.siteId, paraUSD(r.saldoFinal, site.moeda, cotacoes));
    }
  }
  const ultimoSaldoCarteira = new Map<number, number>();
  for (const s of saldosCarteiras) {
    if (carteiras.some((c) => c.id === s.carteiraId)) {
      ultimoSaldoCarteira.set(s.carteiraId, s.valor);
    }
  }
  const bancaTotal =
    [...ultimoSaldoSite.values()].reduce((a, b) => a + b, 0) +
    [...ultimoSaldoCarteira.values()].reduce((a, b) => a + b, 0);

  return NextResponse.json({
    sites: sites.map((s) => ({
      id: s.id,
      nome: s.nome,
      moeda: s.moeda,
      bancaAnterior: bancaAnterior.get(s.id) ?? null,
    })),
    registros: Object.fromEntries(
      registrosDia.map((r) => [
        r.siteId,
        { bancaInicial: r.bancaInicial, saldoFinal: r.saldoFinal },
      ])
    ),
    dia: diaMes
      ? {
          jogou: diaMes.jogou,
          horas: diaMes.horas,
          nota: diaMes.nota,
          estado: diaMes.estado,
          tipoJogo: diaMes.tipoJogo,
          horasEstudo: diaMes.horasEstudo,
          checklist: diaMes.checklist ? (JSON.parse(diaMes.checklist) as string[]) : [],
        }
      : null,
    sessoes: sessoes.map((s) => ({ id: s.id, inicio: s.inicio, fim: s.fim })),
    metaMes: meta
      ? { lucroAlvo: meta.lucroAlvo, horasAlvo: meta.horasAlvo, diasAlvo: meta.diasAlvo }
      : null,
    progressoMes: { horasMes, diasJogadosMes, diasNoMes: diasNoMes(ano, mes) },
    buyins:
      config?.abi && config.abi > 0
        ? {
            abi: config.abi,
            total: bancaTotal,
            min: config.buyinsMin ?? 200,
            teto: config.buyinsTeto ?? 250,
          }
        : null,
  });
}
