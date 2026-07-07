/**
 * Lança os valores mensais de 2023 (Itália) informados pelo George.
 * Sem detalhe por site/dia: tudo entra no site "geral 2023 IT", com o lucro
 * do mês no dia 1 e os dias jogados como dias 1..N, cada um com a média de
 * horas da Itália em 2024 (997h / 122 dias = 8,17h por dia).
 * Pode rodar de novo: apaga e recria apenas o ano de 2023.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const HORAS_POR_DIA = 8.17; // média Itália 2024

// mês -> [dias jogados, lucro]
const DADOS: Record<number, [number, number]> = {
  1: [14, -56.08],
  2: [16, 1478.05],
  3: [16, 589.91],
  4: [17, 1802.53],
  5: [23, 1459.47],
  6: [19, 241.35],
  7: [4, 1.59],
  8: [11, 225.25],
  9: [15, 153.83],
  10: [21, 2059.03],
  11: [20, 5261.15],
};

async function main() {
  let site = await prisma.site.findFirst({ where: { nome: "geral 2023 IT" } });
  if (!site) {
    const max = await prisma.site.aggregate({ _max: { ordem: true } });
    site = await prisma.site.create({
      data: { nome: "geral 2023 IT", ativo: false, ordem: (max._max.ordem ?? -1) + 1 },
    });
    console.log(`Criado site "geral 2023 IT" (inativo).`);
  }

  await prisma.registroDiario.deleteMany({ where: { ano: 2023 } });
  await prisma.diaMes.deleteMany({ where: { ano: 2023 } });

  let totLucro = 0;
  let totDias = 0;
  for (const [mesStr, [dias, lucro]] of Object.entries(DADOS)) {
    const mes = Number(mesStr);
    await prisma.registroDiario.create({
      data: { ano: 2023, mes, dia: 1, siteId: site.id, bancaInicial: 0, saldoFinal: lucro },
    });
    for (let d = 1; d <= dias; d++) {
      await prisma.diaMes.create({
        data: { ano: 2023, mes, dia: d, jogou: true, horas: HORAS_POR_DIA },
      });
    }
    totLucro += lucro;
    totDias += dias;
  }

  console.log(`Lucro 2023: ${totLucro.toFixed(2)}`);
  console.log(`Dias jogados: ${totDias}`);
  console.log(`Horas estimadas: ${(totDias * HORAS_POR_DIA).toFixed(1)}h (${HORAS_POR_DIA}h/dia)`);
}

main().finally(() => prisma.$disconnect());
