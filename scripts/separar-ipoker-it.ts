// Separa o IPOKER da Itália (2024) do IPOKER atual: move os registros de
// 2024 para um novo site "IPOKER IT" (inativo). Pode rodar mais de uma vez.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const ipoker = await prisma.site.findFirst({
    where: { nome: { equals: "IPOKER" } },
  });
  if (!ipoker) {
    console.log("Site IPOKER não encontrado — nada a fazer.");
    return;
  }

  let ipokerIt = await prisma.site.findFirst({
    where: { nome: { equals: "IPOKER IT" } },
  });
  if (!ipokerIt) {
    const max = await prisma.site.aggregate({ _max: { ordem: true } });
    ipokerIt = await prisma.site.create({
      data: { nome: "IPOKER IT", ativo: false, ordem: (max._max.ordem ?? -1) + 1 },
    });
    console.log(`Criado site "IPOKER IT" (id ${ipokerIt.id}, inativo).`);
  }

  const movidos = await prisma.registroDiario.updateMany({
    where: { siteId: ipoker.id, ano: 2024 },
    data: { siteId: ipokerIt.id },
  });
  console.log(`Registros de 2024 movidos IPOKER -> IPOKER IT: ${movidos.count}`);

  const l2024 = await prisma.registroDiario.aggregate({
    where: { siteId: ipokerIt.id },
    _count: true,
  });
  const l2026 = await prisma.registroDiario.aggregate({
    where: { siteId: ipoker.id },
    _count: true,
  });
  console.log(`IPOKER IT agora tem ${l2024._count} registros; IPOKER ficou com ${l2026._count}.`);
}

main().finally(() => prisma.$disconnect());
