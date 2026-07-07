"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  PiggyBank,
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseNumInput } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtUSD, fmtHoras } from "@/lib/format";
import {
  MESES,
  diasNoMes,
  lucroPorHora,
  resultado,
  type CarteiraT,
  type DiaT,
  type RegistroT,
  type SiteT,
} from "@/lib/calc";
import { HorasCell, MoneyCell, Resultado } from "@/components/mes/celulas";
import { LucroDiarioChart } from "@/components/mes/lucro-diario-chart";

type Reg = { bancaInicial: number | null; saldoFinal: number | null };
type Dia = { jogou: boolean; horas: number | null };
type RowT = { dia: number };
type MovT = {
  id: number; dia: number; tipo: string; valor: number; descricao: string | null;
};

const TIPOS_MOV = [
  { valor: "saque", rotulo: "Saque" },
  { valor: "deposito", rotulo: "Depósito" },
  { valor: "despesa", rotulo: "Despesa" },
];

// meta.className por coluna (alinhamento, bordas, sticky)
type ColMeta = { className?: string; headerClassName?: string };

// Dados e ações passados às células via table.options.meta (mantém colunas estáveis)
type MesMeta = {
  regs: Record<string, Reg>;
  dias: Record<number, Dia>;
  setReg: (siteId: number, dia: number, campo: keyof Reg, v: number | null) => void;
  setDia: (dia: number, patch: Partial<Dia>) => void;
};

async function putJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
}

const columnHelper = createColumnHelper<RowT>();

