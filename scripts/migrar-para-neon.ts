/**
 * Copia TODOS os dados do SQLite local (prisma/dev.db) para o Postgres (Neon)
 * apontado pela DATABASE_URL. Preserva IDs e ajusta as sequências no final.
 *
 * Ordem de uso (com o provider já em "postgresql" no schema):
 *   1. .env com DATABASE_URL (pooled) e DATABASE_URL_DIRETA (sem pooler)
 *   2. DATABASE_URL=direta npx prisma db push   (cria as tabelas)
 *   3. npx tsx scripts/migrar-para-neon.ts
 */
import "dotenv/config";
import { DatabaseSync } from "node:sqlite";
import * as path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const b = (v: unknown) => !!v; // SQLite guarda boolean como 0/1

async function main() {
  if (!process.env.DATABASE_URL?.startsWith("postgres")) {
    console.error("DATABASE_URL não é Postgres — configure o .env antes de migrar.");
    process.exit(1);
  }

  const local = new DatabaseSync(path.resolve(__dirname, "..", "prisma", "dev.db"), {
    readOnly: true,
  });
  const ler = <T>(sql: string): T[] => local.prepare(sql).all() as T[];

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const usuarios = ler<any>('SELECT * FROM "Usuario"');
  const sites = ler<any>('SELECT * FROM "Site"');
  const carteiras = ler<any>('SELECT * FROM "Carteira"');
  const registros = ler<any>('SELECT * FROM "RegistroDiario"');
  const dias = ler<any>('SELECT * FROM "DiaMes"');
  const sessoes = ler<any>('SELECT * FROM "Sessao"');
  const metas = ler<any>('SELECT * FROM "Meta"');
  const movs = ler<any>('SELECT * FROM "Movimentacao"');
  const torneios = ler<any>('SELECT * FROM "Torneio"');
  const cotacoes = ler<any>('SELECT * FROM "Cotacao"');
  const configs = ler<any>('SELECT * FROM "Config"');
  const saldos = ler<any>('SELECT * FROM "SaldoCarteira"');

  console.log(
    `Lidos: ${usuarios.length} usuários, ${sites.length} sites, ${registros.length} registros, ` +
      `${dias.length} dias, ${sessoes.length} sessões, ${torneios.length} torneios, ` +
      `${metas.length} metas, ${movs.length} movs, ${saldos.length} saldos, ` +
      `${cotacoes.length} cotações, ${configs.length} configs.`
  );

  // limpa o destino (ordem inversa das FKs) — reimportação idempotente
  await prisma.saldoCarteira.deleteMany();
  await prisma.registroDiario.deleteMany();
  await prisma.torneio.deleteMany();
  await prisma.sessao.deleteMany();
  await prisma.diaMes.deleteMany();
  await prisma.meta.deleteMany();
  await prisma.movimentacao.deleteMany();
  await prisma.cotacao.deleteMany();
  await prisma.config.deleteMany();
  await prisma.carteira.deleteMany();
  await prisma.site.deleteMany();
  await prisma.usuario.deleteMany();

  // insere na ordem das FKs
  await prisma.usuario.createMany({
    data: usuarios.map((u) => ({ ...u, criadoEm: new Date(u.criadoEm) })),
  });
  await prisma.site.createMany({ data: sites.map((s) => ({ ...s, ativo: b(s.ativo) })) });
  await prisma.carteira.createMany({
    data: carteiras.map((c) => ({ ...c, ativo: b(c.ativo) })),
  });
  await prisma.registroDiario.createMany({ data: registros });
  await prisma.diaMes.createMany({ data: dias.map((d) => ({ ...d, jogou: b(d.jogou) })) });
  await prisma.sessao.createMany({ data: sessoes });
  await prisma.meta.createMany({ data: metas });
  await prisma.movimentacao.createMany({ data: movs });
  await prisma.torneio.createMany({ data: torneios });
  await prisma.cotacao.createMany({ data: cotacoes });
  await prisma.config.createMany({ data: configs });
  await prisma.saldoCarteira.createMany({ data: saldos });

  // ajusta as sequências (inserimos ids explícitos)
  for (const t of [
    "Usuario", "Site", "Carteira", "RegistroDiario", "DiaMes", "Sessao",
    "Meta", "Movimentacao", "Torneio", "Cotacao", "Config", "SaldoCarteira",
  ]) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${t}"','id'), COALESCE((SELECT MAX(id) FROM "${t}"), 1))`
    );
  }

  const conferencia = await Promise.all([
    prisma.usuario.count(),
    prisma.registroDiario.count(),
    prisma.diaMes.count(),
    prisma.torneio.count(),
  ]);
  console.log(
    `\nNo Neon agora: ${conferencia[0]} usuários, ${conferencia[1]} registros, ` +
      `${conferencia[2]} dias, ${conferencia[3]} torneios. Migração concluída.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
