import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uidAtual } from "@/lib/sessao";

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Horas entre dois "HH:MM"; se o fim for menor, considera virada de dia */
function horasEntre(inicio: string, fim: string): number {
  const [h1, m1] = inicio.split(":").map(Number);
  const [h2, m2] = fim.split(":").map(Number);
  const mins = (h2 * 60 + m2 - (h1 * 60 + m1) + 1440) % 1440;
  return Math.round((mins / 60) * 100) / 100;
}

// Upsert dos dados do dia (jogou / horas / horários / nota / estado / tipo /
// estudo / checklist). Quando início e fim existem, horas são recalculadas.
export async function PUT(req: Request) {
  const uid = await uidAtual();
  if (uid === null) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const body = await req.json();
  const { ano, mes, dia } = body;
  if (![ano, mes, dia].every((v) => Number.isInteger(v))) {
    return NextResponse.json({ error: "ano, mes e dia são obrigatórios" }, { status: 400 });
  }

  const patch: {
    jogou?: boolean;
    horas?: number | null;
    horaInicio?: string | null;
    horaFim?: string | null;
    nota?: string | null;
    estado?: string | null;
    tipoJogo?: string | null;
    horasEstudo?: number | null;
    checklist?: string | null;
  } = {};
  if ("jogou" in body) patch.jogou = !!body.jogou;
  if ("horas" in body) patch.horas = body.horas;
  for (const campo of ["horaInicio", "horaFim"] as const) {
    if (campo in body) {
      const v = body[campo];
      if (v !== null && !(typeof v === "string" && HORA_RE.test(v))) {
        return NextResponse.json({ error: `${campo} deve ser HH:MM` }, { status: 400 });
      }
      patch[campo] = v;
    }
  }
  if ("nota" in body) {
    patch.nota =
      typeof body.nota === "string" && body.nota.trim() ? body.nota.trim() : null;
  }
  if ("estado" in body) {
    patch.estado = ["A", "B", "C"].includes(body.estado) ? body.estado : null;
  }
  if ("tipoJogo" in body) {
    patch.tipoJogo = ["cash", "mtt", "spin", "misto"].includes(body.tipoJogo)
      ? body.tipoJogo
      : null;
  }
  if ("horasEstudo" in body) {
    patch.horasEstudo =
      typeof body.horasEstudo === "number" && body.horasEstudo >= 0
        ? body.horasEstudo
        : null;
  }
  if ("checklist" in body) {
    const validos = ["sono", "aquecimento", "mental", "ambiente"];
    patch.checklist = Array.isArray(body.checklist)
      ? JSON.stringify(
          body.checklist.filter((c: unknown) => typeof c === "string" && validos.includes(c))
        )
      : null;
  }

  const atual = await prisma.diaMes.findUnique({
    where: { usuarioId_ano_mes_dia: { usuarioId: uid, ano, mes, dia } },
  });

  if (!("horas" in body) && ("horaInicio" in body || "horaFim" in body)) {
    const inicio = "horaInicio" in body ? patch.horaInicio : atual?.horaInicio;
    const fim = "horaFim" in body ? patch.horaFim : atual?.horaFim;
    if (inicio && fim) patch.horas = horasEntre(inicio, fim);
  }

  const diaMes = await prisma.diaMes.upsert({
    where: { usuarioId_ano_mes_dia: { usuarioId: uid, ano, mes, dia } },
    create: {
      usuarioId: uid,
      ano, mes, dia,
      jogou: patch.jogou ?? false,
      horas: patch.horas ?? null,
      horaInicio: patch.horaInicio ?? null,
      horaFim: patch.horaFim ?? null,
      nota: patch.nota ?? null,
      estado: patch.estado ?? null,
      tipoJogo: patch.tipoJogo ?? null,
      horasEstudo: patch.horasEstudo ?? null,
      checklist: patch.checklist ?? null,
    },
    update: patch,
  });
  return NextResponse.json(diaMes);
}