export function MesClient({
  ano,
  mes,
  sites,
  registrosIniciais,
  diasIniciais,
  carteiras,
  saldosIniciais,
  movimentacoesIniciais,
}: {
  ano: number;
  mes: number;
  sites: SiteT[];
  registrosIniciais: RegistroT[];
  diasIniciais: DiaT[];
  carteiras: CarteiraT[];
  saldosIniciais: { carteiraId: number; valor: number }[];
  movimentacoesIniciais: MovT[];
}) {
  const nDias = diasNoMes(ano, mes);

  const [regs, setRegs] = useState<Record<string, Reg>>(() => {
    const m: Record<string, Reg> = {};
    for (const r of registrosIniciais) {
      m[`${r.siteId}:${r.dia}`] = {
        bancaInicial: r.bancaInicial,
        saldoFinal: r.saldoFinal,
      };
    }
    return m;
  });
  const [dias, setDias] = useState<Record<number, Dia>>(() => {
    const m: Record<number, Dia> = {};
    for (const d of diasIniciais) m[d.dia] = { jogou: d.jogou, horas: d.horas };
    return m;
  });
  const [saldos, setSaldos] = useState<Record<number, number | null>>(() => {
    const m: Record<number, number | null> = {};
    for (const s of saldosIniciais) m[s.carteiraId] = s.valor;
    return m;
  });
  const [pendentes, setPendentes] = useState(0);
  const [movs, setMovs] = useState<MovT[]>(movimentacoesIniciais);
  const [novaMov, setNovaMov] = useState({ dia: "", tipo: "saque", valor: "", descricao: "" });

  // ---- Salvamento automático (otimista) ----
  function salvar(fn: () => Promise<void>) {
    setPendentes((p) => p + 1);
    fn()
      .catch(() => toast.error("Erro ao salvar — verifique a conexão"))
      .finally(() => setPendentes((p) => p - 1));
  }

  function setReg(siteId: number, dia: number, campo: keyof Reg, v: number | null) {
    setRegs((prev) => {
      const key = `${siteId}:${dia}`;
      const atual = prev[key] ?? { bancaInicial: null, saldoFinal: null };
      return { ...prev, [key]: { ...atual, [campo]: v } };
    });
    salvar(() => putJson("/api/registros", { ano, mes, dia, siteId, [campo]: v }));
  }

  function setDia(dia: number, patch: Partial<Dia>) {
    setDias((prev) => {
      const atual = prev[dia] ?? { jogou: false, horas: null };
      return { ...prev, [dia]: { ...atual, ...patch } };
    });
    salvar(() => putJson("/api/dias", { ano, mes, dia, ...patch }));
  }

  function setSaldo(carteiraId: number, v: number | null) {
    setSaldos((prev) => ({ ...prev, [carteiraId]: v }));
    salvar(() => putJson("/api/saldos", { carteiraId, ano, mes, valor: v }));
  }

  async function adicionarMov() {
    const dia = parseInt(novaMov.dia, 10);
    const valor = parseNumInput(novaMov.valor);
    if (isNaN(dia) || dia < 1 || dia > nDias || valor === null || valor <= 0) {
      toast.error("Preencha dia e valor válidos");
      return;
    }
    try {
      const res = await fetch("/api/movimentacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ano, mes, dia,
          tipo: novaMov.tipo,
          valor,
          descricao: novaMov.descricao,
        }),
      });
      if (!res.ok) throw new Error();
      const criada = (await res.json()) as MovT;
      setMovs((prev) =>
        [...prev, criada].sort((a, b) => a.dia - b.dia)
      );
      setNovaMov({ dia: "", tipo: novaMov.tipo, valor: "", descricao: "" });
    } catch {
      toast.error("Não foi possível adicionar");
    }
  }

  async function removerMov(id: number) {
    setMovs((prev) => prev.filter((m) => m.id !== id));
    try {
      const res = await fetch(`/api/movimentacoes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Não foi possível excluir");
    }
  }

  // ---- Cálculos derivados (reativos) ----
  const calc = useMemo(() => {
    const porSite = new Map<number, { lucro: number; banca: number | null }>();
    for (const s of sites) {
      let lucro = 0;
      let banca: number | null = null;
      for (let d = 1; d <= nDias; d++) {
        const r = regs[`${s.id}:${d}`];
        if (!r) continue;
        lucro += resultado(r);
        if (r.saldoFinal !== null) banca = r.saldoFinal;
      }
      porSite.set(s.id, { lucro, banca });
    }

    const lucroDiario: { dia: number; valor: number }[] = [];
    let lucroMes = 0;
    for (let d = 1; d <= nDias; d++) {
      let v = 0;
      for (const s of sites) {
        const r = regs[`${s.id}:${d}`];
        if (r) v += resultado(r);
      }
      lucroDiario.push({ dia: d, valor: v });
      lucroMes += v;
    }

    let horasMes = 0;
    let diasJogados = 0;
    for (let d = 1; d <= nDias; d++) {
      const info = dias[d];
      if (!info) continue;
      horasMes += info.horas ?? 0;
      if (info.jogou || (info.horas ?? 0) > 0) diasJogados++;
    }

    const somaBancas = [...porSite.values()].reduce((s, v) => s + (v.banca ?? 0), 0);
    const somaCarteiras = carteiras.reduce((s, c) => s + (saldos[c.id] ?? 0), 0);

    return {
      porSite,
      lucroDiario,
      lucroMes,
      horasMes,
      diasJogados,
      lph: lucroPorHora(lucroMes, horasMes),
      somaBancas,
      somaCarteiras,
      bancaTotal: somaBancas + somaCarteiras,
    };
  }, [regs, dias, saldos, sites, carteiras, nDias]);

  // ---- TanStack Table ----
  const data = useMemo<RowT[]>(
    () => Array.from({ length: nDias }, (_, i) => ({ dia: i + 1 })),
    [nDias]
  );

  const columns = useMemo(
    () => [
      columnHelper.group({
        id: "dia-info",
        header: () => "Dia / Horas",
        meta: {
          headerClassName:
            "sticky left-0 z-20 border-r bg-muted px-3 text-left",
        } satisfies ColMeta,
        columns: [
          columnHelper.display({
            id: "dia",
            header: () => "Dia",
            meta: {
              className:
                "sticky left-0 z-10 bg-card w-10 text-center font-medium text-muted-foreground",
              headerClassName: "sticky left-0 z-20 bg-muted/95 text-center",
            } satisfies ColMeta,
            cell: ({ row }) => row.original.dia,
          }),
          columnHelper.display({
            id: "jogou",
            header: () => "Jogou",
            meta: { className: "text-center", headerClassName: "text-center" },
            cell: ({ row, table }) => {
              const m = table.options.meta as MesMeta;
              return (
                <Checkbox
                  checked={m.dias[row.original.dia]?.jogou ?? false}
                  aria-label={`Jogou dia ${row.original.dia}`}
                  onCheckedChange={(v) =>
                    m.setDia(row.original.dia, { jogou: v === true })
                  }
                />
              );
            },
          }),
          columnHelper.display({
            id: "horas",
            header: () => "Horas",
            meta: {
              className: "border-r text-center",
              headerClassName: "border-r text-center",
            } satisfies ColMeta,
            cell: ({ row, table }) => {
              const m = table.options.meta as MesMeta;
              return (
                <HorasCell
                  value={m.dias[row.original.dia]?.horas ?? null}
                  onCommit={(v) => m.setDia(row.original.dia, { horas: v })}
                />
              );
            },
          }),
        ],
      }),
      ...sites.map((s) =>
        columnHelper.group({
          id: `site-${s.id}`,
          header: () => s.nome,
          meta: {
            headerClassName: "border-r text-center last:border-r-0",
          } satisfies ColMeta,
          columns: [
            columnHelper.display({
              id: `s${s.id}-banca`,
              header: () => "Banca inicial",
              meta: { className: "text-right", headerClassName: "text-right" },
              cell: ({ row, table }) => {
                const m = table.options.meta as MesMeta;
                return (
                  <MoneyCell
                    value={m.regs[`${s.id}:${row.original.dia}`]?.bancaInicial ?? null}
                    onCommit={(v) => m.setReg(s.id, row.original.dia, "bancaInicial", v)}
                  />
                );
              },
            }),
            columnHelper.display({
              id: `s${s.id}-saldo`,
              header: () => "Saldo final",
              meta: { className: "text-right", headerClassName: "text-right" },
              cell: ({ row, table }) => {
                const m = table.options.meta as MesMeta;
                return (
                  <MoneyCell
                    value={m.regs[`${s.id}:${row.original.dia}`]?.saldoFinal ?? null}
                    onCommit={(v) => m.setReg(s.id, row.original.dia, "saldoFinal", v)}
                  />
                );
              },
            }),
            columnHelper.display({
              id: `s${s.id}-res`,
              header: () => "Resultado",
              meta: {
                className: "border-r px-3 text-right last:border-r-0",
                headerClassName: "border-r text-right last:border-r-0",
              } satisfies ColMeta,
              cell: ({ row, table }) => {
                const m = table.options.meta as MesMeta;
                const r = m.regs[`${s.id}:${row.original.dia}`];
                const res = r ? resultado(r) : 0;
                return <Resultado valor={res} mostrarZero={false} className="text-sm" />;
              },
            }),
          ],
        })
      ),
    ],
    // IMPORTANTE: as colunas só dependem de `sites`. Os dados (regs/dias)
    // chegam nas células via table.options.meta — assim as células nunca são
    // remontadas durante a digitação e o foco não se perde.
    [sites]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: { regs, dias, setReg, setDia } satisfies MesMeta,
  });

  const prev = mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 };
  const next = mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild aria-label="Mês anterior">
            <Link href={`/mes/${prev.ano}/${prev.mes}`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="min-w-40 text-center text-2xl font-semibold tracking-tight">
            {MESES[mes - 1]} <span className="text-muted-foreground">{ano}</span>
          </h1>
          <Button variant="outline" size="icon" asChild aria-label="Próximo mês">
            <Link href={`/mes/${next.ano}/${next.mes}`}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/relatorio/${ano}/${mes}`}>
              <FileText className="size-4" />
              Relatório
            </Link>
          </Button>
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              pendentes > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
            )}
          >
            {pendentes > 0 ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Salvando…
              </>
            ) : (
              <>
                <CheckCircle2 className="size-3.5 text-emerald-500" /> Tudo salvo
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cards de resumo (reativos) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ResumoCard
          titulo="Lucro do mês"
          icone={<TrendingUp className="size-4" />}
          valor={<Resultado valor={calc.lucroMes} className="text-xl" />}
        />
        <ResumoCard
          titulo="Banca total do mês"
          icone={<PiggyBank className="size-4" />}
          valor={
            <span className="text-xl font-semibold tabular-nums">
              {fmtUSD(calc.bancaTotal)}
            </span>
          }
          rodape={`Sites ${fmtUSD(calc.somaBancas)} + carteiras ${fmtUSD(calc.somaCarteiras)}`}
        />
        <ResumoCard
          titulo="Horas jogadas"
          icone={<Clock className="size-4" />}
          valor={
            <span className="text-xl font-semibold tabular-nums">
              {fmtHoras(calc.horasMes)}
            </span>
          }
          rodape={`${calc.diasJogados} ${calc.diasJogados === 1 ? "dia jogado" : "dias jogados"}`}
        />
        <ResumoCard
          titulo="Lucro por hora"
          icone={<TrendingUp className="size-4" />}
          valor={
            calc.lph === null ? (
              <span className="text-xl font-semibold text-muted-foreground">—</span>
            ) : (
              <Resultado valor={calc.lph} className="text-xl" />
            )
          }
        />
      </div>

      {/* Tabela estilo planilha (TanStack Table) */}
      <Card className="overflow-hidden py-0 gap-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              {table.getHeaderGroups().map((hg, i) => (
                <tr
                  key={hg.id}
                  className={cn(
                    "border-b",
                    i === 0
                      ? "bg-muted/60 text-xs font-semibold uppercase tracking-wider"
                      : "bg-muted/40 text-xs text-muted-foreground"
                  )}
                >
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      colSpan={h.colSpan}
                      className={cn(
                        "px-2 py-2 font-medium",
                        (h.column.columnDef.meta as ColMeta | undefined)
                          ?.headerClassName
                      )}
                    >
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => {
                const info = dias[row.original.dia];
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b transition-colors hover:bg-accent/40",
                      (info?.jogou || (info?.horas ?? 0) > 0) &&
                        "bg-primary/[0.03]"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn(
                          "px-1 py-0.5",
                          (cell.column.columnDef.meta as ColMeta | undefined)
                            ?.className
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/60 text-sm font-medium">
              <tr className="border-t">
                <td
                  colSpan={3}
                  className="sticky left-0 z-10 border-r bg-muted px-3 py-2 text-right text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Lucro Total
                </td>
                {sites.map((s) => (
                  <td
                    key={s.id}
                    colSpan={3}
                    className="border-r px-3 py-2 text-right last:border-r-0"
                  >
                    <Resultado valor={calc.porSite.get(s.id)?.lucro ?? 0} />
                  </td>
                ))}
              </tr>
              <tr className="border-t">
                <td
                  colSpan={3}
                  className="sticky left-0 z-10 border-r bg-muted px-3 py-2 text-right text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Banca
                </td>
                {sites.map((s) => {
                  const banca = calc.porSite.get(s.id)?.banca;
                  return (
                    <td
                      key={s.id}
                      colSpan={3}
                      className="border-r px-3 py-2 text-right tabular-nums last:border-r-0"
                    >
                      {banca === null || banca === undefined ? (
                        <span className="text-muted-foreground/50">—</span>
                      ) : (
                        fmtUSD(banca)
                      )}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Carteiras + gráfico do mês */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-4.5" />
              Carteiras do mês
            </CardTitle>
            <CardDescription>
              Saldos externos somados na banca total.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {carteiras.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma carteira cadastrada — adicione em Configurações.
              </p>
            )}
            {carteiras.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-accent/40"
              >
                <span className="text-sm">{c.nome}</span>
                <MoneyCell
                  value={saldos[c.id] ?? null}
                  onCommit={(v) => setSaldo(c.id, v)}
                  className="w-28"
                />
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t px-2 pt-3 text-sm font-semibold">
              <span>Total carteiras</span>
              <span className="tabular-nums">{fmtUSD(calc.somaCarteiras)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Lucro diário</CardTitle>
            <CardDescription>
              Resultado somado de todos os sites, dia a dia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LucroDiarioChart data={calc.lucroDiario} />
          </CardContent>
        </Card>
      </div>

      {/* Movimentações: saques, depósitos e despesas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="size-4.5" />
            Movimentações do mês
          </CardTitle>
          <CardDescription>
            Saques, depósitos e despesas (aulas, softwares…) — separados do
            resultado de jogo. Aparecem no Dashboard e no Relatório.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {movs.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent/40"
            >
              <span className="w-12 text-muted-foreground">dia {m.dia}</span>
              <Badge
                variant="secondary"
                className={cn(
                  m.tipo === "saque" &&
                    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  m.tipo === "despesa" && "bg-red-500/10 text-red-600 dark:text-red-400"
                )}
              >
                {TIPOS_MOV.find((t) => t.valor === m.tipo)?.rotulo ?? m.tipo}
              </Badge>
              <span className="font-semibold tabular-nums">{fmtUSD(m.valor)}</span>
              <span className="truncate text-muted-foreground">{m.descricao}</span>
              <button
                className="ml-auto rounded p-1 text-muted-foreground transition-colors hover:text-red-600"
                aria-label="Excluir movimentação"
                onClick={() => removerMov(m.id)}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {movs.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma movimentação lançada neste mês.
            </p>
          )}
          <form
            className="flex flex-wrap items-center gap-2 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              adicionarMov();
            }}
          >
            <Input
              placeholder="Dia"
              inputMode="numeric"
              value={novaMov.dia}
              onChange={(e) => setNovaMov((p) => ({ ...p, dia: e.target.value }))}
              className="h-9 w-16"
              aria-label="Dia da movimentação"
            />
            <Select
              value={novaMov.tipo}
              onValueChange={(v) => setNovaMov((p) => ({ ...p, tipo: v }))}
            >
              <SelectTrigger size="sm" className="w-28" aria-label="Tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_MOV.map((t) => (
                  <SelectItem key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Valor"
              inputMode="decimal"
              value={novaMov.valor}
              onChange={(e) => setNovaMov((p) => ({ ...p, valor: e.target.value }))}
              className="h-9 w-24"
              aria-label="Valor"
            />
            <Input
              placeholder="Descrição (opcional)"
              value={novaMov.descricao}
              onChange={(e) => setNovaMov((p) => ({ ...p, descricao: e.target.value }))}
              className="h-9 min-w-40 flex-1"
              aria-label="Descrição"
            />
            <Button type="submit" size="sm">
              <Plus className="size-4" />
              Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ResumoCard({
  titulo,
  icone,
  valor,
  rodape,
}: {
  titulo: string;
  icone: React.ReactNode;
  valor: React.ReactNode;
  rodape?: string;
}) {
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4 py-0">
        <CardDescription className="flex items-center gap-1.5 text-xs">
          {icone}
          {titulo}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 py-0">
        {valor}
        {rodape && (
          <p className="mt-1 truncate text-xs text-muted-foreground">{rodape}</p>
        )}
      </CardContent>
    </Card>
  );
}
