import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";

// Anos que possuem dados do usuário, mais o ano atual
export async function GET() {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const [regs, dias] = await Promise.all([
    prisma.registroDiario.findMany({
      where: { usuarioId: uid },
      select: { ano: true },
      distinct: ["ano"],
    }),
    prisma.diaMes.findMany({
      where: { usuarioId: uid },
      select: { ano: true },
      distinct: ["ano"],
    }),
  ]);
  const anos = new Set<number>([
    ...regs.map((r) => r.ano),
    ...dias.map((d) => d.ano),
    new Date().getFullYear(),
  ]);
  return NextResponse.json([...anos].sort((a, b) => b - a));
}
