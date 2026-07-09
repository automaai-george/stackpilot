import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";
import { hashSenha, senhaConfere } from "@/lib/senha";

// Troca a própria senha (precisa estar logado e informar a senha atual)
export async function PUT(req: Request) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { senhaAtual, senhaNova } = await req.json().catch(() => ({}));
  if (typeof senhaNova !== "string" || senhaNova.length < 8) {
    return NextResponse.json(
      { error: "A nova senha precisa ter pelo menos 8 caracteres" },
      { status: 400 }
    );
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: uid } });
  if (!usuario || !senhaConfere(String(senhaAtual ?? ""), usuario.senhaHash)) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 });
  }

  await prisma.usuario.update({
    where: { id: uid },
    data: { senhaHash: hashSenha(senhaNova) },
  });
  return NextResponse.json({ ok: true });
}
