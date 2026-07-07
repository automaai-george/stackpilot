import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";
import { HORA_RE, recalcularHorasDoDia } from "@/lib/sessoes";

// Cria uma sessão (fim null = cronômetro rodando)
export async function POST(req: Request) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { ano, mes, dia, inicio, fim } = await req.json();
  if (![ano, mes, dia].every(Number.isInteger)) {
    return NextResponse.json({ error: "ano, mes e dia são obrigatórios" }, { status: 400 });
  }
  if (typeof inicio !== "string" || !HORA_RE.test(inicio)) {
    return NextResponse.json({ error: "inicio deve ser HH:MM" }, { status: 400 });
  }
  if (fim !== undefined && fim !== null && !(typeof fim === "string" && HORA_RE.test(fim))) {
    return NextResponse.json({ error: "fim deve ser HH:MM" }, { status: 400 });
  }

  const sessao = await prisma.sessao.create({
    data: { usuarioId: uid, ano, mes, dia, inicio, fim: fim ?? null },
  });
  await prisma.diaMes.upsert({
    where: { usuarioId_ano_mes_dia: { usuarioId: uid, ano, mes, dia } },
    create: { usuarioId: uid, ano, mes, dia, jogou: true },
    update: { jogou: true },
  });
  await recalcularHorasDoDia(uid, ano, mes, dia);
  return NextResponse.json(sessao, { status: 201 });
}
