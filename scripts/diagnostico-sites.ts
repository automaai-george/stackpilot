// Diagnóstico: usuários, seus sites e o dia 8/7/2026
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const usuarios = await p.usuario.findMany({
    include: { sites: { select: { nome: true, ativo: true } } },
  });
  for (const u of usuarios) {
    const ativos = u.sites.filter((s) => s.ativo).length;
    console.log(
      `#${u.id} ${u.email} — ${u.sites.length} sites (${ativos} ativos)`
    );
    const dia = await p.diaMes.findFirst({
      where: { usuarioId: u.id, ano: 2026, mes: 7, dia: 8 },
    });
    if (dia) console.log(`   dia 8/7: jogou=${dia.jogou}, horas=${dia.horas}`);
    const sess = await p.sessao.count({
      where: { usuarioId: u.id, ano: 2026, mes: 7, dia: 8 },
    });
    if (sess) console.log(`   sessões dia 8/7: ${sess}`);
  }
}

main().finally(() => p.$disconnect());
