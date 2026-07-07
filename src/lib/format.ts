// Dólar com números no estilo brasileiro: US$ 1.234,56
const usd = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export function fmtUSD(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return usd.format(v);
}

export function fmtHoras(h: number | null | undefined): string {
  if (!h) return "0h";
  const inteiro = Math.floor(h);
  const min = Math.round((h - inteiro) * 60);
  return min > 0 ? `${inteiro}h${String(min).padStart(2, "0")}` : `${inteiro}h`;
}

/** Aceita "1.234,56", "1234,56" ou "1234.56" e devolve o número (ou null se vazio/inválido) */
export function parseNumInput(raw: string): number | null {
  const s = raw.trim();
  if (s === "") return null;
  let t = s.replace(/US\$|R\$|U\$|[$\s]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

/** Classe de cor para lucro/prejuízo */
export function corResultado(v: number): string {
  if (v > 0) return "text-emerald-600 dark:text-emerald-400";
  if (v < 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}
