import { prisma } from "@/lib/prisma";
import { exigirUid } from "@/lib/sessao";
import { TorneiosClient } from "@/components/torneios/torneios-client";

export const dynamic = "force-dynamic";

export default async function TorneiosPage() {
  const uid = await exigirUid();
  const hoje = new Date();
  const [torneios, sites] = await Promise.all([
    prisma.torneio.findMany({
      where: { usuarioId: uid },
      orderBy: [{ ano: "desc" }, { mes: "desc" }, { dia: "desc" }, { id: "desc" }],
    }),
    prisma.site.findMany({
      where: { usuarioId: uid, ativo: true },
      orderBy: { ordem: "asc" },
    }),
  ]);

  const anos = [...new Set(torneios.map((t) => t.ano))].sort((a, b) => b - a);
  if (!anos.includes(hoje.getFullYear())) anos.unshift(hoje.getFullYear());

  return (
    <TorneiosClient
      torneiosIniciais={torneios}
      sites={sites.map((s) => ({ id: s.id, nome: s.nome }))}
      anos={anos}
      anoAtual={hoje.getFullYear()}
    />
  );
}
