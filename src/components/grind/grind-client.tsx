"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  EyeOff,
  Flag,
  Flame,
  Loader2,
  NotebookPen,
  Play,
  Plus,
  Square,
  Target,
  Trash2,
  Wallet,
} from "lucide-react";
import { TransferirDialog } from "@/components/transferir/transferir-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fmtUSD, fmtHoras } from "@/lib/format";
import { resultado } from "@/lib/calc";
import { MoneyCell, Resultado } from "@/components/mes/celulas";

type Reg = { bancaInicial: number | null; saldoFinal: number | null };
type DiaInfo = {
  jogou: boolean;
  horas: number | null;
  nota: string | null;
  estado: string | null;
  tipoJogo: string | null;
  horasEstudo: number | null;
  checklist: string[];
};

const ITENS_CHECKLIST = [
  { id: "sono", rotulo: "Dormi bem" },
  { id: "aquecimento", rotulo: "Aqueci / revisei o jogo" },
  { id: "mental", rotulo: "Mente limpa, sem tilt pendente" },
  { id: "ambiente", rotulo: "Ambiente pronto, sem distrações" },
];
type SessaoT = { id: number; inicio: string; fim: string | null };
type GrindData = {
  sites: { id: number; nome: string; moeda: string; bancaAnterior: number | null }[];
  registros: Record<number, Reg>;
  dia: DiaInfo | null;
  sessoes: SessaoT[];
  metaMes: { lucroAlvo: number | null; horasAlvo: number | null; diasAlvo: number | null } | null;
  progressoMes: { horasMes: number; diasJogadosMes: number; diasNoMes: number };
  buyins: { abi: number; total: number; min: number; teto: number } | null;
};
type DataSel = { ano: number; mes: number; dia: number };

const DIA_VAZIO: DiaInfo = {
  jogou: false, horas: null, nota: null, estado: null, tipoJogo: null,
  horasEstudo: null, checklist: [],
};

const TIPOS_JOGO = [
  { valor: "cash", rotulo: "Cash" },
  { valor: "mtt", rotulo: "MTT" },
  { valor: "spin", rotulo: "Spins" },
  { valor: "misto", rotulo: "Misto" },
];

