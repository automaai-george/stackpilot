import { prisma } from "@/lib/prisma";
import { exigirUid } from "@/lib/sessao";
import { ExtratoClient } from "@/components/extrato/extrato-client";

export const dynamic = "force-dynamic";

export default async function ExtratoPage() {
  const uid = await exigirUid();
  const movimentacoes = await prisma.movimentacao.findMany({
    where: { usuarioId: uid },
    orderBy: [{ ano: "desc" }, { mes: "desc" }, { dia: "desc" }, { id: "desc" }],
  });

  const anos = [...new Set(movimentacoes.map((m) => m.ano))].sort((a, b) => b - a);

  return (
    <ExtratoClient
      movimentacoesIniciais={movimentacoes}
      anos={anos}
      anoAtual={new Date().getFullYear()}
    />
  );
}
