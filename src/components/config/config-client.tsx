"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Coins,
  Download,
  Globe,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoneyCell } from "@/components/mes/celulas";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { CarteiraT, SiteT } from "@/lib/calc";

type Item = SiteT | CarteiraT;

function ListaEditavel({
  titulo,
  descricao,
  icone,
  itens,
  setItens,
  apiBase,
  avisoExclusao,
  controleExtra,
}: {
  titulo: string;
  descricao: string;
  icone: React.ReactNode;
  itens: Item[];
  setItens: (itens: Item[]) => void;
  apiBase: string; // "/api/sites" | "/api/carteiras"
  avisoExclusao: string;
  controleExtra?: (item: Item) => React.ReactNode;
}) {
  const [novoNome, setNovoNome] = useState("");
  const [excluindo, setExcluindo] = useState<Item | null>(null);

  async function req(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function adicionar() {
    const nome = novoNome.trim();
    if (!nome) return;
    try {
      const criado = await req(apiBase, "POST", { nome });
      setItens([...itens, criado]);
      setNovoNome("");
      toast.success(`"${nome}" adicionado`);
    } catch {
      toast.error("Não foi possível adicionar");
    }
  }

  async function renomear(item: Item, nome: string) {
    const novo = nome.trim();
    if (!novo || novo === item.nome) return;
    setItens(itens.map((i) => (i.id === item.id ? { ...i, nome: novo } : i)));
    try {
      await req(`${apiBase}/${item.id}`, "PATCH", { nome: novo });
    } catch {
      toast.error("Não foi possível renomear");
    }
  }

  async function alternarAtivo(item: Item, ativo: boolean) {
    setItens(itens.map((i) => (i.id === item.id ? { ...i, ativo } : i)));
    try {
      await req(`${apiBase}/${item.id}`, "PATCH", { ativo });
    } catch {
      toast.error("Não foi possível atualizar");
    }
  }

  async function mover(item: Item, delta: -1 | 1) {
    const idx = itens.findIndex((i) => i.id === item.id);
    const alvo = idx + delta;
    if (alvo < 0 || alvo >= itens.length) return;
    const novos = [...itens];
    [novos[idx], novos[alvo]] = [novos[alvo], novos[idx]];
    setItens(novos);
    try {
      await req(`${apiBase}/reorder`, "POST", { ids: novos.map((i) => i.id) });
    } catch {
      toast.error("Não foi possível reordenar");
    }
  }

  async function excluir() {
    if (!excluindo) return;
    const item = excluindo;
    setExcluindo(null);
    setItens(itens.filter((i) => i.id !== item.id));
    try {
      await req(`${apiBase}/${item.id}`, "DELETE");
      toast.success(`"${item.nome}" excluído`);
    } catch {
      toast.error("Não foi possível excluir");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icone}
          {titulo}
        </CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {itens.map((item, idx) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-xl border bg-card p-2 transition-colors hover:bg-accent/40"
          >
            <div className="flex flex-col">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                disabled={idx === 0}
                aria-label="Mover para cima"
                onClick={() => mover(item, -1)}
              >
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                disabled={idx === itens.length - 1}
                aria-label="Mover para baixo"
                onClick={() => mover(item, 1)}
              >
                <ArrowDown className="size-3.5" />
              </Button>
            </div>
            <Input
              defaultValue={item.nome}
              className="h-9 flex-1 border-transparent bg-transparent font-medium shadow-none focus-visible:border-input"
              onBlur={(e) => renomear(item, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
            {controleExtra?.(item)}
            {!item.ativo && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                inativo
              </Badge>
            )}
            <Switch
              checked={item.ativo}
              aria-label="Ativo"
              onCheckedChange={(v) => alternarAtivo(item, v)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-red-600"
              aria-label="Excluir"
              onClick={() => setExcluindo(item)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}

        <form
          className="flex gap-2 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            adicionar();
          }}
        >
          <Input
            placeholder="Nome do novo item…"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
          />
          <Button type="submit" disabled={!novoNome.trim()}>
            <Plus className="size-4" />
            Adicionar
          </Button>
        </form>
      </CardContent>

      <Dialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir &quot;{excluindo?.nome}&quot;?</DialogTitle>
            <DialogDescription>{avisoExclusao}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcluindo(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={excluir}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

type ConfigT = { concentracaoMaxPct: number | null; saldoMinimo: number | null } | null;
type CotacaoT = { moeda: string; paraUSD: number };

export function ConfigClient({
  sitesIniciais,
  carteirasIniciais,
  configInicial,
  cotacoesIniciais,
}: {
  sitesIniciais: SiteT[];
  carteirasIniciais: CarteiraT[];
  configInicial: ConfigT;
  cotacoesIniciais: CotacaoT[];
}) {
  const [sites, setSites] = useState<Item[]>(sitesIniciais);
  const [carteiras, setCarteiras] = useState<Item[]>(carteirasIniciais);
  const [config, setConfig] = useState<ConfigT>(configInicial);
  const [cotacoes, setCotacoes] = useState<Record<string, number | null>>({
    EUR: cotacoesIniciais.find((c) => c.moeda === "EUR")?.paraUSD ?? null,
    BRL: cotacoesIniciais.find((c) => c.moeda === "BRL")?.paraUSD ?? null,
  });

  async function salvarConfig(campo: "concentracaoMaxPct" | "saldoMinimo", v: number | null) {
    setConfig((prev) => ({
      concentracaoMaxPct: prev?.concentracaoMaxPct ?? null,
      saldoMinimo: prev?.saldoMinimo ?? null,
      [campo]: v,
    }));
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

  async function salvarCotacao(moeda: string, v: number | null) {
    if (v === null || v <= 0) return;
    setCotacoes((prev) => ({ ...prev, [moeda]: v }));
    try {
      const res = await fetch("/api/cotacoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moeda, paraUSD: v }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Não foi possível salvar a cotação");
    }
  }

  async function mudarMoeda(item: Item, moeda: string) {
    setSites((prev) =>
      prev.map((s) => (s.id === item.id ? ({ ...s, moeda } as Item) : s))
    );
    try {
      const res = await fetch(`/api/sites/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moeda }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Não foi possível mudar a moeda");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie os sites em que você joga e as carteiras que compõem sua
          banca total.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <ListaEditavel
          titulo="Sites"
          descricao="Sites de poker. Desativar esconde o site das tabelas sem apagar o histórico. A moeda converte os valores do site para US$ nos totais."
          icone={<Globe className="size-4.5" />}
          itens={sites}
          setItens={setSites}
          apiBase="/api/sites"
          avisoExclusao="Todos os registros diários desse site serão apagados de forma permanente. Se quiser apenas escondê-lo, desative-o."
          controleExtra={(item) => (
            <Select
              value={(item as SiteT).moeda ?? "USD"}
              onValueChange={(v) => mudarMoeda(item, v)}
            >
              <SelectTrigger
                size="sm"
                className="h-8 w-20 text-xs"
                aria-label="Moeda do site"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["USD", "EUR", "BRL"].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <ListaEditavel
          titulo="Carteiras"
          descricao="Carteiras externas (Binance, Skrill…) somadas na banca total."
          icone={<Wallet className="size-4.5" />}
          itens={carteiras}
          setItens={setCarteiras}
          apiBase="/api/carteiras"
          avisoExclusao="Os saldos mensais dessa carteira serão apagados de forma permanente. Se quiser apenas escondê-la, desative-a."
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4.5" />
              Alertas de gestão de banca
            </CardTitle>
            <CardDescription>
              Avisos no Dashboard quando uma regra é violada. Deixe vazio para
              desativar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span>
                Concentração máxima por site
                <span className="block text-xs text-muted-foreground">
                  alerta se um site passar deste % da banca dos sites
                </span>
              </span>
              <div className="flex items-center gap-1">
                <MoneyCell
                  value={config?.concentracaoMaxPct ?? null}
                  onCommit={(v) => salvarConfig("concentracaoMaxPct", v)}
                  placeholder="ex.: 40"
                  className="h-9 w-20 border-input bg-background"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t pt-3 text-sm">
              <span>
                Saldo mínimo por site ativo
                <span className="block text-xs text-muted-foreground">
                  alerta se a banca de um site cair abaixo disso
                </span>
              </span>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">US$</span>
                <MoneyCell
                  value={config?.saldoMinimo ?? null}
                  onCommit={(v) => salvarConfig("saldoMinimo", v)}
                  placeholder="ex.: 50"
                  className="h-9 w-24 border-input bg-background"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="size-4.5" />
              Cotações
            </CardTitle>
            <CardDescription>
              Usadas para converter sites em EUR/BRL para US$ nos totais.
              Atualize quando quiser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["EUR", "BRL"] as const).map((m, i) => (
              <div
                key={m}
                className={
                  i > 0
                    ? "flex items-center justify-between gap-3 border-t pt-3 text-sm"
                    : "flex items-center justify-between gap-3 text-sm"
                }
              >
                <span>
                  1 {m} vale
                  <span className="block text-xs text-muted-foreground">
                    em dólares (ex.: {m === "EUR" ? "1,09" : "0,18"})
                  </span>
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">US$</span>
                  <MoneyCell
                    value={cotacoes[m]}
                    onCommit={(v) => salvarCotacao(m, v)}
                    placeholder="definir"
                    className="h-9 w-24 border-input bg-background"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="size-4.5" />
              Backup
            </CardTitle>
            <CardDescription>
              Baixa todos os seus dados num Excel (uma aba por tabela) — guarde
              uma cópia de vez em quando.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <a href="/api/export">
                <Download className="size-4" />
                Exportar tudo (Excel)
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
