import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { senhaConfere } from "@/lib/senha";
import { COOKIE_SESSAO, criarToken } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, senha } = await req.json().catch(() => ({}));

  if (typeof email !== "string" || typeof senha !== "string") {
    return NextResponse.json({ error: "Informe e-mail e senha" }, { status: 400 });
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!usuario || !senhaConfere(senha, usuario.senhaHash)) {
    // atraso dificulta tentativas em massa
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: "E-mail ou senha incorretos" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_SESSAO, await criarToken(usuario.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
