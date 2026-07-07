import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";

type Tx = Prisma.TransactionClient;
type Lado = { tipo: "site" | "carteira" | "externo"; id?: number };

/**
 * Aplica um delta (±valor) no caixa de um site SEM criar lucro/prejuízo:
 *  - dia sem registro       -> cria registro neutro com (última banca + delta)
 *  - dia aberto (sem saldo) -> soma o delta na banca inicial (base honesta)
 *  - dia neutro             -> soma o delta na banca e no saldo
 *  - dia já fechado         -> aplica no dia SEGUINTE (lucro de hoje intocado)
 */
async function aplicarDeltaSite(
  tx: Tx,
  uid: number,
  siteId: number,
  delta: number,
  hoje: { ano: number; mes: number; dia: number }
) {
  const ultimaBancaAntes = async (limite: { ano: number; mes: number; dia: number }) => {
    const regs = await tx.registroDiario.findMany({
      where: { usuarioId: uid, siteId, saldoFinal: { not: null } },
      orderBy: [{ ano: "asc" }, { mes: "asc" }, { dia: "asc" }],
    });
    let ultimo: number | null = null;
    for (const r of regs) {
      const antes =
        r.ano < limite.ano ||
        (r.ano === limite.ano &&
          (r.mes < limite.mes || (r.mes === limite.mes && r.dia < limite.dia)));
      if (antes && r.saldoFinal !== null) ultimo = r.saldoFinal;
    }
    return ultimo;
  };

  const reg = await tx.registroDiario.findUnique({
    where: { siteId_ano_mes_dia: { siteId, ...hoje } },
  });

  const criarNeutro = async (data: typeof hoje, base: number) => {
    const novo = base + delta;
    if (novo < 0) throw new Error("Saldo insuficiente no site");
    await tx.registroDiario.create({
      data: { usuarioId: uid, siteId, ...data, bancaInicial: novo, saldoFinal: novo },
    });
    return novo;
  };

  if (!reg) {
    const base = (await ultimaBancaAntes(hoje)) ?? 0;
    return criarNeutro(hoje, base);
  }

  const neutro =
    reg.bancaInicial !== null && reg.saldoFinal !== null && reg.bancaInicial === reg.saldoFinal;
  const fechado =
    reg.saldoFinal !== null && reg.bancaInicial !== null && !neutro;

  if (fechado) {
    // dia já tem resultado real: o dinheiro novo/retirado vale a partir de amanhã
    const d = new Date(hoje.ano, hoje.mes - 1, hoje.dia + 1);
    const amanha = { ano: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate() };
    const regAmanha = await tx.registroDiario.findUnique({
      where: { siteId_ano_mes_dia: { siteId, ...amanha } },
    });
    if (!regAmanha) return criarNeutro(amanha, reg.saldoFinal!);

    const neutroAmanha =
      regAmanha.bancaInicial !== null &&
      regAmanha.saldoFinal !== null &&
      regAmanha.bancaInicial === regAmanha.saldoFinal;
    const novaBanca = (regAmanha.bancaInicial ?? reg.saldoFinal!) + delta;
    if (novaBanca < 0) throw new Error("Saldo insuficiente no site");
    await tx.registroDiario.update({
      where: { id: regAmanha.id },
      data: {
        bancaInicial: novaBanca,
        ...(neutroAmanha || regAmanha.saldoFinal === null
          ? neutroAmanha
            ? { saldoFinal: novaBanca }
            : {}
          : {}),
      },
    });
    return novaBanca;
  }

  // dia aberto ou neutro: ajusta a base
  const baseAtual = reg.bancaInicial ?? (await ultimaBancaAntes(hoje)) ?? 0;
  const novaBanca = baseAtual + delta;
  if (novaBanca < 0) throw new Error("Saldo insuficiente no site");
  await tx.registroDiario.update({
    where: { id: reg.id },
    data: {
      bancaInicial: novaBanca,
      ...(neutro ? { saldoFinal: novaBanca } : {}),
    },
  });
  return novaBanca;
}

