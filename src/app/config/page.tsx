import { prisma } from "@/lib/prisma";
import { exigirUid } from "@/lib/sessao";
import { ConfigClient } from "@/components/config/config-client";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const uid = await exigirUid();
  const [sites, carteiras, config, cotacoes] = await Promise.all([
    prisma.site.findMany({ where: { usuarioId: uid }, orderBy: { ordem: "asc" } }),
    prisma.carteira.findMany({ where: { usuarioId: uid }, orderBy: { ordem: "asc" } }),
    prisma.config.findUnique({ where: { usuarioId: uid } }),
    prisma.cotacao.findMany({ where: { usuarioId: uid } }),
  ]);
  return (
    <ConfigClient
      sitesIniciais={sites}
      carteirasIniciais={carteiras}
      configInicial={config}
      cotacoesIniciais={cotacoes}
    />
  );
}
