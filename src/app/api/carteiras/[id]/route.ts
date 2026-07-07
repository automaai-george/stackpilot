import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();
  const data: { nome?: string; ativo?: boolean; ordem?: number } = {};
  if (typeof body.nome === "string" && body.nome.trim()) data.nome = body.nome.trim();
  if (typeof body.ativo === "boolean") data.ativo = body.ativo;
  if (typeof body.ordem === "number") data.ordem = body.ordem;
  const r = await prisma.carteira.updateMany({
    where: { id: Number(id), usuarioId: uid },
    data,
  });
  if (r.count === 0) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await ctx.params;
  await prisma.carteira.deleteMany({ where: { id: Number(id), usuarioId: uid } });
  return NextResponse.json({ ok: true });
}
