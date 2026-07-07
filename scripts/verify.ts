// Confere os totais calculados contra os valores da planilha
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const regs = await prisma.registroDiario.findMany({
    where: { ano: 2026 },
    include: { site: true },
  });
  const dias = await prisma.diaMes.findMany({ where: { ano: 2026 } });

  const lucroMes = new Map<number, number>();
  for (const r of regs) {
    const res = (r.saldoFinal ?? 0) - (r.bancaInicial ?? 0);
    lucroMes.set(r.mes, (lucroMes.get(r.mes) ?? 0) + res);
  }
  let ano = 0;
  for (const [m, v] of [...lucroMes].sort((a, b) => a[0] - b[0])) {
    console.log(`Lucro mês ${m}: ${v.toFixed(2)}`);
    ano += v;
  }
  console.log(`Lucro ano: ${ano.toFixed(2)} (planilha: 213.19)`);
  const horas = dias.reduce((s, d) => s + (d.horas ?? 0), 0);
  console.log(`Horas ano: ${horas} (planilha: 35)`);

  // Banca por site em abril (último saldoFinal do mês)
  const abril = regs
    .filter((r) => r.mes === 4 && r.saldoFinal !== null)
    .sort((a, b) => a.dia - b.dia);
  const banca = new Map<string, number>();
  for (const r of abril) banca.set(r.site.nome, r.saldoFinal!);
  let tot = 0;
  for (const [n, v] of banca) {
    console.log(`Banca abril ${n}: ${v.toFixed(2)}`);
    tot += v;
  }
  console.log(`Soma bancas abril: ${tot.toFixed(2)} (planilha: 236.13)`);
}

main().finally(() => prisma.$disconnect());
