import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";
import { HORA_RE, recalcularHorasDoDia } from "@/lib/sessoes";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await ctx.params;
  const sessao = await prisma.sessao.findFirst({
    where: { id: Number(id), usuarioId: uid },
  });
  if (!sessao) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  const body = await req.json();
  const data: { inicio?: string; fim?: string | null } = {};
  if ("inicio" in body) {
    if (typeof body.inicio !== "string" || !HORA_RE.test(body.inicio)) {
      return NextResponse.json({ error: "inicio deve ser HH:MM" }, { status: 400 });
    }
    data.inicio = body.inicio;
  }
  if ("fim" in body) {
    if (body.fim !== null && !(typeof body.fim === "string" && HORA_RE.test(body.fim))) {
      return NextResponse.json({ error: "fim deve ser HH:MM" }, { status: 400 });
    }
    data.fim = body.fim;
  }
  const atualizada = await prisma.sessao.update({ where: { id: sessao.id }, data });
  await recalcularHorasDoDia(uid, atualizada.ano, atualizada.mes, atualizada.dia);
  return NextResponse.json(atualizada);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await ctx.params;
  const sessao = await prisma.sessao.findFirst({
    where: { id: Number(id), usuarioId: uid },
  });
  if (!sessao) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  await prisma.sessao.delete({ where: { id: sessao.id } });
  await recalcularHorasDoDia(uid, sessao.ano, sessao.mes, sessao.dia);
  return NextResponse.json({ ok: true });
}
