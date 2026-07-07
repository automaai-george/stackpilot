import { prisma } from "@/lib/prisma";
import { exigirUid } from "@/lib/sessao";
import { MesesClient } from "@/components/meses/meses-client";

export const dynamic = "force-dynamic";

export default async function MesesPage() {
  const uid = await exigirUid();
  const hoje = new Date();

  const [sites, registros, dias, cotacoes] = await Promise.all([
    prisma.site.findMany({ where: { usuarioId: uid } }),
    prisma.registroDiario.findMany({ where: { usuarioId: uid } }),
    prisma.diaMes.findMany({ where: { usuarioId: uid } }),
    prisma.cotacao.findMany({ where: { usuarioId: uid } }),
  ]);

  const anos = [
    ...new Set([
      ...registros.map((r) => r.ano),
      ...dias.map((d) => d.ano),
      hoje.getFullYear(),
    ]),
  ].sort((a, b) => b - a);

  return (
    <MesesClient
      sites={sites}
      registros={registros}
      dias={dias}
      cotacoes={Object.fromEntries(cotacoes.map((c) => [c.moeda, c.paraUSD]))}
      anos={anos}
      anoAtual={hoje.getFullYear()}
      mesAtual={hoje.getMonth() + 1}
    />
  );
}
