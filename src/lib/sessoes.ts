import { prisma } from "@/lib/prisma";

export const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Horas entre dois "HH:MM"; fim menor que início = virada de dia */
export function horasEntre(inicio: string, fim: string): number {
  const [h1, m1] = inicio.split(":").map(Number);
  const [h2, m2] = fim.split(":").map(Number);
  const mins = (h2 * 60 + m2 - (h1 * 60 + m1) + 1440) % 1440;
  return Math.round((mins / 60) * 100) / 100;
}

/**
 * Recalcula DiaMes.horas somando as sessões CONCLUÍDAS do dia do usuário.
 * Só mexe nas horas quando existe ao menos uma sessão concluída.
 */
export async function recalcularHorasDoDia(
  usuarioId: number,
  ano: number,
  mes: number,
  dia: number
) {
  const sessoes = await prisma.sessao.findMany({ where: { usuarioId, ano, mes, dia } });
  const concluidas = sessoes.filter((s) => s.fim);
  if (concluidas.length === 0) return;
  const horas =
    Math.round(
      concluidas.reduce((soma, s) => soma + horasEntre(s.inicio, s.fim!), 0) * 100
    ) / 100;
  await prisma.diaMes.upsert({
    where: { usuarioId_ano_mes_dia: { usuarioId, ano, mes, dia } },
    create: { usuarioId, ano, mes, dia, jogou: true, horas },
    update: { jogou: true, horas },
  });
}