/** Aplica um delta no saldo da carteira no mês atual (base = último saldo conhecido) */
async function aplicarDeltaCarteira(
  tx: Tx,
  uid: number,
  carteiraId: number,
  delta: number,
  hoje: { ano: number; mes: number }
) {
  const saldos = await tx.saldoCarteira.findMany({
    where: { usuarioId: uid, carteiraId },
    orderBy: [{ ano: "asc" }, { mes: "asc" }],
  });
  const doMes = saldos.find((s) => s.ano === hoje.ano && s.mes === hoje.mes);
  const base = doMes?.valor ?? saldos[saldos.length - 1]?.valor ?? 0;
  const novo = base + delta;
  if (novo < 0) throw new Error("Saldo insuficiente na carteira");
  await tx.saldoCarteira.upsert({
    where: {
      carteiraId_ano_mes: { carteiraId, ano: hoje.ano, mes: hoje.mes },
    },
    create: { usuarioId: uid, carteiraId, ano: hoje.ano, mes: hoje.mes, valor: novo },
    update: { valor: novo },
  });
  return novo;
}

export async function POST(req: Request) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { de, para, valor, descricao, ano, mes, dia } = body as {
    de: Lado; para: Lado; valor: number; descricao?: string;
    ano: number; mes: number; dia: number;
  };

  if (![ano, mes, dia].every(Number.isInteger)) {
    return NextResponse.json({ error: "data inválida" }, { status: 400 });
  }
  if (typeof valor !== "number" || !(valor > 0)) {
    return NextResponse.json({ error: "valor deve ser positivo" }, { status: 400 });
  }
  const tipos = ["site", "carteira", "externo"];
  if (!de || !para || !tipos.includes(de.tipo) || !tipos.includes(para.tipo)) {
    return NextResponse.json({ error: "origem/destino inválidos" }, { status: 400 });
  }
  if (de.tipo === "externo" && para.tipo === "externo") {
    return NextResponse.json({ error: "escolha ao menos uma conta sua" }, { status: 400 });
  }
  if (de.tipo === para.tipo && de.id === para.id) {
    return NextResponse.json({ error: "origem e destino iguais" }, { status: 400 });
  }

  // valida posse e captura nomes
  const nomeDe = de.tipo === "externo" ? "Fora do poker" : "";
  const nomePara = para.tipo === "externo" ? "Fora do poker" : "";
  let nomes = { de: nomeDe, para: nomePara };
  for (const [lado, chave] of [[de, "de"], [para, "para"]] as const) {
    if (lado.tipo === "site") {
      const s = await prisma.site.findFirst({ where: { id: lado.id, usuarioId: uid } });
      if (!s) return NextResponse.json({ error: "Site não encontrado" }, { status: 404 });
      nomes = { ...nomes, [chave]: s.nome };
    }
    if (lado.tipo === "carteira") {
      const c = await prisma.carteira.findFirst({ where: { id: lado.id, usuarioId: uid } });
      if (!c) return NextResponse.json({ error: "Carteira não encontrada" }, { status: 404 });
      nomes = { ...nomes, [chave]: c.nome };
    }
  }

  const hoje = { ano, mes, dia };
  const tipoMov =
    de.tipo === "externo" ? "deposito" : para.tipo === "externo" ? "saque" : "transferencia";

  try {
    await prisma.$transaction(async (tx) => {
      if (de.tipo === "site") await aplicarDeltaSite(tx, uid, de.id!, -valor, hoje);
      if (de.tipo === "carteira") await aplicarDeltaCarteira(tx, uid, de.id!, -valor, hoje);
      if (para.tipo === "site") await aplicarDeltaSite(tx, uid, para.id!, valor, hoje);
      if (para.tipo === "carteira") await aplicarDeltaCarteira(tx, uid, para.id!, valor, hoje);

      await tx.movimentacao.create({
        data: {
          usuarioId: uid,
          ano, mes, dia,
          tipo: tipoMov,
          valor,
          descricao: `${nomes.de} → ${nomes.para}${
            typeof descricao === "string" && descricao.trim() ? ` · ${descricao.trim()}` : ""
          }`,
        },
      });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível transferir";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true, tipo: tipoMov, de: nomes.de, para: nomes.para, valor });
}
