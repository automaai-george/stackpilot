import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";

// Exporta TODOS os dados do usuário em um .xlsx (backup completo)
export async function GET() {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const dono = { usuarioId: uid };
  const [sites, registros, dias, sessoes, torneios, movs, carteiras, saldos, metas] =
    await Promise.all([
      prisma.site.findMany({ where: dono, orderBy: { ordem: "asc" } }),
      prisma.registroDiario.findMany({
        where: dono,
        orderBy: [{ ano: "asc" }, { mes: "asc" }, { dia: "asc" }],
        include: { site: true },
      }),
      prisma.diaMes.findMany({
        where: dono,
        orderBy: [{ ano: "asc" }, { mes: "asc" }, { dia: "asc" }],
      }),
      prisma.sessao.findMany({
        where: dono,
        orderBy: [{ ano: "asc" }, { mes: "asc" }, { dia: "asc" }],
      }),
      prisma.torneio.findMany({
        where: dono,
        orderBy: [{ ano: "asc" }, { mes: "asc" }, { dia: "asc" }],
        include: { site: true },
      }),
      prisma.movimentacao.findMany({
        where: dono,
        orderBy: [{ ano: "asc" }, { mes: "asc" }, { dia: "asc" }],
      }),
      prisma.carteira.findMany({ where: dono, orderBy: { ordem: "asc" } }),
      prisma.saldoCarteira.findMany({
        where: dono,
        orderBy: [{ ano: "asc" }, { mes: "asc" }],
        include: { carteira: true },
      }),
      prisma.meta.findMany({ where: dono, orderBy: [{ ano: "asc" }, { mes: "asc" }] }),
    ]);

  const wb = XLSX.utils.book_new();
  const aba = (nome: string, linhas: object[]) =>
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas), nome);

  aba("Registros", registros.map((r) => ({
    data: `${r.dia}/${r.mes}/${r.ano}`,
    site: r.site.nome,
    bancaInicial: r.bancaInicial,
    saldoFinal: r.saldoFinal,
    resultado:
      r.bancaInicial === null && r.saldoFinal === null
        ? null
        : (r.saldoFinal ?? 0) - (r.bancaInicial ?? 0),
  })));
  aba("Dias", dias.map((d) => ({
    data: `${d.dia}/${d.mes}/${d.ano}`,
    jogou: d.jogou ? "sim" : "",
    horas: d.horas,
    horasEstudo: d.horasEstudo,
    estado: d.estado,
    tipoJogo: d.tipoJogo,
    nota: d.nota,
  })));
  aba("Sessoes", sessoes.map((s) => ({
    data: `${s.dia}/${s.mes}/${s.ano}`,
    inicio: s.inicio,
    fim: s.fim,
  })));
  aba("Torneios", torneios.map((t) => ({
    data: `${t.dia}/${t.mes}/${t.ano}`,
    site: t.site?.nome ?? "",
    nome: t.nome,
    buyIn: t.buyIn,
    premio: t.premio,
    posicao: t.posicao,
    field: t.field,
  })));
  aba("Movimentacoes", movs.map((m) => ({
    data: `${m.dia}/${m.mes}/${m.ano}`,
    tipo: m.tipo,
    valor: m.valor,
    descricao: m.descricao,
  })));
  aba("SaldosCarteiras", saldos.map((s) => ({
    mes: `${s.mes}/${s.ano}`,
    carteira: s.carteira.nome,
    valor: s.valor,
  })));
  aba("Sites", sites.map((s) => ({ nome: s.nome, moeda: s.moeda, ativo: s.ativo ? "sim" : "" })));
  aba("Carteiras", carteiras.map((c) => ({ nome: c.nome, ativo: c.ativo ? "sim" : "" })));
  aba("Metas", metas.map((m) => ({
    periodo: m.mes === 0 ? String(m.ano) : `${m.mes}/${m.ano}`,
    lucroAlvo: m.lucroAlvo,
    horasAlvo: m.horasAlvo,
    diasAlvo: m.diasAlvo,
  })));

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const hoje = new Date();
  const nome = `poker-bankroll-${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}.xlsx`;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nome}"`,
    },
  });
}
