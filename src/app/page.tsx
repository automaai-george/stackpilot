import { prisma } from "@/lib/prisma";
import { exigirUid } from "@/lib/sessao";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const uid = await exigirUid();
  const hoje = new Date();

  const [sites, registros, dias, carteiras, saldos, metas, movimentacoes, config, cotacoes] =
    await Promise.all([
      prisma.site.findMany({ where: { usuarioId: uid }, orderBy: { ordem: "asc" } }),
      prisma.registroDiario.findMany({
        where: { usuarioId: uid },
        orderBy: [{ ano: "asc" }, { mes: "asc" }, { dia: "asc" }],
      }),
      prisma.diaMes.findMany({
        where: { usuarioId: uid },
        orderBy: [{ ano: "asc" }, { mes: "asc" }, { dia: "asc" }],
      }),
      prisma.carteira.findMany({
        where: { usuarioId: uid, ativo: true },
        orderBy: { ordem: "asc" },
      }),
      prisma.saldoCarteira.findMany({
        where: { usuarioId: uid },
        orderBy: [{ ano: "asc" }, { mes: "asc" }],
      }),
      prisma.meta.findMany({ where: { usuarioId: uid } }),
      prisma.movimentacao.findMany({
        where: { usuarioId: uid },
        orderBy: [{ ano: "asc" }, { mes: "asc" }, { dia: "asc" }],
      }),
      prisma.config.findUnique({ where: { usuarioId: uid } }),
      prisma.cotacao.findMany({ where: { usuarioId: uid } }),
    ]);

  const anosSet = new Set<number>([
    ...registros.map((r) => r.ano),
    ...dias.map((d) => d.ano),
    hoje.getFullYear(),
  ]);

  return (
    <DashboardClient
      sites={sites}
      registros={registros}
      dias={dias}
      carteiras={carteiras}
      saldos={saldos}
      metasIniciais={metas}
      movimentacoes={movimentacoes}
      config={config}
      cotacoes={Object.fromEntries(cotacoes.map((c) => [c.moeda, c.paraUSD]))}
      anos={[...anosSet].sort((a, b) => b - a)}
      anoAtual={hoje.getFullYear()}
      mesAtual={hoje.getMonth() + 1}
      diaAtual={hoje.getDate()}
    />
  );
}
