import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";

export async function GET() {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const sites = await prisma.site.findMany({
    where: { usuarioId: uid },
    orderBy: { ordem: "asc" },
  });
  return NextResponse.json(sites);
}

export async function POST(req: Request) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { nome } = await req.json();
  if (!nome || typeof nome !== "string" || !nome.trim()) {
    return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  }
  const max = await prisma.site.aggregate({
    where: { usuarioId: uid },
    _max: { ordem: true },
  });
  const site = await prisma.site.create({
    data: { usuarioId: uid, nome: nome.trim(), ordem: (max._max.ordem ?? -1) + 1 },
  });
  return NextResponse.json(site, { status: 201 });
}
