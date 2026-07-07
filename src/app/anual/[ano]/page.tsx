import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirUid } from "@/lib/sessao";
import { AnualClient } from "@/components/anual/anual-client";

export const dynamic = "force-dynamic";

export default async function AnualPage({
  params,
}: {
  params: Promise<{ ano: string }>;
}) {
  const p = await params;
  const ano = Number(p.ano);
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) notFound();

  const uid = await exigirUid();
  const [sites, registros, dias] = await Promise.all([
    // sites ativos + sites inativos que tenham dados neste ano
    prisma.site.findMany({
      where: {
        usuarioId: uid,
        OR: [{ ativo: true }, { registros: { some: { ano } } }],
      },
      orderBy: { ordem: "asc" },
    }),
    prisma.registroDiario.findMany({ where: { usuarioId: uid, ano } }),
    prisma.diaMes.findMany({ where: { usuarioId: uid, ano } }),
  ]);

  return (
    <AnualClient ano={ano} sites={sites} registros={registros} dias={dias} />
  );
}
