// Correção pontual (06/07/2026): restaura o fechamento real do PS.ES no dia 6
// (236,71 — antes do saque) e registra o caixa pós-saque (50) como ajuste
// neutro no dia 7 (banca inicial do próximo grind).
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const ps = await p.site.findFirst({ where: { nome: "PS.ES" } });
  if (!ps) throw new Error("PS.ES não encontrado");

  const dia6 = await p.registroDiario.update({
    where: { siteId_ano_mes_dia: { siteId: ps.id, ano: 2026, mes: 7, dia: 6 } },
    data: { saldoFinal: 236.71 },
  });
  console.log(
    `dia 6 restaurado: banca ${dia6.bancaInicial} -> saldo ${dia6.saldoFinal} (lucro +${(dia6.saldoFinal! - dia6.bancaInicial!).toFixed(2)})`
  );

  const dia7 = await p.registroDiario.upsert({
    where: { siteId_ano_mes_dia: { siteId: ps.id, ano: 2026, mes: 7, dia: 7 } },
    create: { siteId: ps.id, ano: 2026, mes: 7, dia: 7, bancaInicial: 50, saldoFinal: 50 },
    update: { bancaInicial: 50, saldoFinal: 50 },
  });
  console.log(`dia 7 criado: banca ${dia7.bancaInicial} / saldo ${dia7.saldoFinal} (ajuste neutro pós-saque)`);
}

main().finally(() => p.$disconnect());
