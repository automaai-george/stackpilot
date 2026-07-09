// Troca o e-mail de login da conta principal (id 1) para georgejunior@live.com
// e apaga a conta vazia duplicada. Senha permanece a mesma.
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const alvo = "georgejunior@live.com";

  const duplicada = await p.usuario.findUnique({ where: { email: alvo } });
  if (duplicada && duplicada.id !== 1) {
    const sites = await p.site.count({ where: { usuarioId: duplicada.id } });
    const regs = await p.registroDiario.count({ where: { usuarioId: duplicada.id } });
    if (sites > 0 || regs > 0) {
      throw new Error(`Conta #${duplicada.id} NÃO está vazia (${sites} sites, ${regs} registros) — abortando.`);
    }
    await p.usuario.delete({ where: { id: duplicada.id } });
    console.log(`Conta vazia #${duplicada.id} (${alvo}) apagada.`);
  }

  const principal = await p.usuario.update({
    where: { id: 1 },
    data: { email: alvo, nome: "George" },
  });
  console.log(`Conta principal #1 agora loga com: ${principal.email}`);

  const conf = await p.site.count({ where: { usuarioId: 1 } });
  console.log(`Conferência: ${conf} sites continuam na conta #1.`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
