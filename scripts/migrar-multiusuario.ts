/**
 * Migração para multi-usuário: cria o usuário do George (id 1) com a senha
 * atual do APP_PASSWORD. Os dados existentes recebem usuarioId=1 pelo
 * default da fase 2 do schema. Idempotente.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashSenha } from "../src/lib/senha";

const prisma = new PrismaClient();

async function main() {
  const email = "autoautomaai@gmail.com";
  const senha = process.env.APP_PASSWORD ?? "poker2026";

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log(`Usuário já existe: ${email} (id ${existente.id})`);
    return;
  }
  const u = await prisma.usuario.create({
    data: { email, nome: "George", senhaHash: hashSenha(senha) },
  });
  console.log(`Usuário criado: ${u.email} (id ${u.id}) — senha = APP_PASSWORD do .env`);
  if (u.id !== 1) {
    console.warn("ATENÇÃO: id diferente de 1 — ajuste os defaults da fase 2!");
  }
}

main().finally(() => prisma.$disconnect());
