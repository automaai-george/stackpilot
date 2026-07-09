import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";
import { EH_DONO } from "@/lib/admin";

// Lista de usuários (só o dono acessa). Sem dados financeiros — só contas.
export async function GET() {
  const uid = await uidAtual();
  if (!EH_DONO(uid)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const usuarios = await prisma.usuario.findMany({
    orderBy: { criadoEm: "asc" },
    select: {
      id: true,
      email: true,
      nome: true,
      criadoEm: true,
      _count: { select: { sites: true, registros: true } },
    },
  });
  return NextResponse.json(usuarios);
}
