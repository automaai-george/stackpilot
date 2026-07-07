"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChartSpline,
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Spade,
  Trophy,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MARCA } from "@/lib/marca";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const ANO_ATUAL = new Date().getFullYear();

function NavLink({
  href,
  icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

function Secao({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      {titulo && (
        <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          {titulo}
        </div>
      )}
      {children}
    </div>
  );
}

function SidebarContent({
  anoSel,
  onNavigate,
}: {
  anoSel: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col p-4">
      <Link
        href="/"
        onClick={onNavigate}
        className="mb-3 flex items-center gap-2 px-2"
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Spade className="size-4.5" />
        </span>
        <span className="text-base font-semibold tracking-tight">
          {MARCA.nome}
        </span>
      </Link>

      <Secao>
        <NavLink
          href="/grind"
          icon={<Flame className="size-4" />}
          label="Iniciar grind"
          active={pathname.startsWith("/grind")}
          onClick={onNavigate}
        />
        <NavLink
          href="/"
          icon={<LayoutDashboard className="size-4" />}
          label="Dashboard"
          active={pathname === "/"}
          onClick={onNavigate}
        />
        <NavLink
          href="/bankroll"
          icon={<Wallet className="size-4" />}
          label="Bankroll"
          active={pathname.startsWith("/bankroll")}
          onClick={onNavigate}
        />
        <NavLink
          href="/extrato"
          icon={<Receipt className="size-4" />}
          label="Extrato"
          active={pathname.startsWith("/extrato")}
          onClick={onNavigate}
        />
      </Secao>

      <Secao titulo="Análise">
        <NavLink
          href="/meses"
          icon={<CalendarDays className="size-4" />}
          label="Meses"
          active={pathname === "/meses" || pathname.startsWith("/mes/")}
          onClick={onNavigate}
        />
        <NavLink
          href="/torneios"
          icon={<Trophy className="size-4" />}
          label="Torneios"
          active={pathname.startsWith("/torneios")}
          onClick={onNavigate}
        />
        <NavLink
          href={`/anual/${anoSel}`}
          icon={<ChartSpline className="size-4" />}
          label="Anual"
          active={pathname.startsWith("/anual")}
          onClick={onNavigate}
        />
        <NavLink
          href="/estatisticas"
          icon={<BarChart3 className="size-4" />}
          label="Estatísticas"
          active={pathname.startsWith("/estatisticas")}
          onClick={onNavigate}
        />
      </Secao>

      <Secao titulo="Sistema">
        <NavLink
          href="/config"
          icon={<Settings className="size-4" />}
          label="Configurações"
          active={pathname.startsWith("/config")}
          onClick={onNavigate}
        />
      </Secao>

      <div className="mt-auto flex items-center justify-between border-t px-2 pt-3">
        <button
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          onClick={async () => {
            await fetch("/api/logout", { method: "POST" });
            window.location.href = "/login";
          }}
        >
          <LogOut className="size-3.5" />
          Sair
        </button>
        <ThemeToggle />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [anoSel, setAnoSel] = useState(ANO_ATUAL);
  const pathname = usePathname();

  // O link "Anual" segue o ano da página em que você está
  useEffect(() => {
    const m = pathname.match(/^\/(?:mes|anual|relatorio)\/(\d{4})/);
    if (m) setAnoSel(Number(m[1]));
  }, [pathname]);

  // telas públicas (login, cadastro, landing) não têm menu lateral
  if (pathname === "/login" || pathname === "/registro" || pathname === "/lp") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r bg-sidebar lg:block print:hidden">
        <SidebarContent anoSel={anoSel} />
      </aside>

      {/* Topbar mobile */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-3 backdrop-blur lg:hidden print:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <span className="font-semibold tracking-tight">{MARCA.nome}</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 border-r bg-sidebar shadow-xl animate-in slide-in-from-left duration-200">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Fechar menu"
              className="absolute right-2 top-2"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </Button>
            <SidebarContent anoSel={anoSel} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 pt-14 lg:pl-60 lg:pt-0 print:pl-0 print:pt-0">
        <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8 print:p-0">{children}</div>
      </main>
    </div>
  );
}
