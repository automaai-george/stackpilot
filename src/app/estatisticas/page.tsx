import { prisma } from "@/lib/prisma";
import { exigirUid } from "@/lib/sessao";
import { StatsClient } from "@/components/stats/stats-client";

export const dynamic = "force-dynamic";

export default async function EstatisticasPage() {
  const uid = await exigirUid();
  const [sites, registros, dias, sessoes, cotacoes] = await Promise.all([
    prisma.site.findMany({ where: { usuarioId: uid }, orderBy: { ordem: "asc" } }),
    prisma.registroDiario.findMany({
      where: { usuarioId: uid },
      orderBy: [{ ano: "asc" }, { mes: "asc" }, { dia: "asc" }],
    }),
    prisma.diaMes.findMany({
      where: { usuarioId: uid },
      orderBy: [{ ano: "asc" }, { mes: "asc" }, { dia: "asc" }],
    }),
    prisma.sessao.findMany({ where: { usuarioId: uid }, orderBy: { id: "asc" } }),
    prisma.cotacao.findMany({ where: { usuarioId: uid } }),
  ]);

  const anos = [
    ...new Set([...registros.map((r) => r.ano), ...dias.map((d) => d.ano)]),
  ].sort((a, b) => b - a);

  return (
    <StatsClient
      sites={sites}
      registros={registros}
      dias={dias}
      sessoes={sessoes}
      cotacoes={Object.fromEntries(cotacoes.map((c) => [c.moeda, c.paraUSD]))}
      anos={anos}
    />
  );
}
