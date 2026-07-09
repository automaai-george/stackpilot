import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";
import { EH_DONO } from "@/lib/admin";
import { hashSenha } from "@/lib/senha";

// Reset de emergência: o dono define uma senha temporária para um usuário
// que ficou travado. O usuário troca depois em Configurações.
export async function POST(req: Request) {
  const uid = await uidAtual();
  if (!EH_DONO(uid)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { usuarioId, novaSenha } = await req.json().catch(() => ({}));
  if (!Number.isInteger(usuarioId)) {
    return NextResponse.json({ error: "usuário inválido" }, { status: 400 });
  }
  if (typeof novaSenha !== "string" || novaSenha.length < 8) {
    return NextResponse.json(
      { error: "A senha temporária precisa ter pelo menos 8 caracteres" },
      { status: 400 }
    );
  }
  const alvo = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!alvo) return NextResponse.json({ error: "usuário não encontrado" }, { status: 404 });

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { senhaHash: hashSenha(novaSenha) },
  });
  return NextResponse.json({ ok: true, email: alvo.email });
}
