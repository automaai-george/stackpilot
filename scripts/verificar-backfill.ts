// Confere se todos os dados existentes ficaram com usuarioId = 1
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const tabelas = [
    ["registros", await p.registroDiario.count(), await p.registroDiario.count({ where: { usuarioId: 1 } })],
    ["dias", await p.diaMes.count(), await p.diaMes.count({ where: { usuarioId: 1 } })],
    ["sites", await p.site.count(), await p.site.count({ where: { usuarioId: 1 } })],
    ["carteiras", await p.carteira.count(), await p.carteira.count({ where: { usuarioId: 1 } })],
    ["saldos", await p.saldoCarteira.count(), await p.saldoCarteira.count({ where: { usuarioId: 1 } })],
    ["sessoes", await p.sessao.count(), await p.sessao.count({ where: { usuarioId: 1 } })],
    ["metas", await p.meta.count(), await p.meta.count({ where: { usuarioId: 1 } })],
    ["movimentacoes", await p.movimentacao.count(), await p.movimentacao.count({ where: { usuarioId: 1 } })],
    ["torneios", await p.torneio.count(), await p.torneio.count({ where: { usuarioId: 1 } })],
    ["config", await p.config.count(), await p.config.count({ where: { usuarioId: 1 } })],
    ["cotacoes", await p.cotacao.count(), await p.cotacao.count({ where: { usuarioId: 1 } })],
  ] as const;
  let ok = true;
  for (const [nome, total, doUm] of tabelas) {
    const bate = total === doUm;
    if (!bate) ok = false;
    console.log(`${nome}: ${doUm}/${total} ${bate ? "✔" : "✘"}`);
  }
  console.log(ok ? "\n✔ Backfill completo." : "\n✘ Há linhas sem dono!");
}

main().finally(() => p.$disconnect());
