import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";

// Define a cotação de uma moeda em USD (1 moeda = paraUSD dólares)
export async function PUT(req: Request) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { moeda, paraUSD } = await req.json();
  if (typeof moeda !== "string" || !/^[A-Z]{3}$/.test(moeda) || moeda === "USD") {
    return NextResponse.json({ error: "moeda inválida" }, { status: 400 });
  }
  if (typeof paraUSD !== "number" || !(paraUSD > 0)) {
    return NextResponse.json({ error: "paraUSD deve ser positivo" }, { status: 400 });
  }
  const cot = await prisma.cotacao.upsert({
    where: { usuarioId_moeda: { usuarioId: uid, moeda } },
    create: { usuarioId: uid, moeda, paraUSD },
    update: { paraUSD },
  });
  return NextResponse.json(cot);
}
