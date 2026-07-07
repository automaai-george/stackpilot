// Converte horaInicio/horaFim antigos do DiaMes em linhas de Sessao (uma vez)
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const dias = await p.diaMes.findMany({
    where: { horaInicio: { not: null }, horaFim: { not: null } },
  });
  console.log(`dias com horário legado: ${dias.length}`);
  for (const d of dias) {
    const existe = await p.sessao.findFirst({
      where: { ano: d.ano, mes: d.mes, dia: d.dia },
    });
    if (!existe && d.horaInicio && d.horaFim) {
      await p.sessao.create({
        data: { ano: d.ano, mes: d.mes, dia: d.dia, inicio: d.horaInicio, fim: d.horaFim },
      });
      console.log(`sessão criada: ${d.dia}/${d.mes}/${d.ano} ${d.horaInicio}-${d.horaFim}`);
    }
  }
  console.log("sessões no banco:", await p.sessao.count());
}

main().finally(() => p.$disconnect());
