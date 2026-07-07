// Inspeção pontual: PS.ES em julho/2026 + Ecopayz (para corrigir o saque do dia 6)
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const ps = await p.site.findFirst({ where: { nome: "PS.ES" } });
  const regs = await p.registroDiario.findMany({
    where: { ano: 2026, mes: 7, siteId: ps!.id },
    orderBy: { dia: "asc" },
  });
  console.log(
    "PS.ES julho:",
    JSON.stringify(regs.map((r) => ({ dia: r.dia, banca: r.bancaInicial, saldo: r.saldoFinal })))
  );

  const eco = await p.carteira.findFirst({ where: { nome: { contains: "copayz" } } });
  const saldoEco = await p.saldoCarteira.findFirst({
    where: { carteiraId: eco!.id, ano: 2026, mes: 7 },
  });
  console.log("Ecopayz julho:", saldoEco?.valor ?? "(sem lançamento)");

  const todos = await p.registroDiario.findMany({
    where: { ano: 2026, mes: 7, dia: { in: [5, 6, 7] } },
    include: { site: true },
    orderBy: [{ dia: "asc" }],
  });
  console.log(
    "dias 5-7 (todos os sites):",
    JSON.stringify(
      todos.map((r) => ({ dia: r.dia, site: r.site.nome, banca: r.bancaInicial, saldo: r.saldoFinal }))
    )
  );
}

main().finally(() => p.$disconnect());
