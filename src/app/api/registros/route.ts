import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";

// Upsert de um registro diário (site + dia). Campos ausentes não são alterados.
export async function PUT(req: Request) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const body = await req.json();
  const { ano, mes, dia, siteId } = body;
  if (![ano, mes, dia, siteId].every((v) => Number.isInteger(v))) {
    return NextResponse.json({ error: "ano, mes, dia e siteId são obrigatórios" }, { status: 400 });
  }

  // o site precisa ser do usuário
  const site = await prisma.site.findFirst({ where: { id: siteId, usuarioId: uid } });
  if (!site) return NextResponse.json({ error: "Site não encontrado" }, { status: 404 });

  const patch: { bancaInicial?: number | null; saldoFinal?: number | null } = {};
  if ("bancaInicial" in body) patch.bancaInicial = body.bancaInicial;
  if ("saldoFinal" in body) patch.saldoFinal = body.saldoFinal;

  const registro = await prisma.registroDiario.upsert({
    where: { siteId_ano_mes_dia: { siteId, ano, mes, dia } },
    create: {
      usuarioId: uid,
      siteId, ano, mes, dia,
      bancaInicial: patch.bancaInicial ?? null,
      saldoFinal: patch.saldoFinal ?? null,
    },
    update: patch,
  });
  return NextResponse.json(registro);
}
