// Tipos e cálculos derivados — tudo calculado dinamicamente, nada armazenado.

export type SiteT = {
  id: number;
  nome: string;
  ativo: boolean;
  ordem: number;
  moeda?: string; // USD | EUR | BRL
};

/** mapa moeda -> quantos USD vale 1 unidade (USD = 1) */
export type CotacaoMap = Record<string, number>;

export function paraUSD(
  valor: number,
  moeda: string | undefined,
  cotacoes: CotacaoMap
): number {
  if (!moeda || moeda === "USD") return valor;
  return valor * (cotacoes[moeda] ?? 1);
}

export const SIMBOLO_MOEDA: Record<string, string> = {
  USD: "US$",
  EUR: "€",
  BRL: "R$",
};
export type RegistroT = {
  siteId: number;
  ano: number;
  mes: number;
  dia: number;
  bancaInicial: number | null;
  saldoFinal: number | null;
};
export type DiaT = { dia: number; jogou: boolean; horas: number | null };
export type CarteiraT = { id: number; nome: string; ativo: boolean; ordem: number };
export type SaldoT = { carteiraId: number; valor: number };

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

export const MESES_CURTO = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
] as const;

export function diasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

/**
 * resultado = saldoFinal - bancaInicial.
 * Como na planilha, célula vazia conta como 0 (ex.: só saldo final preenchido
 * = depósito/ganho integral). Linha totalmente vazia = 0.
 */
export function resultado(r: {
  bancaInicial: number | null;
  saldoFinal: number | null;
}): number {
  if (r.bancaInicial === null && r.saldoFinal === null) return 0;
  return (r.saldoFinal ?? 0) - (r.bancaInicial ?? 0);
}

/** Lucro total de um conjunto de registros */
export function lucroTotal(regs: RegistroT[]): number {
  return regs.reduce((s, r) => s + resultado(r), 0);
}

/** Banca de um site = último saldoFinal não nulo (ordem cronológica) */
export function bancaSite(regs: RegistroT[], siteId: number): number | null {
  let best: RegistroT | null = null;
  for (const r of regs) {
    if (r.siteId !== siteId || r.saldoFinal === null) continue;
    if (
      !best ||
      r.ano > best.ano ||
      (r.ano === best.ano && (r.mes > best.mes || (r.mes === best.mes && r.dia > best.dia)))
    ) {
      best = r;
    }
  }
  return best ? best.saldoFinal : null;
}

export function horasTotais(dias: DiaT[]): number {
  return dias.reduce((s, d) => s + (d.horas ?? 0), 0);
}

export function diasJogados(dias: DiaT[]): number {
  return dias.filter((d) => d.jogou || (d.horas ?? 0) > 0).length;
}

/** Lucro por hora, protegido contra divisão por zero */
export function lucroPorHora(lucro: number, horas: number): number | null {
  if (horas <= 0) return null;
  return lucro / horas;
}
