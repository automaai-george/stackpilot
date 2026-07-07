"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Receipt,
  ReceiptText,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fmtUSD } from "@/lib/format";

type MovT = {
  id: number;
  ano: number;
  mes: number;
  dia: number;
  tipo: string;
  valor: number;
  descricao: string | null;
};

const TIPOS = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "saque", rotulo: "Saques" },
  { valor: "deposito", rotulo: "Depósitos" },
  { valor: "despesa", rotulo: "Despesas" },
  { valor: "transferencia", rotulo: "Transferências" },
];

function BadgeTipo({ tipo }: { tipo: string }) {
  const cfg: Record<string, { rotulo: string; classe: string }> = {
    saque: {
      rotulo: "Saque",
      classe: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    deposito: { rotulo: "Depósito", classe: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
    despesa: { rotulo: "Despesa", classe: "bg-red-500/10 text-red-600 dark:text-red-400" },
    transferencia: { rotulo: "Transferência", classe: "" },
  };
  const c = cfg[tipo] ?? { rotulo: tipo, classe: "" };
  return (
    <Badge variant="secondary" className={cn("text-[11px]", c.classe)}>
      {c.rotulo}
    </Badge>
  );
}

export function ExtratoClient({
  movimentacoesIniciais,
  anos,
  anoAtual,
}: {
  movimentacoesIniciais: MovT[];
  anos: number[];
  anoAtual: number;
}) {
  const [movs, setMovs] = useState<MovT[]>(movimentacoesIniciais);
  const [ano, setAno] = useState(anos.includes(anoAtual) ? anoAtual : 0);
  const [tipo, setTipo] = useState("todos");
  const [excluindo, setExcluindo] = useState<MovT | null>(null);

  const filtradas = useMemo(
    () =>
      movs.filter(
        (m) => (ano === 0 || m.ano === ano) && (tipo === "todos" || m.tipo === tipo)
      ),
    [movs, ano, tipo]
  );

  const totais = useMemo(() => {
    const soma = (t: string) =>
      filtradas.filter((m) => m.tipo === t).reduce((s, m) => s + m.valor, 0);
    return {
      saques: soma("saque"),
      depositos: soma("deposito"),
      despesas: soma("despesa"),
      transferencias: soma("transferencia"),
      nTransferencias: filtradas.filter((m) => m.tipo === "transferencia").length,
    };
  }, [filtradas]);

  async function excluir() {
    if (!excluindo) return;
    const mov = excluindo;
    setExcluindo(null);
    setMovs((prev) => prev.filter((m) => m.id !== mov.id));
    try {
      const res = await fetch(`/api/movimentacoes/${mov.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Registro removido do extrato");
    } catch {
      toast.error("Não foi possível excluir");
      setMovs((prev) =>
        [...prev, mov].sort(
          (a, b) => b.ano - a.ano || b.mes - a.mes || b.dia - a.dia || b.id - a.id
        )
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Extrato</h1>
          <p className="text-sm text-muted-foreground">
            Todo o dinheiro que se moveu: saques, depósitos, despesas e
            transferências entre contas.
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant={ano === 0 ? "default" : "outline"} onClick={() => setAno(0)}>
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

      {/* Totais do período */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            t: "Saques",
            v: totais.saques,
            icone: ArrowUpFromLine,
            cor: "text-emerald-600 dark:text-emerald-400",
            r: "dinheiro que saiu do poker",
          },
          {
            t: "Depósitos",
            v: totais.depositos,
            icone: ArrowDownToLine,
            cor: "text-sky-600 dark:text-sky-400",
            r: "dinheiro que entrou no poker",
          },
          {
            t: "Despesas",
            v: totais.despesas,
            icone: ReceiptText,
            cor: "text-red-600 dark:text-red-400",
            r: "aulas, softwares…",
          },
          {
            t: "Transferências",
            v: totais.transferencias,
            icone: ArrowLeftRight,
            cor: "",
            r: `${totais.nTransferencias} entre suas contas`,
          },
        ].map((c) => (
          <Card key={c.t} className="gap-1.5 py-4">
            <CardHeader className="px-4 py-0">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <c.icone className="size-3.5" />
                {c.t}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 py-0">
              <div className={cn("text-xl font-semibold tabular-nums", c.cor)}>
                {fmtUSD(c.v)}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.r}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtro por tipo */}
      <div className="flex flex-wrap gap-1.5">
        {TIPOS.map((t) => (
          <Button
            key={t.valor}
            size="sm"
            variant={tipo === t.valor ? "default" : "outline"}
            onClick={() => setTipo(t.valor)}
          >
            {t.rotulo}
          </Button>
        ))}
      </div>

      {/* Lista */}
      <Card className="overflow-hidden py-0 gap-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2.5 text-left font-medium">Data</th>
                <th className="px-3 py-2.5 text-left font-medium">Tipo</th>
                <th className="px-3 py-2.5 text-right font-medium">Valor</th>
                <th className="px-3 py-2.5 text-left font-medium">Descrição</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    <Receipt className="mx-auto mb-2 size-6 opacity-40" />
                    Nenhuma movimentação neste filtro. Use o botão
                    &quot;Transferir&quot; no Bankroll ou lance na página do mês.
                  </td>
                </tr>
              )}
              {filtradas.map((m) => (
                <tr key={m.id} className="border-b transition-colors last:border-0 hover:bg-accent/40">
                  <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                    {m.dia}/{m.mes}/{m.ano}
                  </td>
                  <td className="px-3 py-2.5">
                    <BadgeTipo tipo={m.tipo} />
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 text-right font-semibold tabular-nums",
                      m.tipo === "saque" && "text-emerald-600 dark:text-emerald-400",
                      m.tipo === "despesa" && "text-red-600 dark:text-red-400"
                    )}
                  >
                    {fmtUSD(m.valor)}
                  </td>
                  <td className="max-w-md truncate px-3 py-2.5 text-muted-foreground">
                    {m.descricao ?? "—"}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <button
                      className="rounded p-1 text-muted-foreground transition-colors hover:text-red-600"
                      aria-label="Excluir do extrato"
                      onClick={() => setExcluindo(m)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confirmação de exclusão */}
      <Dialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir este registro?</DialogTitle>
            <DialogDescription>
              Isso apaga apenas a linha do extrato —{" "}
              <strong>os saldos das contas não são desfeitos</strong>. Se a
              movimentação foi lançada por engano, ajuste também os saldos no
              Bankroll.
            </DialogDescription>
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
    </div>
  );
}
