/**
 * Importa uma planilha de controle de bankroll para o banco SQLite.
 *
 * Uso:
 *   npm run import -- <caminho\planilha.xlsx> <ano> [--sites-inativos] [--map "De=Para"]...
 *
 * Exemplos:
 *   npm run import -- "..\Controle Bank 2026.xlsx" 2026
 *   npm run import -- "..\Planilha_Bankroll_2024_George.xlsx" 2024 --sites-inativos --map "IPOKER=IPOKER IT"
 *
 * --map renomeia um site da planilha na hora de importar (ex.: o "IPOKER"
 * da planilha de 2024 é outro site, o "IPOKER IT").
 *
 * Comportamento:
 *  - Apaga e reimporta APENAS os dados do ano informado (registros, dias e
 *    saldos de carteiras). Sites e carteiras nunca são apagados; novos são
 *    criados casando pelo nome (sem diferenciar maiúsculas).
 *  - Com --sites-inativos, sites criados por esta importação nascem
 *    desativados (útil para sites antigos, ex.: Itália 2024).
 *
 * Estrutura esperada (abas Janeiro..Dezembro, dados a partir da coluna C):
 *  - linha 5: "Horas Jogadas" e nomes dos sites; cada site ocupa um bloco
 *    [banca inicial, saldo final, resultado, nº do dia]
 *  - linhas 6..36: dias 1..31; à esquerda: dia, "x" (jogou), horas (aceita 9:30)
 *  - abaixo da tabela: "Banca <carteira>" com saldos de carteiras externas
 */
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import * as path from "path";

const prisma = new PrismaClient();

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const CARTEIRAS = ["Muchbetter", "Skrill", "Binance", "Ecopayz", "Luxon", "Neteller"];

type Cell = string | number | null;

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function parseMoney(v: Cell): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  let s = v.replace(/[$\s]/g, "").replace("R$", "");
  if (s === "" || s === "-") return 0;
  if (s.includes("#")) return null; // #N/A, #REF! etc.
  const neg = s.startsWith("-") || (s.startsWith("(") && s.endsWith(")"));
  s = s.replace(/[()\-]/g, "").replace(/,/g, "");
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return neg ? -n : n;
}

