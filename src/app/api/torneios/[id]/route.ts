import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  await prisma.torneio.deleteMany({ where: { id: n, usuarioId: uid } });
  return NextResponse.json({ ok: true });
}
