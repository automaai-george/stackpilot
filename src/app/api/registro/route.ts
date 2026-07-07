import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/senha";
import { COOKIE_SESSAO, criarToken } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  const { nome, email, senha } = await req.json().catch(() => ({}));

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }
  if (typeof senha !== "string" || senha.length < 8) {
    return NextResponse.json(
      { error: "A senha precisa ter pelo menos 8 caracteres" },
      { status: 400 }
    );
  }

  const emailNorm = email.trim().toLowerCase();
  const jaExiste = await prisma.usuario.findUnique({ where: { email: emailNorm } });
  if (jaExiste) {
    return NextResponse.json({ error: "Este e-mail já tem conta" }, { status: 409 });
  }

  const usuario = await prisma.usuario.create({
    data: {
      email: emailNorm,
      nome: typeof nome === "string" && nome.trim() ? nome.trim() : null,
      senhaHash: hashSenha(senha),
      config: { create: {} }, // preferências padrão
    },
  });

  const res = NextResponse.json({ ok: true }, { status: 201 });
  res.cookies.set(COOKIE_SESSAO, await criarToken(usuario.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