function parseHoras(v: Cell): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  const s = String(v).trim();
  if (s.includes(":")) {
    const [h, m] = s.split(":");
    return parseFloat(h) + (parseFloat(m) || 0) / 60;
  }
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? null : n;
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const sitesInativos = args.includes("--sites-inativos");

  // --map "De=Para" (pode repetir)
  const mapa = new Map<string, string>();
  const posicionais: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--sites-inativos") continue;
    if (args[i] === "--map" || args[i].startsWith("--map=")) {
      const val = args[i].startsWith("--map=") ? args[i].slice(6) : args[++i];
      const [de, para] = (val ?? "").split("=");
      if (de && para) mapa.set(norm(de), para.trim());
      continue;
    }
    if (!args[i].startsWith("--")) posicionais.push(args[i]);
  }
  const file = posicionais[0]
    ? path.resolve(posicionais[0])
    : path.resolve(__dirname, "..", "..", "Controle Bank 2026.xlsx");
  const ANO = posicionais[1] ? parseInt(posicionais[1], 10) : 2026;
  if (!Number.isInteger(ANO) || ANO < 2000 || ANO > 2100) {
    console.error(`Ano inválido: ${posicionais[1]}`);
    process.exit(1);
  }

  console.log(`Lendo: ${file}`);
  console.log(`Ano de destino: ${ANO}${sitesInativos ? " (sites novos entram inativos)" : ""}`);
  const wb = XLSX.readFile(file);

  // Limpa APENAS o ano importado
  await prisma.registroDiario.deleteMany({ where: { ano: ANO } });
  await prisma.diaMes.deleteMany({ where: { ano: ANO } });
  await prisma.saldoCarteira.deleteMany({ where: { ano: ANO } });

  // Sites e carteiras existentes (casamento por nome)
  const siteByName = new Map<string, number>();
  for (const s of await prisma.site.findMany()) siteByName.set(norm(s.nome), s.id);
  let ordem = (await prisma.site.aggregate({ _max: { ordem: true } }))._max.ordem ?? -1;

  const carteiraByName = new Map<string, number>();
  for (const c of await prisma.carteira.findMany()) carteiraByName.set(norm(c.nome), c.id);
  let ordemCart =
    (await prisma.carteira.aggregate({ _max: { ordem: true } }))._max.ordem ?? -1;
  for (const nome of CARTEIRAS) {
    if (!carteiraByName.has(norm(nome))) {
      const c = await prisma.carteira.create({ data: { nome, ordem: ++ordemCart } });
      carteiraByName.set(norm(nome), c.id);
    }
  }

  const sitesNovos: string[] = [];
  let totRegistros = 0;
  let totDias = 0;
  let totSaldos = 0;

  for (let mes = 1; mes <= 12; mes++) {
    const ws = wb.Sheets[MESES[mes - 1]];
    if (!ws) continue;
    const rows: Cell[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: null,
      raw: false,
      range: "C1:BA60",
    });

    // Cabeçalho (linha 5): localiza "Horas Jogadas" e os sites
    const header = rows[4] || [];
    let horasCol = -1;
    const blocos: { col: number; siteId: number }[] = [];
    for (let c = 0; c < header.length; c++) {
      const v = header[c];
      if (typeof v !== "string" || !v.trim()) continue;
      let nome = v.trim();
      if (norm(nome).startsWith("horas")) {
        horasCol = c;
        continue;
      }
      nome = mapa.get(norm(nome)) ?? nome; // aplica --map
      let id = siteByName.get(norm(nome));
      if (id === undefined) {
        const site = await prisma.site.create({
          data: { nome, ordem: ++ordem, ativo: !sitesInativos },
        });
        id = site.id;
        siteByName.set(norm(nome), id);
        sitesNovos.push(nome);
      }
      blocos.push({ col: c, siteId: id });
    }
    if (horasCol < 0) horasCol = 2; // fallback: layout padrão
    const diaCol = horasCol - 2;
    const xCol = horasCol - 1;

    // Dias: linhas 6..36 (índices 5..35)
    for (let r = 5; r <= 35; r++) {
      const row = rows[r];
      if (!row) continue;
      const dia = parseInt(String(row[diaCol] ?? ""), 10);
      if (isNaN(dia) || dia < 1 || dia > 31) continue;

      const jogou = String(row[xCol] ?? "").trim().toLowerCase() === "x";
      const horas = parseHoras(row[horasCol]);
      if (jogou || (horas !== null && horas > 0)) {
        await prisma.diaMes.create({ data: { ano: ANO, mes, dia, jogou, horas } });
        totDias++;
      }

      for (const b of blocos) {
        const bancaInicial = parseMoney(row[b.col]);
        const saldoFinal = parseMoney(row[b.col + 1]);
        if (bancaInicial === null && saldoFinal === null) continue;
        await prisma.registroDiario.create({
          data: { ano: ANO, mes, dia, siteId: b.siteId, bancaInicial, saldoFinal },
        });
        totRegistros++;
      }
    }

    // Carteiras: "Banca <nome>" abaixo da tabela
    for (let r = 36; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const v = row[c];
        if (typeof v !== "string") continue;
        const m = v.trim().match(/^Banca\s+(.+)$/i);
        if (!m) continue;
        const id = carteiraByName.get(norm(m[1]));
        if (id === undefined) continue; // ignora "Banca Total", "Banca inicial mês"
        for (let k = c + 1; k <= c + 3 && k < row.length; k++) {
          const valor = parseMoney(row[k]);
          if (valor !== null && valor !== 0) {
            await prisma.saldoCarteira.upsert({
              where: { carteiraId_ano_mes: { carteiraId: id, ano: ANO, mes } },
              create: { carteiraId: id, ano: ANO, mes, valor },
              update: { valor },
            });
            totSaldos++;
            break;
          }
        }
      }
    }
  }

  console.log(`\nSites novos: ${sitesNovos.length ? sitesNovos.join(", ") : "nenhum"}`);
  console.log(`Registros diários importados (${ANO}): ${totRegistros}`);
  console.log(`Dias com jogo/horas: ${totDias}`);
  console.log(`Saldos de carteiras: ${totSaldos}`);
  console.log("\nImportação concluída.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
