import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";

export async function POST(req: Request) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { ids } = (await req.json()) as { ids: number[] };
  if (!Array.isArray(ids)) {
    return NextResponse.json({ error: "ids inválido" }, { status: 400 });
  }
  await prisma.$transaction(
    ids.map((id, i) =>
      prisma.site.updateMany({ where: { id, usuarioId: uid }, data: { ordem: i } })
    )
  );
  return NextResponse.json({ ok: true });
}
