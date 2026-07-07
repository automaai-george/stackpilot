"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Medal, Percent, Plus, Trash2, Trophy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fmtUSD, parseNumInput } from "@/lib/format";

type TorneioT = {
  id: number;
  ano: number;
  mes: number;
  dia: number;
  siteId: number | null;
  nome: string | null;
  buyIn: number;
  premio: number;
  posicao: number | null;
  field: number | null;
};
type SiteMin = { id: number; nome: string };

function corLucro(v: number) {
  if (v > 0) return "text-emerald-600 dark:text-emerald-400";
  if (v < 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

function dataLocalHoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TorneiosClient({
  torneiosIniciais,
  sites,
  anos,
  anoAtual,
}: {
  torneiosIniciais: TorneioT[];
  sites: SiteMin[];
  anos: number[];
  anoAtual: number;
}) {
  const [torneios, setTorneios] = useState<TorneioT[]>(torneiosIniciais);
  const [ano, setAno] = useState(anoAtual);
  const [form, setForm] = useState({
    data: dataLocalHoje(),
    siteId: "0",
    nome: "",
    buyIn: "",
    premio: "",
    posicao: "",
    field: "",
  });
  const [salvando, setSalvando] = useState(false);

  const nomeSite = (id: number | null) =>
    sites.find((s) => s.id === id)?.nome ?? "—";

  const doAno = useMemo(
    () => torneios.filter((t) => ano === 0 || t.ano === ano),
    [torneios, ano]
  );

  const stats = useMemo(() => {
    const n = doAno.length;
    const investido = doAno.reduce((s, t) => s + t.buyIn, 0);
    const premiado = doAno.reduce((s, t) => s + t.premio, 0);
    const lucro = premiado - investido;
    const itm = doAno.filter((t) => t.premio > 0).length;
    return {
      n,
      investido,
      premiado,
      lucro,
      roi: investido > 0 ? (lucro / investido) * 100 : null,
      itmPct: n > 0 ? (itm / n) * 100 : null,
      abi: n > 0 ? investido / n : null,
      maiorPremio: doAno.reduce((m, t) => Math.max(m, t.premio), 0),
    };
  }, [doAno]);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const buyIn = parseNumInput(form.buyIn);
    const [a, m, d] = form.data.split("-").map(Number);
    if (!a || !m || !d || buyIn === null || buyIn <= 0) {
      toast.error("Preencha data e buy-in");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/torneios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ano: a, mes: m, dia: d,
          siteId: Number(form.siteId) || null,
          nome: form.nome,
          buyIn,
          premio: parseNumInput(form.premio) ?? 0,
          posicao: parseInt(form.posicao, 10) || null,
          field: parseInt(form.field, 10) || null,
        }),
      });
      if (!res.ok) throw new Error();
      const criado = (await res.json()) as TorneioT;
      setTorneios((prev) => [criado, ...prev]);
      setForm((f) => ({ ...f, nome: "", buyIn: "", premio: "", posicao: "", field: "" }));
    } catch {
      toast.error("Não foi possível salvar o torneio");
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: number) {
    setTorneios((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/torneios/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Não foi possível excluir");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Torneios</h1>
          <p className="text-sm text-muted-foreground">
            Cada torneio registrado refina seu ROI, ITM e o ABI real.
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant={ano === 0 ? "default" : "outline"}
            onClick={() => setAno(0)}
          >
            Tudo
          </Button>
          {anos.map((a) => (
            <Button
              key={a}
              size="sm"
              variant={a === ano ? "default" : "outline"}
              onClick={() => setAno(a)}
            >
              {a}
            </Button>
          ))}
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            t: "Lucro em torneios",
            v: (
              <span className={corLucro(stats.lucro)}>{fmtUSD(stats.lucro)}</span>
            ),
            r: `${stats.n} torneios · maior prêmio ${fmtUSD(stats.maiorPremio)}`,
          },
          {
            t: "ROI",
            v:
              stats.roi === null ? (
                "—"
              ) : (
                <span className={corLucro(stats.roi)}>
                  {stats.roi.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                </span>
              ),
            r: `investido ${fmtUSD(stats.investido)} · premiado ${fmtUSD(stats.premiado)}`,
          },
          {
            t: "ITM",
            v:
              stats.itmPct === null
                ? "—"
                : `${stats.itmPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
            r: "torneios premiados",
          },
          {
            t: "ABI real",
            v: stats.abi === null ? "—" : fmtUSD(stats.abi),
            r: "média dos buy-ins do período",
          },
        ].map((c) => (
          <Card key={c.t} className="gap-1.5 py-4">
            <CardHeader className="px-4 py-0">
              <CardDescription className="text-xs">{c.t}</CardDescription>
            </CardHeader>
            <CardContent className="px-4 py-0">
              <div className="text-xl font-semibold tabular-nums">{c.v}</div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.r}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lançar torneio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="size-4.5" />
            Lançar torneio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-center gap-2" onSubmit={adicionar}>
            <Input
              type="date"
              value={form.data}
              onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
              className="h-9 w-36"
              aria-label="Data"
            />
            <Select
              value={form.siteId}
              onValueChange={(v) => setForm((f) => ({ ...f, siteId: v }))}
            >
              <SelectTrigger size="sm" className="w-28" aria-label="Site">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Site…</SelectItem>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Nome (opcional)"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              className="h-9 min-w-36 flex-1"
            />
            <Input
              placeholder="Buy-in"
              inputMode="decimal"
              value={form.buyIn}
              onChange={(e) => setForm((f) => ({ ...f, buyIn: e.target.value }))}
              className="h-9 w-20"
              aria-label="Buy-in"
            />
            <Input
              placeholder="Prêmio"
              inputMode="decimal"
              value={form.premio}
              onChange={(e) => setForm((f) => ({ ...f, premio: e.target.value }))}
              className="h-9 w-24"
              aria-label="Prêmio"
            />
            <Input
              placeholder="Pos."
              inputMode="numeric"
              value={form.posicao}
              onChange={(e) => setForm((f) => ({ ...f, posicao: e.target.value }))}
              className="h-9 w-16"
              aria-label="Posição"
            />
            <Input
              placeholder="Field"
              inputMode="numeric"
              value={form.field}
              onChange={(e) => setForm((f) => ({ ...f, field: e.target.value }))}
              className="h-9 w-16"
              aria-label="Field"
            />
            <Button type="submit" size="sm" disabled={salvando}>
              Salvar
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Sem prêmio? Deixe em branco — conta como fora do ITM.
          </p>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card className="overflow-hidden py-0 gap-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2.5 text-left font-medium">Data</th>
                <th className="px-3 py-2.5 text-left font-medium">Site</th>
                <th className="px-3 py-2.5 text-left font-medium">Torneio</th>
                <th className="px-3 py-2.5 text-right font-medium">Buy-in</th>
                <th className="px-3 py-2.5 text-right font-medium">Prêmio</th>
                <th className="px-3 py-2.5 text-right font-medium">Resultado</th>
                <th className="px-3 py-2.5 text-right font-medium">Pos./Field</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {doAno.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    <Trophy className="mx-auto mb-2 size-6 opacity-40" />
                    Nenhum torneio registrado neste período.
                  </td>
                </tr>
              )}
              {doAno.map((t) => {
                const res = t.premio - t.buyIn;
                return (
                  <tr key={t.id} className="border-b transition-colors last:border-0 hover:bg-accent/40">
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {t.dia}/{t.mes}/{t.ano}
                    </td>
                    <td className="px-3 py-2">{nomeSite(t.siteId)}</td>
                    <td className="max-w-48 truncate px-3 py-2">
                      <span className="flex items-center gap-1.5">
                        {t.premio > 0 && t.posicao === 1 && (
                          <Medal className="size-3.5 shrink-0 text-[var(--ouro)]" />
                        )}
                        {t.nome ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtUSD(t.buyIn)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {t.premio > 0 ? fmtUSD(t.premio) : "—"}
                    </td>
                    <td className={cn("px-3 py-2 text-right font-semibold tabular-nums", corLucro(res))}>
                      {fmtUSD(res)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {t.posicao ?? "—"}
                      {t.field ? ` / ${t.field}` : ""}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        className="rounded p-1 text-muted-foreground transition-colors hover:text-red-600"
                        aria-label="Excluir torneio"
                        onClick={() => remover(t.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Percent className="size-3.5" />
        O resultado financeiro do dia continua vindo do caixa dos sites (grind) —
        os torneios são a lente de análise, sem contar em dobro.
      </p>
    </div>
  );
}
