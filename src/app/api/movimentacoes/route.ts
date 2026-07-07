import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";

const TIPOS = ["saque", "deposito", "despesa"];

export async function POST(req: Request) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { ano, mes, dia, tipo, valor, descricao } = await req.json();
  if (![ano, mes, dia].every(Number.isInteger) || !TIPOS.includes(tipo)) {
    return NextResponse.json(
      { error: "ano, mes, dia e tipo (saque|deposito|despesa) são obrigatórios" },
      { status: 400 }
    );
  }
  if (typeof valor !== "number" || !(valor > 0)) {
    return NextResponse.json({ error: "valor deve ser positivo" }, { status: 400 });
  }
  const mov = await prisma.movimentacao.create({
    data: {
      usuarioId: uid,
      ano, mes, dia, tipo, valor,
      descricao: typeof descricao === "string" && descricao.trim() ? descricao.trim() : null,
    },
  });
  return NextResponse.json(mov, { status: 201 });
}
