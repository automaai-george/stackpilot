"use client";

import { Target } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fmtUSD } from "@/lib/format";
import { MoneyCell } from "@/components/mes/celulas";

export type MetaValores = {
  lucroAlvo: number | null;
  horasAlvo: number | null;
  diasAlvo: number | null;
};

function MetaBar({
  rotulo,
  feito,
  alvo,
  pace,
  formato,
  onAlvo,
  processo,
}: {
  rotulo: string;
  feito: number;
  alvo: number | null;
  pace: number; // 0..1 — onde você "deveria estar"
  formato: (v: number) => string;
  onAlvo: (v: number | null) => void;
  processo?: boolean; // metas de processo ganham status à frente/atrás
}) {
  const frac = alvo && alvo > 0 ? Math.min(feito / alvo, 1) : 0;
  const esperado = alvo ? alvo * pace : 0;
  const delta = feito - esperado;
  const batida = alvo !== null && feito >= alvo;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{rotulo}</span>
        <span className="flex items-baseline gap-1 tabular-nums">
          <span className="font-semibold">{formato(feito)}</span>
          <span className="text-muted-foreground">/</span>
          <MoneyCell
            value={alvo}
            onCommit={onAlvo}
            placeholder="definir"
            className="h-7 w-20 text-left text-sm font-medium"
          />
        </span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            batida ? "bg-emerald-500" : "bg-primary"
          )}
          style={{ width: `${frac * 100}%` }}
        />
        {alvo !== null && pace > 0 && pace < 1 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-foreground/60"
            style={{ left: `${pace * 100}%` }}
            title="onde você deveria estar hoje"
          />
        )}
      </div>
      {alvo !== null && (
        <p className="text-xs text-muted-foreground">
          {batida ? (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              Meta batida! 🏆
            </span>
          ) : processo && pace > 0 && pace < 1 ? (
            delta >= 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                {formato(Math.abs(delta))} à frente do ritmo
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">
                {formato(Math.abs(delta))} atrás do ritmo
              </span>
            )
          ) : (
            `${Math.round(frac * 100)}% da meta`
          )}
        </p>
      )}
    </div>
  );
}

export function MetasSection({
  titulo,
  meta,
  progresso,
  pace,
  projecoes,
  onMeta,
}: {
  titulo: string;
  meta: MetaValores;
  progresso: { lucro: number; horas: number; dias: number };
  pace: number;
  projecoes: { ritmo: number | null; historico: number | null; downswing: boolean } | null;
  onMeta: (campo: keyof MetaValores, v: number | null) => void;
}) {
  const semMetas =
    meta.lucroAlvo === null && meta.horasAlvo === null && meta.diasAlvo === null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="size-4.5" />
          Metas de {titulo}
        </CardTitle>
        {semMetas && (
          <CardDescription>
            Defina a meta de dias jogados (o que você controla) e, se quiser,
            uma meta de lucro como referência. Clique em &quot;definir&quot;.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
          <MetaBar
            rotulo="Dias jogados"
            feito={progresso.dias}
            alvo={meta.diasAlvo}
            pace={pace}
            formato={(v) => `${Math.round(v * 10) / 10}`}
            onAlvo={(v) => onMeta("diasAlvo", v === null ? null : Math.round(v))}
            processo
          />
          <MetaBar
            rotulo="Lucro"
            feito={progresso.lucro}
            alvo={meta.lucroAlvo}
            pace={pace}
            formato={(v) => fmtUSD(v)}
            onAlvo={(v) => onMeta("lucroAlvo", v)}
          />
        </div>

        {projecoes && (
          <div className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
            {projecoes.downswing ? (
              <>
                Mês abaixo da linha — <span className="font-medium text-foreground">foque nas horas</span>;
                seu histórico de lucro/hora cuida do resto.
                {projecoes.historico !== null && (
                  <> Cumprindo o volume, a projeção pelo seu histórico é{" "}
                    <span className="font-semibold text-foreground">
                      {fmtUSD(projecoes.historico)}
                    </span>.
                  </>
                )}
              </>
            ) : (
              <>
                Projeção de fechamento:{" "}
                {projecoes.ritmo !== null && (
                  <>
                    no ritmo deste mês{" "}
                    <span className="font-semibold text-foreground">
                      {fmtUSD(projecoes.ritmo)}
                    </span>
                  </>
                )}
                {projecoes.ritmo !== null && projecoes.historico !== null && " · "}
                {projecoes.historico !== null && (
                  <>
                    pelo seu histórico{" "}
                    <span className="font-semibold text-foreground">
                      {fmtUSD(projecoes.historico)}
                    </span>
                  </>
                )}
                {projecoes.ritmo === null && projecoes.historico === null && (
                  <>ainda sem dados suficientes neste mês (mínimo 5 dias jogados).</>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
