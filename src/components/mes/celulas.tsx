"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { fmtUSD, parseNumInput } from "@/lib/format";

function formatar(v: number | null): string {
  return v === null ? "" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

/**
 * Célula de dinheiro editável estilo planilha: mostra o valor formatado,
 * vira input ao focar e salva automaticamente ao sair (blur) ou Enter.
 *
 * O input NÃO é controlado pelo React durante a digitação — o navegador
 * processa cada tecla nativamente (vírgula, ponto, colar etc. sempre
 * funcionam) e o texto formatado só é sincronizado fora da edição.
 */
export function MoneyCell({
  value,
  onCommit,
  className,
  placeholder = "—",
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
  className?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const focusedRef = useRef(false);

  // sincroniza o texto quando o valor muda por fora (ex.: "usar última banca")
  useEffect(() => {
    if (ref.current && !focusedRef.current) {
      ref.current.value = formatar(value);
    }
  }, [value]);

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      defaultValue={formatar(value)}
      placeholder={placeholder}
      className={cn(
        "h-8 w-24 rounded-md border border-transparent bg-transparent px-2 text-right text-sm tabular-nums outline-none transition-colors",
        "hover:border-border focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/30",
        "placeholder:text-muted-foreground/40",
        className
      )}
      onFocus={(e) => {
        focusedRef.current = true;
        // em edição, mostra o número cru com vírgula (sem separador de milhar)
        e.currentTarget.value = value === null ? "" : String(value).replace(".", ",");
        requestAnimationFrame(() => ref.current?.select());
      }}
      onBlur={(e) => {
        focusedRef.current = false;
        const parsed = parseNumInput(e.currentTarget.value);
        if (parsed !== value) {
          onCommit(parsed);
          e.currentTarget.value = formatar(parsed);
        } else {
          e.currentTarget.value = formatar(value);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") ref.current?.blur();
        if (e.key === "Escape") {
          e.currentTarget.value = value === null ? "" : String(value).replace(".", ",");
          requestAnimationFrame(() => ref.current?.blur());
        }
      }}
    />
  );
}

/** Célula de horas editável (aceita 1,5 ou 1.5) */
export function HorasCell({
  value,
  onCommit,
  className,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
  className?: string;
}) {
  return (
    <MoneyCell
      value={value}
      onCommit={onCommit}
      placeholder="—"
      className={cn("w-16 text-center", className)}
    />
  );
}

/** Valor de resultado (lucro/prejuízo) com cor */
export function Resultado({
  valor,
  mostrarZero = true,
  className,
}: {
  valor: number;
  mostrarZero?: boolean;
  className?: string;
}) {
  const [flash, setFlash] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 600);
    return () => clearTimeout(t);
  }, [valor]);

  const cor =
    valor > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : valor < 0
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground/50";

  if (valor === 0 && !mostrarZero) {
    return <span className="text-muted-foreground/40">—</span>;
  }
  return (
    <span
      className={cn(
        "tabular-nums transition-colors duration-500 font-medium",
        cor,
        flash && "bg-primary/10 rounded px-1 -mx-1",
        className
      )}
    >
      {valor > 0 ? "+" : ""}
      {fmtUSD(valor)}
    </span>
  );
}
