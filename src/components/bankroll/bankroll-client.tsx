"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  Gauge,
  Globe,
  Landmark,
  PiggyBank,
  Plus,
  Settings,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { TransferirDialog } from "@/components/transferir/transferir-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fmtUSD } from "@/lib/format";
import { MESES_CURTO, SIMBOLO_MOEDA, paraUSD, type CotacaoMap } from "@/lib/calc";
import { MoneyCell } from "@/components/mes/celulas";

type SiteBanca = {
  id: number;
  nome: string;
  moeda: string;
  banca: number | null; // na moeda do site
  quando: string | null;
};
type Conta = {
  id: number;
  nome: string;
  valorMes: number | null;
  ultimo: { valor: number; quando: string } | null;
};
type Gestao = { abi: number | null; buyinsMin: number; buyinsTeto: number };
type Carreira = { custoVida: number | null; reservaImpostoPct: number | null };

function Percentual({ valor, total }: { valor: number; total: number }) {
  if (total <= 0 || valor <= 0) return null;
  const pct = (valor / total) * 100;
  return (
    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary/60"
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

export function BankrollClient({
  ano,
  mes,
  sitesIniciais,
  contasIniciais,
  cotacoes,
  gestaoInicial,
  abiReal,
  carreiraInicial,
  saquesAno,
}: {
  ano: number;
  mes: number;
  sitesIniciais: SiteBanca[];
  contasIniciais: Conta[];
  cotacoes: CotacaoMap;
  gestaoInicial: Gestao;
  abiReal: { valor: number; n: number } | null;
  carreiraInicial: Carreira;
  saquesAno: number;
}) {
  const router = useRouter();
  const [sites, setSites] = useState<SiteBanca[]>(sitesIniciais);
  const [contas, setContas] = useState<Conta[]>(contasIniciais);
  const [novaConta, setNovaConta] = useState("");
  const [gestao, setGestao] = useState<Gestao>(gestaoInicial);
  const [transferindo, setTransferindo] = useState(false);
  const [carreira, setCarreira] = useState<Carreira>(carreiraInicial);

  async function salvarCarreira(campo: keyof Carreira, v: number | null) {
    setCarreira((prev) => ({ ...prev, [campo]: v }));
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: v }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Não foi possível salvar");
    }
  }

  async function salvarGestao(campo: keyof Gestao, v: number | null) {
    if (campo !== "abi" && (v === null || v <= 0)) return;
    setGestao((prev) => ({ ...prev, [campo]: v as never }));
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: v }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Não foi possível salvar");
    }
  }

  const emUSD = (s: SiteBanca) => paraUSD(s.banca ?? 0, s.moeda, cotacoes);
  const somaSites = useMemo(
    () => sites.reduce((soma, s) => soma + emUSD(s), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sites, cotacoes]
  );

  async function ajustarSite(site: SiteBanca, v: number | null) {
    if (v === null || v < 0) {
      toast.error("Informe um valor válido (para zerar, digite 0)");
      return;
    }
    // o ajuste vale para AMANHÃ: nunca mexe no resultado de hoje/passado
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const data = {
      ano: amanha.getFullYear(),
      mes: amanha.getMonth() + 1,
      dia: amanha.getDate(),
    };
    setSites((prev) =>
      prev.map((s) =>
        s.id === site.id
          ? { ...s, banca: v, quando: `${data.dia}/${data.mes}/${data.ano}` }
          : s
      )
    );
    try {
      const res = await fetch("/api/bankroll/ajuste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: site.id, ...data, valor: v }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        `${site.nome}: ${fmtUSD(v)} vira a banca inicial de amanhã (${data.dia}/${data.mes}) — o resultado de hoje não muda`
      );
    } catch {
      toast.error("Não foi possível ajustar");
    }
  }
  // conta digital vale o lançamento do mês atual; sem ele, o último conhecido
  const valorConta = (c: Conta) => c.valorMes ?? c.ultimo?.valor ?? 0;
  const somaContas = useMemo(
    () => contas.reduce((s, c) => s + valorConta(c), 0),
    [contas]
  );
  const total = somaSites + somaContas;

  async function salvarConta(id: number, v: number | null) {
    setContas((prev) =>
      prev.map((c) => (c.id === id ? { ...c, valorMes: v } : c))
    );
    try {
      const res = await fetch("/api/saldos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carteiraId: id, ano, mes, valor: v }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Não foi possível salvar");
    }
  }

  async function adicionarConta() {
    const nome = novaConta.trim();
    if (!nome) return;
    try {
      const res = await fetch("/api/carteiras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      });
      if (!res.ok) throw new Error();
      const criada = await res.json();
      setContas((prev) => [
        ...prev,
        { id: criada.id, nome: criada.nome, valorMes: null, ultimo: null },
      ]);
      setNovaConta("");
      toast.success(`Conta "${nome}" criada`);
    } catch {
      toast.error("Não foi possível criar a conta");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bankroll</h1>
          <p className="text-sm text-muted-foreground">
            Onde o seu dinheiro está agora: sites de poker e contas digitais.
          </p>
        </div>
        <Button onClick={() => setTransferindo(true)}>
          <ArrowLeftRight className="size-4" />
          Transferir / Sacar / Depositar
        </Button>
      </div>

      <TransferirDialog
        aberto={transferindo}
        onFechar={() => setTransferindo(false)}
        onSucesso={() => router.refresh()}
      />

      {/* Totais */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Card className="gap-2 bg-primary py-5 text-primary-foreground">
          <CardHeader className="px-5 py-0">
            <CardDescription className="flex items-center gap-1.5 text-xs text-primary-foreground/70">
              <PiggyBank className="size-4" /> Banca total
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 py-0 text-2xl font-semibold tabular-nums">
            {fmtUSD(total)}
          </CardContent>
        </Card>
        <Card className="gap-2 py-5">
          <CardHeader className="px-5 py-0">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Globe className="size-4" /> Nos sites
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 py-0">
            <div className="text-2xl font-semibold tabular-nums">{fmtUSD(somaSites)}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {total > 0 ? `${Math.round((somaSites / total) * 100)}% do total` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-2 py-5">
          <CardHeader className="px-5 py-0">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Landmark className="size-4" /> Nas contas digitais
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 py-0">
            <div className="text-2xl font-semibold tabular-nums">{fmtUSD(somaContas)}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {total > 0 ? `${Math.round((somaContas / total) * 100)}% do total` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gestão de banca por buy-ins */}
      <Card
        className={cn(
          gestao.abi !== null &&
            total / gestao.abi < gestao.buyinsMin &&
            "border-amber-400/60",
          gestao.abi !== null &&
            total / gestao.abi > gestao.buyinsTeto &&
            "border-sky-400/60"
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="size-4.5" />
            Gestão de banca
          </CardTitle>
          <CardDescription>
            Informe seu Average Buy-in e acompanhe quantos buy-ins a banca
            total representa. Zona saudável: entre {gestao.buyinsMin} e{" "}
            {gestao.buyinsTeto} buy-ins.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Average Buy-in</span>
              <span className="text-muted-foreground">US$</span>
              <MoneyCell
                value={gestao.abi}
                onCommit={(v) => salvarGestao("abi", v)}
                placeholder="definir"
                className="h-9 w-20 border-input bg-background font-semibold"
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Mínimo saudável</span>
              <MoneyCell
                value={gestao.buyinsMin}
                onCommit={(v) => salvarGestao("buyinsMin", v === null ? null : Math.round(v))}
                className="h-9 w-16 border-input bg-background"
              />
              <span className="text-muted-foreground">· Teto</span>
              <MoneyCell
                value={gestao.buyinsTeto}
                onCommit={(v) => salvarGestao("buyinsTeto", v === null ? null : Math.round(v))}
                className="h-9 w-16 border-input bg-background"
              />
            </div>
          </div>

          {abiReal && Math.abs((gestao.abi ?? 0) - abiReal.valor) > 0.5 && (
            <button
              className="flex items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              onClick={() => salvarGestao("abi", Math.round(abiReal.valor * 100) / 100)}
            >
              ABI real dos últimos 90 dias ({abiReal.n} torneios):{" "}
              <span className="font-semibold">{fmtUSD(abiReal.valor)}</span> — usar
            </button>
          )}

          {gestao.abi === null || gestao.abi <= 0 ? (
            <p className="text-sm text-muted-foreground">
              Defina o Average Buy-in acima para ligar o acompanhamento
              {abiReal === null && (
                <> — ou registre torneios que eu calculo o ABI real para você</>
              )}
              .
            </p>
          ) : (
            (() => {
              const buyins = total / gestao.abi;
              const escala = gestao.buyinsTeto * 1.3; // fim visual da barra
              const pos = (v: number) => `${Math.min((v / escala) * 100, 100)}%`;
              const curta = buyins < gestao.buyinsMin;
              const acima = buyins > gestao.buyinsTeto;
              return (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-3">
                    <span
                      className={cn(
                        "text-3xl font-semibold tabular-nums",
                        curta
                          ? "text-amber-600 dark:text-amber-400"
                          : acima
                            ? "text-sky-600 dark:text-sky-400"
                            : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {buyins.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      buy-ins ({fmtUSD(total)} ÷ {fmtUSD(gestao.abi)})
                    </span>
                  </div>

                  {/* barra de zonas: âmbar (curta) / verde (saudável) / azul (acima) */}
                  <div className="relative h-3 w-full overflow-hidden rounded-full">
                    <div className="absolute inset-y-0 left-0 bg-amber-500/25" style={{ width: pos(gestao.buyinsMin) }} />
                    <div
                      className="absolute inset-y-0 bg-emerald-500/30"
                      style={{ left: pos(gestao.buyinsMin), width: `calc(${pos(gestao.buyinsTeto)} - ${pos(gestao.buyinsMin)})` }}
                    />
                    <div className="absolute inset-y-0 bg-sky-500/25" style={{ left: pos(gestao.buyinsTeto), right: 0 }} />
                    <div
                      className="absolute inset-y-0 w-1 rounded-full bg-foreground shadow"
                      style={{ left: `calc(${pos(buyins)} - 2px)` }}
                      title={`${buyins.toFixed(1)} buy-ins`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>0</span>
                    <span>{gestao.buyinsMin}</span>
                    <span>{gestao.buyinsTeto}+</span>
                  </div>

                  <p className="text-sm">
                    {curta ? (
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        Banca curta: abaixo de {gestao.buyinsMin} buy-ins. Considere
                        descer o ABI ou reforçar a banca — faltam{" "}
                        {fmtUSD(gestao.buyinsMin * gestao.abi - total)} para a zona saudável.
                      </span>
                    ) : acima ? (
                      <span className="font-medium text-sky-600 dark:text-sky-400">
                        Acima de {gestao.buyinsTeto} buy-ins — você pode sacar{" "}
                        {fmtUSD(total - gestao.buyinsTeto * gestao.abi)} ou subir o
                        Average Buy-in para até {fmtUSD(total / gestao.buyinsMin)}.
                      </span>
                    ) : (
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        Zona saudável — jogue tranquilo. Margem até o teto:{" "}
                        {fmtUSD(gestao.buyinsTeto * gestao.abi - total)}.
                      </span>
                    )}
                  </p>
                </div>
              );
            })()
          )}
        </CardContent>
      </Card>

      {/* Carreira: runway e reserva de imposto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="size-4.5" />
            Carreira
          </CardTitle>
          <CardDescription>
            Quanto tempo sua banca sustenta sua vida e quanto separar dos saques.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-x-10 gap-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Custo de vida mensal</span>
            <span className="text-muted-foreground">US$</span>
            <MoneyCell
              value={carreira.custoVida}
              onCommit={(v) => salvarCarreira("custoVida", v)}
              placeholder="definir"
              className="h-9 w-24 border-input bg-background font-semibold"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Reserva p/ imposto</span>
            <MoneyCell
              value={carreira.reservaImpostoPct}
              onCommit={(v) => salvarCarreira("reservaImpostoPct", v)}
              placeholder="%"
              className="h-9 w-16 border-input bg-background font-semibold"
            />
            <span className="text-muted-foreground">%</span>
          </div>

          <div className="flex flex-wrap gap-x-10 gap-y-2">
            {carreira.custoVida && carreira.custoVida > 0 && (
              <div>
                <div className="text-xl font-semibold tabular-nums">
                  {(total / carreira.custoVida).toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    meses de runway
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  banca total ÷ custo de vida
                </p>
              </div>
            )}
            {carreira.reservaImpostoPct != null && carreira.reservaImpostoPct > 0 && (
              <div>
                <div className="text-xl font-semibold tabular-nums">
                  {fmtUSD((saquesAno * carreira.reservaImpostoPct) / 100)}
                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}a reservar em {ano}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {carreira.reservaImpostoPct}% sobre {fmtUSD(saquesAno)} sacados no ano
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sites */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="size-4.5" />
              Sites de poker
            </CardTitle>
            <CardDescription>
              Fez saque, depósito ou transferência? Clique no valor e informe o
              caixa novo — ele entra como <strong>banca inicial de amanhã</strong>,
              sem alterar o lucro de hoje nem de dias passados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sites.map((s) => (
              <div key={s.id} className="rounded-xl border px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {s.nome}
                    {s.moeda !== "USD" && (
                      <Badge variant="secondary" className="text-[10px]">
                        {SIMBOLO_MOEDA[s.moeda] ?? s.moeda}
                      </Badge>
                    )}
                  </span>
                  <span className="flex flex-col items-end">
                    <MoneyCell
                      value={s.banca}
                      onCommit={(v) => ajustarSite(s, v)}
                      placeholder="0,00"
                      className="h-9 w-32 border-input bg-background text-sm font-semibold"
                    />
                    {s.quando && (
                      <span className="mt-0.5 text-[10px] text-muted-foreground">
                        atualizado em {s.quando}
                      </span>
                    )}
                  </span>
                </div>
                <Percentual valor={emUSD(s)} total={total} />
              </div>
            ))}
            {sites.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum site ativo.</p>
            )}
          </CardContent>
        </Card>

        {/* Contas digitais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-4.5" />
              Contas digitais
            </CardTitle>
            <CardDescription>
              Saldo de {MESES_CURTO[mes - 1]}/{ano} — clique no valor para
              editar; salva sozinho.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {contas.map((c) => (
              <div key={c.id} className="rounded-xl border px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{c.nome}</span>
                  <MoneyCell
                    value={c.valorMes}
                    onCommit={(v) => salvarConta(c.id, v)}
                    placeholder="0,00"
                    className="h-9 w-32 border-input bg-background text-sm font-semibold"
                  />
                </div>
                {c.valorMes === null && c.ultimo && (
                  <button
                    className="mt-1.5 text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                    onClick={() => salvarConta(c.id, c.ultimo!.valor)}
                  >
                    manter último valor: {fmtUSD(c.ultimo.valor)} (de {c.ultimo.quando})
                  </button>
                )}
                <Percentual valor={valorConta(c)} total={total} />
              </div>
            ))}
            {contas.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma conta cadastrada ainda — crie a primeira abaixo.
              </p>
            )}

            <form
              className="flex gap-2 pt-2"
              onSubmit={(e) => {
                e.preventDefault();
                adicionarConta();
              }}
            >
              <Input
                placeholder="Nova conta (ex.: Nubank, PayPal…)"
                value={novaConta}
                onChange={(e) => setNovaConta(e.target.value)}
                className="h-9"
              />
              <Button type="submit" size="sm" className="h-9" disabled={!novaConta.trim()}>
                <Plus className="size-4" />
                Adicionar
              </Button>
            </form>

            <p className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
              <Settings className="size-3" />
              Renomear, reordenar ou excluir contas:{" "}
              <Link href="/config" className="underline underline-offset-2 hover:text-foreground">
                Configurações
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
