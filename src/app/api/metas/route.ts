import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";

// Upsert de meta (mes 0 = anual). Campos null limpam; todos null apagam a meta.
export async function PUT(req: Request) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const body = await req.json();
  const { ano, mes } = body;
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 0 || mes > 12) {
    return NextResponse.json({ error: "ano e mes (0-12) são obrigatórios" }, { status: 400 });
  }

  const campos: { lucroAlvo?: number | null; horasAlvo?: number | null; diasAlvo?: number | null } = {};
  for (const c of ["lucroAlvo", "horasAlvo", "diasAlvo"] as const) {
    if (c in body) campos[c] = body[c];
  }

  const existente = await prisma.meta.findUnique({
    where: { usuarioId_ano_mes: { usuarioId: uid, ano, mes } },
  });
  const final = { ...existente, ...campos };
  if (final.lucroAlvo == null && final.horasAlvo == null && final.diasAlvo == null) {
    if (existente) await prisma.meta.delete({ where: { id: existente.id } });
    return NextResponse.json({ ok: true, removida: true });
  }

  const meta = await prisma.meta.upsert({
    where: { usuarioId_ano_mes: { usuarioId: uid, ano, mes } },
    create: {
      usuarioId: uid,
      ano, mes,
      lucroAlvo: campos.lucroAlvo ?? null,
      horasAlvo: campos.horasAlvo ?? null,
      diasAlvo: campos.diasAlvo ?? null,
    },
    update: campos,
  });
  return NextResponse.json(meta);
}
