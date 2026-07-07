import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";

export async function GET() {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const [config, cotacoes] = await Promise.all([
    prisma.config.findUnique({ where: { usuarioId: uid } }),
    prisma.cotacao.findMany({ where: { usuarioId: uid } }),
  ]);
  return NextResponse.json({ config, cotacoes });
}

export async function PUT(req: Request) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const body = await req.json();
  const data: {
    concentracaoMaxPct?: number | null;
    saldoMinimo?: number | null;
    abi?: number | null;
    buyinsMin?: number | null;
    buyinsTeto?: number | null;
    custoVida?: number | null;
    reservaImpostoPct?: number | null;
  } = {};
  for (const c of ["concentracaoMaxPct", "saldoMinimo", "abi", "custoVida", "reservaImpostoPct"] as const) {
    if (c in body) data[c] = body[c];
  }
  for (const c of ["buyinsMin", "buyinsTeto"] as const) {
    if (c in body) data[c] = body[c] === null ? null : Math.round(body[c]);
  }
  const config = await prisma.config.upsert({
    where: { usuarioId: uid },
    create: { usuarioId: uid, ...data },
    update: data,
  });
  return NextResponse.json(config);
}
