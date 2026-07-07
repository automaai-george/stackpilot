/**
 * Copia todos os dados do SQLite local (prisma/dev.db) para o banco novo
 * (Neon/Postgres) apontado pela DATABASE_URL atual.
 *
 * Ordem de uso (depois de trocar o provider para "postgresql" no schema):
 *   1. .env com DATABASE_URL do Neon
 *   2. npx prisma db push        (cria as tabelas no Neon)
 *   3. npx tsx scripts/migrar-para-neon.ts
 *
 * Os IDs são preservados e as sequências do Postgres são ajustadas no final.
 */
import { DatabaseSync } from "node:sqlite";
import * as path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL?.startsWith("postgres")) {
    console.error(
      "DATABASE_URL não é Postgres — configure o .env com a URL do Neon antes de migrar."
    );
    process.exit(1);
  }

  const local = new DatabaseSync(path.resolve(__dirname, "..", "prisma", "dev.db"), {
    readOnly: true,
  });
  const ler = <T>(sql: string): T[] => local.prepare(sql).all() as T[];

  const sites = ler<{ id: number; nome: string; ativo: number; ordem: number }>(
    'SELECT * FROM "Site"'
  );
  const carteiras = ler<{ id: number; nome: string; ativo: number; ordem: number }>(
    'SELECT * FROM "Carteira"'
  );
  const registros = ler<{
    id: number; ano: number; mes: number; dia: number; siteId: number;
    bancaInicial: number | null; saldoFinal: number | null;
  }>('SELECT * FROM "RegistroDiario"');
  const dias = ler<{
    id: number; ano: number; mes: number; dia: number; jogou: number;
    horas: number | null; horaInicio: string | null; horaFim: string | null;
  }>('SELECT * FROM "DiaMes"');
  const saldos = ler<{ id: number; ano: number; mes: number; valor: number; carteiraId: number }>(
    'SELECT * FROM "SaldoCarteira"'
  );

  console.log(
    `Lidos do SQLite: ${sites.length} sites, ${carteiras.length} carteiras, ` +
      `${registros.length} registros, ${dias.length} dias, ${saldos.length} saldos.`
  );

  // limpa o destino (na ordem certa por causa das chaves estrangeiras)
  await prisma.registroDiario.deleteMany();
  await prisma.saldoCarteira.deleteMany();
  await prisma.diaMes.deleteMany();
  await prisma.site.deleteMany();
  await prisma.carteira.deleteMany();

  await prisma.site.createMany({
    data: sites.map((s) => ({ ...s, ativo: !!s.ativo })),
  });
  await prisma.carteira.createMany({
    data: carteiras.map((c) => ({ ...c, ativo: !!c.ativo })),
  });
  await prisma.registroDiario.createMany({ data: registros });
  await prisma.diaMes.createMany({
    data: dias.map((d) => ({ ...d, jogou: !!d.jogou })),
  });
  await prisma.saldoCarteira.createMany({ data: saldos });

  // ajusta as sequências de id do Postgres (inserimos ids explícitos)
  for (const tabela of ["Site", "Carteira", "RegistroDiario", "DiaMes", "SaldoCarteira"]) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${tabela}"','id'), COALESCE((SELECT MAX(id) FROM "${tabela}"), 1))`
    );
  }

  const conferencia = await prisma.registroDiario.count();
  console.log(`\nMigração concluída — ${conferencia} registros no Postgres.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
