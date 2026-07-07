import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirUid } from "@/lib/sessao";
import { MesClient } from "@/components/mes/mes-client";

export const dynamic = "force-dynamic";

export default async function MesPage({
  params,
}: {
  params: Promise<{ ano: string; mes: string }>;
}) {
  const p = await params;
  const ano = Number(p.ano);
  const mes = Number(p.mes);
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    notFound();
  }

  const uid = await exigirUid();
  const [sites, registros, dias, carteiras, saldos, movimentacoes] = await Promise.all([
    // sites ativos + sites inativos que tenham dados neste mês (ex.: Itália 2024)
    prisma.site.findMany({
      where: {
        usuarioId: uid,
        OR: [{ ativo: true }, { registros: { some: { ano, mes } } }],
      },
      orderBy: { ordem: "asc" },
    }),
    prisma.registroDiario.findMany({ where: { usuarioId: uid, ano, mes } }),
    prisma.diaMes.findMany({ where: { usuarioId: uid, ano, mes } }),
    prisma.carteira.findMany({
      where: { usuarioId: uid, ativo: true },
      orderBy: { ordem: "asc" },
    }),
    prisma.saldoCarteira.findMany({ where: { usuarioId: uid, ano, mes } }),
    prisma.movimentacao.findMany({
      where: { usuarioId: uid, ano, mes },
      orderBy: { dia: "asc" },
    }),
  ]);

  return (
    <MesClient
      ano={ano}
      mes={mes}
      sites={sites}
      registrosIniciais={registros}
      diasIniciais={dias}
      carteiras={carteiras}
      saldosIniciais={saldos}
      movimentacoesIniciais={movimentacoes}
    />
  );
}
