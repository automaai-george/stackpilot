"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail, Spade, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MARCA } from "@/lib/marca";

/** Formulário compartilhado de login e cadastro, no visual de feltro */
export function FormularioAuth({ modo }: { modo: "login" | "registro" }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch(modo === "login" ? "/api/login" : "/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modo === "login" ? { email, senha } : { nome, email, senha }),
      });
      if (res.ok) {
        router.replace("/");
        router.refresh();
        return;
      }
      const body = await res.json().catch(() => ({}));
      setErro(body.error ?? "Algo deu errado — tente de novo");
    } catch {
      setErro("Erro de conexão");
    } finally {
      setEnviando(false);
    }
  }

  const estiloInput =
    "h-11 border-white/10 bg-white/[0.06] pl-9 text-white placeholder:text-white/30 focus-visible:border-emerald-300/50 focus-visible:ring-emerald-300/20";

  return (
    <div className="fundo-feltro padrao-naipes flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm animar-surgir">
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-8 shadow-2xl backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/30">
              <Spade className="size-7" />
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white">
                {MARCA.nome}
              </h1>
              <p className="mt-1 text-sm text-white/50">
                {modo === "login"
                  ? "Bom te ver de novo. Bora grindar?"
                  : "Crie sua conta grátis e assuma o controle."}
              </p>
            </div>
          </div>

          <form onSubmit={enviar} className="mt-7 space-y-3">
            {modo === "registro" && (
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
                <Input
                  placeholder="Seu nome (opcional)"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className={estiloInput}
                  aria-label="Nome"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
              <Input
                type="email"
                autoFocus
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={estiloInput}
                aria-label="E-mail"
              />
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
              <Input
                type="password"
                placeholder={modo === "registro" ? "Senha (mínimo 8 caracteres)" : "Senha"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className={estiloInput}
                aria-label="Senha"
              />
            </div>
            {erro && <p className="text-sm text-red-300">{erro}</p>}
            <Button
              type="submit"
              className="h-11 w-full bg-emerald-400 text-emerald-950 hover:bg-emerald-300"
              disabled={enviando || !email || !senha}
            >
              {enviando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : modo === "login" ? (
                "Entrar"
              ) : (
                "Criar conta grátis"
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-white/40">
            {modo === "login" ? (
              <>
                Ainda não tem conta?{" "}
                <Link href="/registro" className="text-emerald-300 hover:underline">
                  Crie grátis
                </Link>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <Link href="/login" className="text-emerald-300 hover:underline">
                  Entrar
                </Link>
              </>
            )}
          </p>
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-[11px] tracking-widest text-white/25">
          ♠ ♥ ♦ ♣
        </p>
      </div>
    </div>
  );
}
