"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RotateCcw, ShieldCheck, Users } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Usuario = {
  id: number;
  email: string;
  nome: string | null;
  criadoEm: string;
  _count: { sites: number; registros: number };
};

function senhaAleatoria() {
  // temporária, fácil de ditar: 3 blocos curtos
  const bloco = () => Math.random().toString(36).slice(2, 6);
  return `${bloco()}-${bloco()}`;
}

export function AdminClient() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [reset, setReset] = useState<{ usuario: Usuario; senha: string } | null>(null);
  const [feito, setFeito] = useState<{ email: string; senha: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/usuarios")
      .then((r) => (r.ok ? r.json() : []))
      .then(setUsuarios)
      .catch(() => toast.error("Não foi possível carregar"))
      .finally(() => setCarregando(false));
  }, []);

  async function confirmarReset() {
    if (!reset) return;
    const { usuario, senha } = reset;
    setReset(null);
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId: usuario.id, novaSenha: senha }),
      });
      if (!res.ok) throw new Error();
      setFeito({ email: usuario.email, senha });
    } catch {
      toast.error("Não foi possível resetar");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ShieldCheck className="size-6" />
          Painel do administrador
        </h1>
        <p className="text-sm text-muted-foreground">
          Área restrita a você. Ajude um amigo travado gerando uma senha
          temporária — ele troca depois em Configurações.
        </p>
      </div>

      <Card className="overflow-hidden py-0 gap-0">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4.5" />
            {usuarios.length} {usuarios.length === 1 ? "usuário" : "usuários"}
          </CardTitle>
          <CardDescription>Sem acesso aos dados financeiros de ninguém — só às contas.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0 pb-0">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="border-y bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">E-mail</th>
                <th className="px-3 py-2.5 text-left font-medium">Nome</th>
                <th className="px-3 py-2.5 text-right font-medium">Sites</th>
                <th className="px-3 py-2.5 text-right font-medium">Registros</th>
                <th className="px-3 py-2.5 text-left font-medium">Desde</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {carregando && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              )}
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b transition-colors last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-2.5 font-medium">{u.email}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{u.nome ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{u._count.sites}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{u._count.registros}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {new Date(u.criadoEm).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReset({ usuario: u, senha: senhaAleatoria() })}
                    >
                      <RotateCcw className="size-3.5" />
                      Resetar senha
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* confirmação */}
      <Dialog open={!!reset} onOpenChange={(o) => !o && setReset(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Resetar a senha de {reset?.usuario.email}?</DialogTitle>
            <DialogDescription>
              Uma senha temporária será gerada. Passe para a pessoa — ela pode
              trocar depois em Configurações. Os dados dela não são afetados.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-center font-mono text-lg">
            {reset?.senha}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReset(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarReset}>Confirmar reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* resultado */}
      <Dialog open={!!feito} onOpenChange={(o) => !o && setFeito(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Senha temporária criada ✅</DialogTitle>
            <DialogDescription>
              Passe estes dados para {feito?.email}. Peça para trocar a senha
              assim que entrar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 rounded-lg border bg-muted/40 px-3 py-3 text-sm">
            <div>
              <span className="text-muted-foreground">E-mail:</span> {feito?.email}
            </div>
            <div>
              <span className="text-muted-foreground">Senha temporária:</span>{" "}
              <span className="font-mono font-semibold">{feito?.senha}</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setFeito(null)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
