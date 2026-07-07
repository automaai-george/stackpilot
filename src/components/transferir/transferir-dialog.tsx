"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowLeftRight, Landmark } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtUSD, parseNumInput } from "@/lib/format";

type Conta = { chave: string; tipo: "site" | "carteira" | "externo"; id?: number; nome: string };

function dataLocalHoje() {
  const d = new Date();
  return { ano: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate() };
}

/**
 * Transferência entre contas (site ↔ carteira ↔ fora do poker) com
 * contabilidade neutra: nunca cria lucro nem prejuízo fantasma.
 */
export function TransferirDialog({
  aberto,
  onFechar,
  onSucesso,
}: {
  aberto: boolean;
  onFechar: () => void;
  onSucesso?: () => void;
}) {
  const [contas, setContas] = useState<Conta[]>([]);
  const [de, setDe] = useState<string>("");
  const [para, setPara] = useState<string>("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    (async () => {
      try {
        const [sites, carteiras] = await Promise.all([
          fetch("/api/sites").then((r) => r.json()),
          fetch("/api/carteiras").then((r) => r.json()),
        ]);
        const lista: Conta[] = [
          { chave: "externo", tipo: "externo", nome: "Fora do poker (banco/pix)" },
          ...sites
            .filter((s: { ativo: boolean }) => s.ativo)
            .map((s: { id: number; nome: string }) => ({
              chave: `site-${s.id}`, tipo: "site" as const, id: s.id, nome: s.nome,
            })),
          ...carteiras
            .filter((c: { ativo: boolean }) => c.ativo)
            .map((c: { id: number; nome: string }) => ({
              chave: `carteira-${c.id}`, tipo: "carteira" as const, id: c.id, nome: c.nome,
            })),
        ];
        setContas(lista);
      } catch {
        toast.error("Não foi possível carregar suas contas");
      }
    })();
  }, [aberto]);

  const acha = (chave: string) => contas.find((c) => c.chave === chave);

  async function transferir(e: React.FormEvent) {
    e.preventDefault();
    const v = parseNumInput(valor);
    const origem = acha(de);
    const destino = acha(para);
    if (!origem || !destino) {
      toast.error("Escolha origem e destino");
      return;
    }
    if (de === para) {
      toast.error("Origem e destino são a mesma conta");
      return;
    }
    if (v === null || v <= 0) {
      toast.error("Informe o valor");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/transferencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          de: { tipo: origem.tipo, id: origem.id },
          para: { tipo: destino.tipo, id: destino.id },
          valor: v,
          descricao,
          ...dataLocalHoje(),
        }),
      });
      const corpo = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(corpo.error ?? "Não foi possível transferir");
      toast.success(
        `${fmtUSD(v)}: ${origem.nome} → ${destino.nome}. Saldos atualizados sem mexer no lucro.`
      );
      setValor("");
      setDescricao("");
      onFechar();
      onSucesso?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível transferir");
    } finally {
      setEnviando(false);
    }
  }

  const SeletorConta = ({
    valor: v,
    onChange,
    rotulo,
    excluir,
  }: {
    valor: string;
    onChange: (v: string) => void;
    rotulo: string;
    excluir?: string;
  }) => (
    <Select value={v} onValueChange={onChange}>
      <SelectTrigger className="w-full" aria-label={rotulo}>
        <SelectValue placeholder={rotulo} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="externo" disabled={excluir === "externo"}>
          🏦 Fora do poker (banco/pix)
        </SelectItem>
        <SelectGroup>
          <SelectLabel>Sites</SelectLabel>
          {contas
            .filter((c) => c.tipo === "site")
            .map((c) => (
              <SelectItem key={c.chave} value={c.chave} disabled={c.chave === excluir}>
                {c.nome}
              </SelectItem>
            ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Carteiras</SelectLabel>
          {contas
            .filter((c) => c.tipo === "carteira")
            .map((c) => (
              <SelectItem key={c.chave} value={c.chave} disabled={c.chave === excluir}>
                {c.nome}
              </SelectItem>
            ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="size-4.5" />
            Transferir dinheiro
          </DialogTitle>
          <DialogDescription>
            Depósito, saque ou transferência entre contas — os saldos dos dois
            lados se ajustam <strong>sem criar lucro nem prejuízo</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={transferir} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">De (origem)</label>
            <SeletorConta valor={de} onChange={setDe} rotulo="De onde sai o dinheiro" excluir={para} />
          </div>
          <div className="flex justify-center text-muted-foreground">
            <ArrowDown className="size-4" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Para (destino)</label>
            <SeletorConta valor={para} onChange={setPara} rotulo="Para onde vai" excluir={de} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Valor (US$)</label>
            <Input
              inputMode="decimal"
              placeholder="ex.: 30 ou 150,50"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              aria-label="Valor"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Descrição (opcional)
            </label>
            <Input
              placeholder="ex.: reload para os torneios de domingo"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <p className="flex items-start gap-1.5 rounded-lg border border-dashed px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
            <Landmark className="mt-0.5 size-3.5 shrink-0" />
            Num site com o dia já fechado, o valor vira a banca de amanhã (o
            lucro de hoje não muda). Banco/pix entra no Caixa como saque ou
            depósito.
          </p>

          <Button type="submit" className="w-full" disabled={enviando || !de || !para || !valor}>
            {enviando ? "Transferindo…" : "Confirmar transferência"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
