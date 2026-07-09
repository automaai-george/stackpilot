import { NextResponse } from "next/server";
import { put, list, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MANTER = 14; // guarda os últimos 14 backups

/**
 * Backup diário: exporta TODAS as tabelas em um JSON e sobe no Vercel Blob.
 * Protegido pelo CRON_SECRET (a Vercel envia esse token nas chamadas do cron).
 * Também aceita chamada manual com o mesmo Bearer.
 */
async function autorizado(req: Request): Promise<boolean> {
  const seg = process.env.CRON_SECRET;
  if (!seg) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${seg}`;
}

export async function GET(req: Request) {
  if (!(await autorizado(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Blob não configurado" }, { status: 500 });
  }

  const [
    usuarios, sites, carteiras, registros, dias, sessoes, metas,
    movimentacoes, torneios, cotacoes, configs, saldos,
  ] = await Promise.all([
    prisma.usuario.findMany(),
    prisma.site.findMany(),
    prisma.carteira.findMany(),
    prisma.registroDiario.findMany(),
    prisma.diaMes.findMany(),
    prisma.sessao.findMany(),
    prisma.meta.findMany(),
    prisma.movimentacao.findMany(),
    prisma.torneio.findMany(),
    prisma.cotacao.findMany(),
    prisma.config.findMany(),
    prisma.saldoCarteira.findMany(),
  ]);

  const dump = {
    versao: 1,
    geradoEm: new Date().toISOString(),
    // não incluímos senhaHash no backup por segurança
    usuarios: usuarios.map(({ senhaHash, ...u }) => {
      void senhaHash;
      return u;
    }),
    sites, carteiras, registros, dias, sessoes, metas,
    movimentacoes, torneios, cotacoes, configs, saldos,
  };

  const agora = new Date();
  const carimbo = agora.toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const nome = `backups/stackpilot-${carimbo}.json`;

  const { url } = await put(nome, JSON.stringify(dump), {
    access: "private", // exige autenticação para ler (store privado)
    contentType: "application/json",
    addRandomSuffix: true,
  });

  // limpa backups antigos (mantém os mais recentes)
  try {
    const { blobs } = await list({ prefix: "backups/" });
    const ordenados = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
    const excluir = ordenados.slice(MANTER).map((b) => b.url);
    if (excluir.length) await del(excluir);
  } catch {
    // limpeza é best-effort; não falha o backup
  }

  return NextResponse.json({
    ok: true,
    arquivo: nome,
    registros: registros.length,
    usuarios: usuarios.length,
    url,
  });
}
