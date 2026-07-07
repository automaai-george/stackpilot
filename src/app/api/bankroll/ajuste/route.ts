import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";

/**
 * Ajuste de caixa de um site (saque, depósito, transferência).
 *
 * O ajuste NUNCA mexe no dia atual nem em dias passados — o valor entra
 * como registro neutro (banca inicial = saldo final) no DIA SEGUINTE,
 * virando a banca inicial do próximo grind sem alterar nenhum lucro.
 * O cliente envia a data-alvo (amanhã, no fuso do usuário).
 */
export async function POST(req: Request) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { siteId, ano, mes, dia, valor } = await req.json();
  if (![siteId, ano, mes, dia].every(Number.isInteger)) {
    return NextResponse.json(
      { error: "siteId, ano, mes e dia são obrigatórios" },
      { status: 400 }
    );
  }
  if (typeof valor !== "number" || !isFinite(valor) || valor < 0) {
    return NextResponse.json({ error: "valor inválido" }, { status: 400 });
  }

  // o site precisa ser do usuário
  const site = await prisma.site.findFirst({ where: { id: siteId, usuarioId: uid } });
  if (!site) return NextResponse.json({ error: "Site não encontrado" }, { status: 404 });

  const existente = await prisma.registroDiario.findUnique({
    where: { siteId_ano_mes_dia: { siteId, ano, mes, dia } },
  });

  const registro = existente
    ? await prisma.registroDiario.update({
        where: { id: existente.id },
        data: {
          bancaInicial: valor,
          // só mantém neutro se o dia-alvo ainda não tem fechamento próprio
          ...(existente.saldoFinal === null ||
          existente.saldoFinal === existente.bancaInicial
            ? { saldoFinal: valor }
            : {}),
        },
      })
    : await prisma.registroDiario.create({
        data: {
          usuarioId: uid,
          siteId, ano, mes, dia,
          bancaInicial: valor,
          saldoFinal: valor,
        },
      });

  return NextResponse.json(registro);
}
