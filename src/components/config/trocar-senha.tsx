"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TrocarSenha() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (nova.length < 8) {
      toast.error("A nova senha precisa de pelo menos 8 caracteres");
      return;
    }
    if (nova !== confirma) {
      toast.error("A confirmação não bate com a nova senha");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/senha", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual: atual, senhaNova: nova }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Não foi possível trocar a senha");
      toast.success("Senha alterada com sucesso");
      setAtual("");
      setNova("");
      setConfirma("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao trocar a senha");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4.5" />
          Trocar senha
        </CardTitle>
        <CardDescription>
          Recomendado se sua senha atual já foi compartilhada em algum lugar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={salvar} className="grid max-w-sm gap-2">
          <Input
            type="password"
            placeholder="Senha atual"
            value={atual}
            onChange={(e) => setAtual(e.target.value)}
            autoComplete="current-password"
          />
          <Input
            type="password"
            placeholder="Nova senha (mínimo 8 caracteres)"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            autoComplete="new-password"
          />
          <Input
            type="password"
            placeholder="Confirme a nova senha"
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
            autoComplete="new-password"
          />
          <Button type="submit" className="mt-1 w-fit" disabled={enviando || !atual || !nova}>
            {enviando ? "Salvando…" : "Salvar nova senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
