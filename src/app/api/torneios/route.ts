import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";

export async function POST(req: Request) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const body = await req.json();
  const { ano, mes, dia, siteId, nome, buyIn, premio, posicao, field } = body;
  if (![ano, mes, dia].every(Number.isInteger)) {
    return NextResponse.json({ error: "data inválida" }, { status: 400 });
  }
  if (typeof buyIn !== "number" || !(buyIn > 0)) {
    return NextResponse.json({ error: "buy-in deve ser positivo" }, { status: 400 });
  }
  // site (opcional) precisa ser do usuário
  let siteOk: number | null = null;
  if (Number.isInteger(siteId)) {
    const site = await prisma.site.findFirst({ where: { id: siteId, usuarioId: uid } });
    if (site) siteOk = site.id;
  }
  const torneio = await prisma.torneio.create({
    data: {
      usuarioId: uid,
      ano, mes, dia,
      siteId: siteOk,
      nome: typeof nome === "string" && nome.trim() ? nome.trim() : null,
      buyIn,
      premio: typeof premio === "number" && premio >= 0 ? premio : 0,
      posicao: Number.isInteger(posicao) && posicao > 0 ? posicao : null,
      field: Number.isInteger(field) && field > 0 ? field : null,
    },
  });
  return NextResponse.json(torneio, { status: 201 });
}
