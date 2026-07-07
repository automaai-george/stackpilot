// Verificação final do teste de transferências (usuário descartável) + limpeza
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const u = await p.usuario.findUnique({
    where: { email: "transfer-teste@stackpilot.app" },
  });
  if (!u) {
    console.log("usuário de teste não existe");
    return;
  }
  const saldos = await p.saldoCarteira.findMany({
    where: { usuarioId: u.id },
    include: { carteira: true },
  });
  const movs = await p.movimentacao.findMany({
    where: { usuarioId: u.id },
    orderBy: { id: "asc" },
  });
  console.log(
    "saldos de carteira:",
    saldos.map((s) => `${s.carteira.nome} ${s.mes}/${s.ano} = ${s.valor}`)
  );
  console.log(
    "movimentações:",
    movs.map((m) => `${m.tipo} ${m.valor} (${m.descricao})`)
  );

  const del = await p.usuario.delete({ where: { id: u.id } });
  console.log(`\nusuário de teste ${del.email} apagado (cascade limpa tudo).`);
}

main().finally(() => p.$disconnect());
