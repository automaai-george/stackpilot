// Compara os totais do banco (2024) com os rodapés da planilha de 2024
import * as XLSX from "xlsx";
import * as path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type Cell = string | number | null;

function parseMoney(v: Cell): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  let s = v.replace(/[$\s]/g, "");
  if (s === "" || s === "-" || s.includes("#")) return null;
  const neg = s.startsWith("-");
  s = s.replace(/[()\-]/g, "").replace(/,/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? null : neg ? -n : n;
}

async function main() {
  const file = path.resolve(__dirname, "..", "..", "Planilha_Bankroll_2024_George.xlsx");
  const wb = XLSX.readFile(file);

  const regs = await prisma.registroDiario.findMany({
    where: { ano: 2024 },
    include: { site: true },
  });
  const dias = await prisma.diaMes.findMany({ where: { ano: 2024 } });

  let falhas = 0;
  let anoPlanilha = 0;
  let anoBanco = 0;

  for (let mes = 1; mes <= 12; mes++) {
    const ws = wb.Sheets[MESES[mes - 1]];
    if (!ws) continue;
    const rows: Cell[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1, defval: null, raw: false, range: "C1:BA45",
    });
    const header = rows[4] || [];
    const rodape = rows[37] || []; // linha 38: "Lucro Total"

    for (let c = 0; c < header.length; c++) {
      const v = header[c];
      if (typeof v !== "string" || !v.trim()) continue;
      const nome = v.trim();
      if (nome.toLowerCase().startsWith("horas")) continue;
      // valor do Lucro Total do bloco: célula c+2 na linha 38
      const esperado = parseMoney(rodape[c + 2]) ?? 0;
      const calculado = regs
        .filter((r) => r.mes === mes && r.site.nome.trim() === nome)
        .reduce((s, r) => {
          if (r.bancaInicial === null && r.saldoFinal === null) return s;
          return s + (r.saldoFinal ?? 0) - (r.bancaInicial ?? 0);
        }, 0);
      anoPlanilha += esperado;
      anoBanco += calculado;
      const ok = Math.abs(esperado - calculado) < 0.01;
      if (!ok) {
        falhas++;
        console.log(
          `DIVERGÊNCIA ${MESES[mes - 1]} ${nome}: planilha=${esperado.toFixed(2)} banco=${calculado.toFixed(2)}`
        );
      }
    }
  }

  const horas = dias.reduce((s, d) => s + (d.horas ?? 0), 0);
  const diasJogados = dias.filter((d) => d.jogou || (d.horas ?? 0) > 0).length;
  console.log(`\nLucro 2024 — planilha: ${anoPlanilha.toFixed(2)} | banco: ${anoBanco.toFixed(2)}`);
  console.log(`Horas 2024 (banco): ${horas.toFixed(1)}h em ${diasJogados} dias jogados`);
  console.log(falhas === 0 ? "\n✔ Todos os meses batem com a planilha." : `\n✘ ${falhas} divergência(s).`);
}

main().finally(() => prisma.$disconnect());
