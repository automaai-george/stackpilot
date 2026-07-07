import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";

// Upsert do saldo de uma carteira no mês; valor null remove o saldo
export async function PUT(req: Request) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const body = await req.json();
  const { carteiraId, ano, mes, valor } = body;
  if (![carteiraId, ano, mes].every((v) => Number.isInteger(v))) {
    return NextResponse.json({ error: "carteiraId, ano e mes são obrigatórios" }, { status: 400 });
  }

  const carteira = await prisma.carteira.findFirst({
    where: { id: carteiraId, usuarioId: uid },
  });
  if (!carteira) return NextResponse.json({ error: "Carteira não encontrada" }, { status: 404 });

  if (valor === null) {
    await prisma.saldoCarteira.deleteMany({ where: { carteiraId, ano, mes } });
    return NextResponse.json({ ok: true });
  }
  const saldo = await prisma.saldoCarteira.upsert({
    where: { carteiraId_ano_mes: { carteiraId, ano, mes } },
    create: { usuarioId: uid, carteiraId, ano, mes, valor },
    update: { valor },
  });
  return NextResponse.json(saldo);
}
