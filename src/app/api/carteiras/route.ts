import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";

export async function GET() {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const carteiras = await prisma.carteira.findMany({
    where: { usuarioId: uid },
    orderBy: { ordem: "asc" },
  });
  return NextResponse.json(carteiras);
}

export async function POST(req: Request) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { nome } = await req.json();
  if (!nome || typeof nome !== "string" || !nome.trim()) {
    return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  }
  const max = await prisma.carteira.aggregate({
    where: { usuarioId: uid },
    _max: { ordem: true },
  });
  const carteira = await prisma.carteira.create({
    data: { usuarioId: uid, nome: nome.trim(), ordem: (max._max.ordem ?? -1) + 1 },
  });
  return NextResponse.json(carteira, { status: 201 });
}