async function reqJson(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function hoje(): DataSel {
  const d = new Date();
  return { ano: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate() };
}

function mesmaData(a: DataSel, b: DataSel) {
  return a.ano === b.ano && a.mes === b.mes && a.dia === b.dia;
}

function somarDias(d: DataSel, n: number): DataSel {
  const dt = new Date(d.ano, d.mes - 1, d.dia + n);
  return { ano: dt.getFullYear(), mes: dt.getMonth() + 1, dia: dt.getDate() };
}

function nomeDaData(d: DataSel) {
  return new Date(d.ano, d.mes - 1, d.dia).toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function agoraHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Horas entre dois "HH:MM"; fim menor = virada de dia */
function horasEntre(inicio: string, fim: string): number {
  const [h1, m1] = inicio.split(":").map(Number);
  const [h2, m2] = fim.split(":").map(Number);
  const mins = (h2 * 60 + m2 - (h1 * 60 + m1) + 1440) % 1440;
  return Math.round((mins / 60) * 100) / 100;
}

export function GrindClient() {
  const [dataSel, setDataSel] = useState<DataSel | null>(null);
  const [dados, setDados] = useState<GrindData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [pendentes, setPendentes] = useState(0);
  const [agora, setAgora] = useState(""); // relógio do cronômetro
  const [recapAberto, setRecapAberto] = useState(false);
  const [esconderValores, setEsconderValores] = useState(false);
  const [transferindo, setTransferindo] = useState(false);

  useEffect(() => {
    setDataSel(hoje());
  }, []);

  // relógio para a sessão em andamento
  useEffect(() => {
    setAgora(agoraHHMM());
    const t = setInterval(() => setAgora(agoraHHMM()), 30_000);
    return () => clearInterval(t);
  }, []);

  const carregar = useCallback(async (d: DataSel) => {
    setCarregando(true);
    try {
      const res = await fetch(`/api/grind?ano=${d.ano}&mes=${d.mes}&dia=${d.dia}`);
      setDados(await res.json());
    } catch {
      toast.error("Não foi possível carregar o dia");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (dataSel) carregar(dataSel);
  }, [dataSel, carregar]);

  function salvar(fn: () => Promise<unknown>) {
    setPendentes((p) => p + 1);
    return fn()
      .catch(() => toast.error("Erro ao salvar — verifique a conexão"))
      .finally(() => setPendentes((p) => p - 1));
  }

  function setReg(siteId: number, campo: keyof Reg, v: number | null) {
    if (!dataSel || !dados) return;
    setDados((prev) => {
      if (!prev) return prev;
      const atual = prev.registros[siteId] ?? { bancaInicial: null, saldoFinal: null };
      return {
        ...prev,
        registros: { ...prev.registros, [siteId]: { ...atual, [campo]: v } },
        dia: { ...(prev.dia ?? DIA_VAZIO), jogou: true },
      };
    });
    salvar(() => reqJson("/api/registros", "PUT", { ...dataSel, siteId, [campo]: v }));
    if (!dados.dia?.jogou) {
      salvar(() => reqJson("/api/dias", "PUT", { ...dataSel, jogou: true }));
    }
  }

  function setDiaCampo(patch: Partial<DiaInfo>) {
    if (!dataSel) return;
    setDados((prev) =>
      prev ? { ...prev, dia: { ...(prev.dia ?? DIA_VAZIO), jogou: true, ...patch } } : prev
    );
    salvar(() => reqJson("/api/dias", "PUT", { ...dataSel, jogou: true, ...patch }));
  }

  // checklist pré-sessão: salva SEM marcar o dia como jogado
  function alternarChecklist(id: string) {
    if (!dataSel || !dados) return;
    const atual = dados.dia?.checklist ?? [];
    const novo = atual.includes(id) ? atual.filter((c) => c !== id) : [...atual, id];
    setDados((prev) =>
      prev ? { ...prev, dia: { ...(prev.dia ?? DIA_VAZIO), checklist: novo } } : prev
    );
    salvar(() => reqJson("/api/dias", "PUT", { ...dataSel, checklist: novo }));
  }

  // ---- Sessões ----
  const sessaoAberta = dados?.sessoes.find((s) => s.fim === null) ?? null;

  function recalcHorasLocal(sessoes: SessaoT[], atual: DiaInfo | null): DiaInfo {
    const concluidas = sessoes.filter((s) => s.fim);
    const base = atual ?? DIA_VAZIO;
    if (concluidas.length === 0) return { ...base, jogou: true };
    const horas =
      Math.round(concluidas.reduce((s, x) => s + horasEntre(x.inicio, x.fim!), 0) * 100) / 100;
    return { ...base, jogou: true, horas };
  }

  async function iniciarSessao() {
    if (!dataSel) return;
    const inicio = agoraHHMM();
    const criada = (await salvar(() =>
      reqJson("/api/sessoes", "POST", { ...dataSel, inicio })
    )) as SessaoT | undefined;
    if (!criada) return;
    setDados((prev) =>
      prev
        ? {
            ...prev,
            sessoes: [...prev.sessoes, criada],
            dia: { ...(prev.dia ?? DIA_VAZIO), jogou: true },
          }
        : prev
    );
  }

  async function adicionarSessaoManual() {
    if (!dataSel) return;
    const inicio = agoraHHMM();
    const criada = (await salvar(() =>
      reqJson("/api/sessoes", "POST", { ...dataSel, inicio, fim: inicio })
    )) as SessaoT | undefined;
    if (!criada) return;
    setDados((prev) => {
      if (!prev) return prev;
      const sessoes = [...prev.sessoes, criada];
      return { ...prev, sessoes, dia: recalcHorasLocal(sessoes, prev.dia) };
    });
  }

  function atualizarSessao(id: number, patch: { inicio?: string; fim?: string | null }) {
    setDados((prev) => {
      if (!prev) return prev;
      const sessoes = prev.sessoes.map((s) => (s.id === id ? { ...s, ...patch } : s));
      return { ...prev, sessoes, dia: recalcHorasLocal(sessoes, prev.dia) };
    });
    salvar(() => reqJson(`/api/sessoes/${id}`, "PATCH", patch));
  }

  function removerSessao(id: number) {
    setDados((prev) => {
      if (!prev) return prev;
      const sessoes = prev.sessoes.filter((s) => s.id !== id);
      return { ...prev, sessoes, dia: recalcHorasLocal(sessoes, prev.dia) };
    });
    salvar(() => reqJson(`/api/sessoes/${id}`, "DELETE"));
  }

  function iniciarGrind() {
    if (!dataSel) return;
    setDados((prev) =>
      prev ? { ...prev, dia: { ...(prev.dia ?? DIA_VAZIO), jogou: true } } : prev
    );
    salvar(() => reqJson("/api/dias", "PUT", { ...dataSel, jogou: true }));
    // hoje, já liga o cronômetro
    if (mesmaData(dataSel, hoje())) void iniciarSessao();
  }

  // ---- Totais do dia ----
  const totais = useMemo(() => {
    if (!dados) return { resultado: 0, emJogo: 0, fechados: 0 };
    let res = 0;
    let emJogo = 0;
    let fechados = 0;
    for (const s of dados.sites) {
      const r = dados.registros[s.id];
      if (!r || (r.bancaInicial === null && r.saldoFinal === null)) continue;
      if (r.saldoFinal === null) emJogo++;
      else fechados++;
      res += resultado(r);
    }
    return { resultado: res, emJogo, fechados };
  }, [dados]);

  // ---- Saúde da banca em buy-ins ----
  const saude = useMemo(() => {
    if (!dados?.buyins) return null;
    const { abi, total, min, teto } = dados.buyins;
    const buyins = total / abi;
    return {
      buyins,
      abi,
      curta: buyins < min,
      acima: buyins > teto,
      min,
      teto,
    };
  }, [dados]);

  if (!dataSel) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  const ehHoje = mesmaData(dataSel, hoje());
  const iniciado =
    !!dados &&
    (dados.dia?.jogou ||
      dados.sessoes.length > 0 ||
      Object.values(dados.registros).some(
        (r) => r.bancaInicial !== null || r.saldoFinal !== null
      ));

  return (
    <div className="space-y-6">
      {/* Cabeçalho com a data */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Dia anterior"
            onClick={() => setDataSel(somarDias(dataSel, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="min-w-56 text-center">
            <h1 className="text-xl font-semibold capitalize tracking-tight sm:text-2xl">
              {nomeDaData(dataSel)}
            </h1>
            <p className="text-xs text-muted-foreground">
              {ehHoje ? "hoje" : `${dataSel.dia}/${dataSel.mes}/${dataSel.ano}`}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Próximo dia"
            onClick={() => setDataSel(somarDias(dataSel, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          {!ehHoje && (
            <Button variant="secondary" size="sm" onClick={() => setDataSel(hoje())}>
              <CalendarDays className="size-4" />
              Hoje
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setTransferindo(true)}>
            <ArrowLeftRight className="size-4" />
            Depósito / Saque
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

      <TransferirDialog
        aberto={transferindo}
        onFechar={() => setTransferindo(false)}
        onSucesso={() => dataSel && carregar(dataSel)}
      />

      {carregando || !dados ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : !iniciado ? (
        <Card className="py-14">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <Flame className="size-8" />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Pronto para o grind{ehHoje ? " de hoje" : ""}?
              </h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Ao iniciar, o cronômetro da sessão já começa a contar e você
                lança a banca inicial de cada site. No fim do dia, encerre a
                sessão e feche os saldos — o mês inteiro se atualiza sozinho.
              </p>
            </div>

            {/* checklist pré-sessão */}
            <div className="grid w-full max-w-md gap-1.5 text-left">
              {ITENS_CHECKLIST.map((item) => {
                const marcado = dados.dia?.checklist?.includes(item.id) ?? false;
                return (
                  <button
                    key={item.id}
                    onClick={() => alternarChecklist(item.id)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                      marcado
                        ? "border-emerald-500/40 bg-emerald-500/10 text-foreground"
                        : "text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4.5 items-center justify-center rounded border",
                        marcado && "border-emerald-500 bg-emerald-500 text-white"
                      )}
                    >
                      {marcado && <Check className="size-3" />}
                    </span>
                    {item.rotulo}
                  </button>
                );
              })}
            </div>

            <Button size="lg" className="mt-1 px-8" onClick={iniciarGrind}>
              <Play className="size-4" />
              Iniciar grind
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumo do dia */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="gap-1.5 py-4">
              <CardHeader className="px-4 py-0">
                <CardDescription className="text-xs">Resultado do dia</CardDescription>
              </CardHeader>
              <CardContent className="px-4 py-0">
                <Resultado valor={totais.resultado} className="text-xl" />
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {totais.emJogo > 0
                    ? `${totais.emJogo} site${totais.emJogo > 1 ? "s" : ""} em jogo`
                    : `${totais.fechados} fechado${totais.fechados === 1 ? "" : "s"}`}
                </p>
              </CardContent>
            </Card>

            {/* Sessões / cronômetro */}
            <Card
              className={cn(
                "gap-1.5 py-4 lg:col-span-2",
                sessaoAberta && "border-emerald-500/50"
              )}
            >
              <CardHeader className="px-4 py-0">
                <CardDescription className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5" /> Sessões
                    {dados.dia?.horas ? ` · ${fmtHoras(dados.dia.horas)} no dia` : ""}
                  </span>
                  {sessaoAberta ? (
                    <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                      {fmtHoras(horasEntre(sessaoAberta.inicio, agora))} em curso
                    </span>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5 px-4 py-0">
                {dados.sessoes.map((s) => (
                  <div key={s.id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="time"
                      value={s.inicio}
                      onChange={(e) =>
                        e.target.value && atualizarSessao(s.id, { inicio: e.target.value })
                      }
                      className="h-8 rounded-md border border-input bg-background px-1.5 text-xs tabular-nums outline-none focus:border-ring"
                      aria-label="Início da sessão"
                    />
                    <span className="text-muted-foreground">–</span>
                    {s.fim === null ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 px-2 text-xs"
                        onClick={() => atualizarSessao(s.id, { fim: agoraHHMM() })}
                      >
                        <Square className="size-3" />
                        Encerrar
                      </Button>
                    ) : (
                      <input
                        type="time"
                        value={s.fim}
                        onChange={(e) =>
                          e.target.value && atualizarSessao(s.id, { fim: e.target.value })
                        }
                        className="h-8 rounded-md border border-input bg-background px-1.5 text-xs tabular-nums outline-none focus:border-ring"
                        aria-label="Fim da sessão"
                      />
                    )}
                    {s.fim && (
                      <span className="ml-1 text-xs tabular-nums text-muted-foreground">
                        {fmtHoras(horasEntre(s.inicio, s.fim))}
                      </span>
                    )}
                    <button
                      className="ml-auto rounded p-1 text-muted-foreground transition-colors hover:text-red-600"
                      aria-label="Excluir sessão"
                      onClick={() => removerSessao(s.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-1.5 pt-1">
                  {!sessaoAberta && (
                    <Button size="sm" className="h-8 text-xs" onClick={iniciarSessao}>
                      <Play className="size-3" />
                      Iniciar sessão
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={adicionarSessaoManual}
                  >
                    <Plus className="size-3" />
                    manual
                  </Button>
                  {dados.sessoes.length === 0 && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      ou digite as horas:
                      <MoneyCell
                        value={dados.dia?.horas ?? null}
                        onCommit={(v) => setDiaCampo({ horas: v })}
                        placeholder="0"
                        className="h-8 w-14 text-left text-xs"
                      />
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Saúde da banca em buy-ins */}
            <Card
              className={cn(
                "gap-1.5 py-4",
                saude?.curta && "border-amber-400/60",
                saude?.acima && "border-sky-400/60"
              )}
            >
              <CardHeader className="px-4 py-0">
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <Target className="size-3.5" /> Banca em buy-ins
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 py-0">
                {!saude ? (
                  <p className="text-xs text-muted-foreground">
                    Defina seu Average Buy-in no{" "}
                    <Link href="/bankroll" className="underline hover:text-foreground">
                      Bankroll
                    </Link>
                    .
                  </p>
                ) : (
                  <>
                    <div
                      className={cn(
                        "text-xl font-semibold tabular-nums",
                        saude.curta
                          ? "text-amber-600 dark:text-amber-400"
                          : saude.acima
                            ? "text-sky-600 dark:text-sky-400"
                            : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {saude.buyins.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                      <span className="text-xs font-normal text-muted-foreground">
                        {" "}buy-ins de {fmtUSD(saude.abi)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {saude.curta
                        ? `banca curta — mínimo saudável: ${saude.min}`
                        : saude.acima
                          ? `acima de ${saude.teto}: saque ou suba o ABI`
                          : `zona saudável (${saude.min}–${saude.teto})`}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cards por site */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {dados.sites.map((s) => {
              const r = dados.registros[s.id];
              const temAlgo = r && (r.bancaInicial !== null || r.saldoFinal !== null);
              const fechado = r && r.saldoFinal !== null;
              const emJogo = temAlgo && !fechado;
              return (
                <Card
                  key={s.id}
                  className={cn(
                    "gap-3 py-4 transition-all",
                    emJogo && "border-amber-400/60 shadow-sm",
                    fechado && "border-emerald-500/40"
                  )}
                >
                  <CardHeader className="px-4 py-0">
                    <CardTitle className="flex items-center justify-between text-base">
                      {s.nome}
                      {fechado ? (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        >
                          fechado
                        </Badge>
                      ) : emJogo ? (
                        <Badge
                          variant="secondary"
                          className="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        >
                          em jogo
                        </Badge>
                      ) : null}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5 px-4 py-0">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs text-muted-foreground">Banca inicial</label>
                      <MoneyCell
                        value={r?.bancaInicial ?? null}
                        onCommit={(v) => setReg(s.id, "bancaInicial", v)}
                        className="h-9 w-32 border-input bg-background text-sm"
                      />
                    </div>
                    {!temAlgo && s.bancaAnterior !== null && (
                      <button
                        className="flex w-full items-center justify-between rounded-lg border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                        onClick={() => setReg(s.id, "bancaInicial", s.bancaAnterior)}
                      >
                        <span className="flex items-center gap-1.5">
                          <Wallet className="size-3.5" />
                          última banca: {fmtUSD(s.bancaAnterior)}
                        </span>
                        <span className="font-medium">usar</span>
                      </button>
                    )}
                    {temAlgo && (
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs text-muted-foreground">Saldo final</label>
                        <MoneyCell
                          value={r?.saldoFinal ?? null}
                          onCommit={(v) => setReg(s.id, "saldoFinal", v)}
                          className="h-9 w-32 border-input bg-background text-sm"
                        />
                      </div>
                    )}
                    {temAlgo && (
                      <div className="flex items-center justify-between border-t pt-2 text-sm">
                        <span className="text-xs text-muted-foreground">Resultado</span>
                        {fechado ? (
                          <Resultado valor={resultado(r!)} />
                        ) : (
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            aguardando saldo final…
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Como foi o dia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <NotebookPen className="size-4.5" />
                Como foi o dia
              </CardTitle>
              <CardDescription>
                Tipo de jogo, seu estado mental e anotações — para cruzar com os
                resultados depois, em Estatísticas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Tipo de jogo</span>
                  <div className="flex gap-1">
                    {TIPOS_JOGO.map((t) => (
                      <Button
                        key={t.valor}
                        size="sm"
                        variant={dados.dia?.tipoJogo === t.valor ? "default" : "outline"}
                        className="h-8 px-2.5 text-xs"
                        onClick={() =>
                          setDiaCampo({
                            tipoJogo: dados.dia?.tipoJogo === t.valor ? null : t.valor,
                          })
                        }
                      >
                        {t.rotulo}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Meu jogo</span>
                  <div className="flex gap-1">
                    {["A", "B", "C"].map((e) => (
                      <Button
                        key={e}
                        size="sm"
                        variant={dados.dia?.estado === e ? "default" : "outline"}
                        className={cn(
                          "h-8 w-9 text-xs",
                          dados.dia?.estado === e &&
                            (e === "A"
                              ? "bg-emerald-600 hover:bg-emerald-600/90"
                              : e === "C"
                                ? "bg-red-600 hover:bg-red-600/90"
                                : "")
                        )}
                        onClick={() =>
                          setDiaCampo({ estado: dados.dia?.estado === e ? null : e })
                        }
                      >
                        {e}
                      </Button>
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    A = melhor jogo · C = tilt
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Estudo</span>
                  <MoneyCell
                    value={dados.dia?.horasEstudo ?? null}
                    onCommit={(v) => setDiaCampo({ horasEstudo: v })}
                    placeholder="0"
                    className="h-8 w-14 border-input bg-background text-left text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    h de solver/review
                  </span>
                </div>
              </div>
              <textarea
                defaultValue={dados.dia?.nota ?? ""}
                key={`${dataSel.ano}-${dataSel.mes}-${dataSel.dia}-${dados.dia?.nota ?? ""}`}
                placeholder="Anotações do dia: mesas, spots marcantes, tilt, estudo…"
                rows={3}
                className="w-full resize-y rounded-lg border border-input bg-background p-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-2 focus:ring-ring/30"
                onBlur={(e) => {
                  const v = e.currentTarget.value.trim() || null;
                  if (v !== (dados.dia?.nota ?? null)) setDiaCampo({ nota: v });
                }}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button onClick={() => setRecapAberto(true)}>
              <Flag className="size-4" />
              Encerrar o dia
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/mes/${dataSel.ano}/${dataSel.mes}`}>
                Ver o mês completo
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          {/* Recap do dia (compartilhável) */}
          <Dialog open={recapAberto} onOpenChange={setRecapAberto}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between pr-6">
                  <span className="capitalize">{nomeDaData(dataSel)}</span>
                  <button
                    className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Esconder valores"
                    onClick={() => setEsconderValores((v) => !v)}
                  >
                    {esconderValores ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </DialogTitle>
              </DialogHeader>

              <div className="fundo-feltro padrao-naipes rounded-xl p-6 text-white">
                <div className="flex items-center gap-2 text-sm text-emerald-300">
                  <span>♠</span> Poker Bankroll
                </div>
                <div
                  className={cn(
                    "mt-3 text-4xl font-semibold tabular-nums",
                    totais.resultado >= 0 ? "text-emerald-300" : "text-red-300"
                  )}
                >
                  {totais.resultado > 0 ? "+" : ""}
                  {esconderValores ? "•••••" : fmtUSD(totais.resultado)}
                  {totais.resultado > 0 && " 🎉"}
                </div>
                <div className="mt-1 text-xs text-white/50">resultado do dia</div>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/75">
                  <span>{fmtHoras(dados.dia?.horas ?? 0)} jogadas</span>
                  <span>{dados.sessoes.length} {dados.sessoes.length === 1 ? "sessão" : "sessões"}</span>
                  <span>{totais.fechados} {totais.fechados === 1 ? "site" : "sites"}</span>
                  {dados.dia?.estado && <span>jogo {dados.dia.estado}</span>}
                </div>
                {!esconderValores && totais.fechados > 0 && (
                  <div className="mt-4 space-y-1 border-t border-white/10 pt-3 text-xs text-white/60">
                    {dados.sites
                      .filter((s) => {
                        const r = dados.registros[s.id];
                        return r && r.saldoFinal !== null && resultado(r) !== 0;
                      })
                      .slice(0, 5)
                      .map((s) => {
                        const res = resultado(dados.registros[s.id]);
                        return (
                          <div key={s.id} className="flex justify-between">
                            <span>{s.nome}</span>
                            <span className={res >= 0 ? "text-emerald-300" : "text-red-300"}>
                              {res > 0 ? "+" : ""}
                              {fmtUSD(res)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                onClick={() =>
                  baixarRecap(dataSel, totais.resultado, dados, esconderValores, nomeDaData(dataSel))
                }
              >
                <Download className="size-4" />
                Baixar imagem
              </Button>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

/** Gera um PNG do recap do dia (canvas, sem libs) */
function baixarRecap(
  data: DataSel,
  resultadoDia: number,
  dados: GrindData,
  esconder: boolean,
  dataTexto: string
) {
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 720;
  const ctx = c.getContext("2d")!;

  // feltro
  const g = ctx.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, "#10231c");
  g.addColorStop(1, "#0a1512");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1080, 720);
  const rg = ctx.createRadialGradient(540, -120, 60, 540, -120, 760);
  rg.addColorStop(0, "rgba(52,211,153,0.16)");
  rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, 1080, 720);

  ctx.fillStyle = "#34d399";
  ctx.font = "600 36px system-ui, sans-serif";
  ctx.fillText("♠  Poker Bankroll", 72, 104);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "28px system-ui, sans-serif";
  ctx.fillText(dataTexto, 72, 152);

  const valor = esconder
    ? "•••••"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" }).format(resultadoDia);
  ctx.fillStyle = resultadoDia >= 0 ? "#34d399" : "#f87171";
  ctx.font = "700 118px system-ui, sans-serif";
  ctx.fillText(`${resultadoDia > 0 ? "+" : ""}${valor}`, 68, 320);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "30px system-ui, sans-serif";
  ctx.fillText("resultado do dia", 72, 370);

  const horas = dados.dia?.horas ?? 0;
  const hTxt = `${Math.floor(horas)}h${String(Math.round((horas % 1) * 60)).padStart(2, "0")}`;
  const fechados = dados.sites.filter((s) => dados.registros[s.id]?.saldoFinal != null).length;
  const linha = [
    `${hTxt} jogadas`,
    `${dados.sessoes.length} ${dados.sessoes.length === 1 ? "sessão" : "sessões"}`,
    `${fechados} sites`,
    dados.dia?.estado ? `jogo ${dados.dia.estado}` : null,
  ].filter(Boolean);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "32px system-ui, sans-serif";
  ctx.fillText(linha.join("   ·   "), 72, 470);

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(72, 530);
  ctx.lineTo(1008, 530);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "26px system-ui, sans-serif";
  ctx.fillText("♠ ♥ ♦ ♣", 72, 640);

  const a = document.createElement("a");
  a.download = `grind-${data.ano}-${data.mes}-${data.dia}.png`;
  a.href = c.toDataURL("image/png");
  a.click();
}
