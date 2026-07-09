import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirUid } from "@/lib/sessao";
import { ConfigClient } from "@/components/config/config-client";
import { TrocarSenha } from "@/components/config/trocar-senha";
import { EH_DONO } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

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
    <div className="space-y-6">
      <ConfigClient
        sitesIniciais={sites}
        carteirasIniciais={carteiras}
        configInicial={config}
        cotacoesIniciais={cotacoes}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <TrocarSenha />
        {EH_DONO(uid) && (
          <Button variant="outline" asChild className="w-fit">
            <Link href="/admin">
              <ShieldCheck className="size-4" />
              Painel do administrador
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
