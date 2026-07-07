import Link from "next/link";
import type { Metadata } from "next";
import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Flame,
  Gauge,
  LineChart,
  NotebookPen,
  Spade,
  Target,
  Trophy,
  Wallet,
} from "lucide-react";
import { MARCA } from "@/lib/marca";

export const metadata: Metadata = {
  title: `${MARCA.nome} — bankroll e carreira para jogadores de poker`,
  description:
    "Grind diário com cronômetro, gestão de banca por buy-ins, simulador de variância, ROI de torneios e metas com ritmo. Grátis durante o beta.",
};

const RECURSOS = [
  {
    icone: Flame,
    titulo: "Grind diário sem fricção",
    texto:
      "Um clique inicia a sessão com cronômetro. Banca inicial sugerida, saldo no fim — o resto o app calcula.",
  },
  {
    icone: Gauge,
    titulo: "Gestão por buy-ins",
    texto:
      "Defina seu ABI e veja sua banca em buy-ins, com alertas de banca curta e de hora de sacar ou subir de stake.",
  },
  {
    icone: LineChart,
    titulo: "Variância sem pânico",
    texto:
      "Downswing tracker e simulador Monte Carlo com os seus números: saiba o que é matemática e o que é leak.",
  },
  {
    icone: Trophy,
    titulo: "Torneios com ROI e ITM",
    texto:
      "Cada torneio registrado refina seu ROI, ITM% e o ABI real — decisões de stake com dado, não achismo.",
  },
  {
    icone: Target,
    titulo: "Metas com ritmo",
    texto:
      "Metas de volume e lucro com marcador de pace: saiba se está à frente ou atrás — e a projeção de fechamento.",
  },
  {
    icone: NotebookPen,
    titulo: "Mental game rastreado",
    texto:
      "Checklist pré-sessão, jogo A/B/C e notas de tilt cruzados com o resultado. Seu coach vai agradecer.",
  },
];

const PASSOS = [
  {
    n: "1",
    titulo: "Crie a conta e cadastre seus sites",
    texto: "PokerStars, GG, ACR, o que você jogar — mais suas carteiras (Skrill, crypto…).",
  },
  {
    n: "2",
    titulo: "Aperte “Iniciar grind”",
    texto: "Banca inicial em um clique, cronômetro rodando. No fim do dia, feche os saldos.",
  },
  {
    n: "3",
    titulo: "Veja tudo se calcular sozinho",
    texto: "Lucro, banca total, buy-ins, metas, heatmap do ano, relatórios — em tempo real.",
  },
];

const FAQ = [
  {
    p: "Meus dados ficam seguros?",
    r: "Sua conta é individual, protegida por senha com hash forte, e seus dados só aparecem para você. Além disso, você pode exportar tudo em Excel quando quiser — o dado é seu.",
  },
  {
    p: "Funciona no celular?",
    r: "Sim — o app é responsivo e instalável (PWA): adicione à tela inicial e use como app nativo.",
  },
  {
    p: "Serve para cash game, MTT e spins?",
    r: "Sim. O registro é por caixa de site (serve para qualquer modalidade) e há um tracker específico de torneios com ROI e ITM.",
  },
  {
    p: "Quanto custa?",
    r: "Grátis durante o beta. Quando lançarmos planos pagos, quem entrou no beta terá condição especial.",
  },
];

function MockPainel() {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm">
      <div className="flex items-center justify-between text-xs text-white/40">
        <span className="flex items-center gap-1.5">
          <Spade className="size-3.5 text-emerald-300" /> {MARCA.nome} · Dashboard
        </span>
        <span>Julho</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { t: "Banca total", v: "$12.480", cor: "text-white" },
          { t: "Lucro do mês", v: "+$1.847", cor: "text-emerald-300" },
          { t: "Buy-ins", v: "227", cor: "text-emerald-300" },
          { t: "Lucro/hora", v: "$18,40", cor: "text-white" },
        ].map((c) => (
          <div key={c.t} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/35">{c.t}</div>
            <div className={`mt-1 text-lg font-semibold tabular-nums ${c.cor}`}>{c.v}</div>
          </div>
        ))}
      </div>
      {/* meta com pace */}
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex justify-between text-[11px] text-white/45">
          <span>Meta de horas · 120h</span>
          <span className="text-emerald-300">2h à frente do ritmo</span>
        </div>
        <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[62%] rounded-full bg-emerald-400" />
          <div className="absolute top-0 h-full w-0.5 bg-white/70" style={{ left: "60%" }} />
        </div>
      </div>
      {/* heatmap fake */}
      <div className="mt-4 flex flex-wrap gap-1">
        {[2,0,1,3,0,2,1,0,3,2,1,0,0,2,3,1,2,0,1,2,3,0,1,2,0,3,2,1,0,2,1,3,2,0,1,2].map((v, i) => (
          <span
            key={i}
            className={`size-2.5 rounded-[2px] ${
              v === 0 ? "bg-white/10" : v === 1 ? "bg-emerald-400/40" : v === 2 ? "bg-emerald-400/70" : "bg-emerald-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="fundo-feltro padrao-naipes min-h-dvh text-white">
      {/* Navegação */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/30">
            <Spade className="size-4" />
          </span>
          {MARCA.nome}
        </span>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:text-white"
          >
            Entrar
          </Link>
          <Link
            href="/registro"
            className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-300"
          >
            Criar conta grátis
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 text-center sm:pt-16">
        <p className="mx-auto mb-4 w-fit rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
          Beta aberto · grátis
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Pare de gerenciar sua carreira de poker{" "}
          <span className="text-emerald-300">numa planilha</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-white/55 sm:text-lg">
          {MARCA.nome} acompanha seu grind, sua banca em buy-ins, sua variância e
          suas metas — para você decidir stake, volume e saque com dado, não com
          feeling.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/registro"
            className="flex items-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-emerald-950 shadow-lg shadow-emerald-400/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-300"
          >
            Começar grátis agora
            <ChevronRight className="size-4" />
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-white/15 px-6 py-3 font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white"
          >
            Já tenho conta
          </Link>
        </div>
        <p className="mt-3 text-xs text-white/35">
          Sem cartão de crédito · seus dados exportáveis quando quiser
        </p>

        <div className="mt-12">
          <MockPainel />
        </div>
      </section>

      {/* Recursos */}
      <section className="border-t border-white/5 bg-black/20 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Feito para a rotina de quem vive de poker
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map((r) => (
              <div
                key={r.titulo}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-emerald-300/30"
              >
                <r.icone className="size-5 text-emerald-300" />
                <h3 className="mt-3 font-semibold">{r.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/50">{r.texto}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-white/40">
            <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" /> Heatmap do ano</span>
            <span className="flex items-center gap-1.5"><Wallet className="size-3.5" /> Sites + carteiras num lugar</span>
            <span className="flex items-center gap-1.5"><Clock className="size-3.5" /> Multi-sessão com cronômetro</span>
            <span className="flex items-center gap-1.5"><BarChart3 className="size-3.5" /> Relatórios mensais em PDF</span>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-5">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            No ar em 3 minutos
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {PASSOS.map((p) => (
              <div key={p.n} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <span className="flex size-8 items-center justify-center rounded-full bg-emerald-400/15 text-sm font-bold text-emerald-300 ring-1 ring-emerald-300/30">
                  {p.n}
                </span>
                <h3 className="mt-3 font-semibold">{p.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/50">{p.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preço */}
      <section className="border-t border-white/5 bg-black/20 py-16">
        <div className="mx-auto max-w-md px-5 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Grátis durante o beta
          </h2>
          <div className="mt-8 rounded-2xl border border-emerald-300/30 bg-white/[0.04] p-7">
            <div className="text-4xl font-semibold">
              R$ 0<span className="text-base font-normal text-white/40">/mês</span>
            </div>
            <ul className="mt-5 space-y-2 text-left text-sm text-white/70">
              {[
                "Todos os recursos, sem limite de registros",
                "Sites e carteiras ilimitados",
                "Exportação completa em Excel",
                "Condição especial quando os planos chegarem",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/registro"
              className="mt-6 block rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-emerald-950 transition-colors hover:bg-emerald-300"
            >
              Garantir minha vaga no beta
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="mx-auto max-w-2xl px-5">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Perguntas frequentes
          </h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((f) => (
              <details
                key={f.p}
                className="group rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4"
              >
                <summary className="cursor-pointer list-none font-medium marker:hidden">
                  {f.p}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{f.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-white/5 bg-black/20 py-16 text-center">
        <div className="mx-auto max-w-2xl px-5">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Seu próximo upswing começa com controle.
          </h2>
          <Link
            href="/registro"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-7 py-3.5 font-semibold text-emerald-950 shadow-lg shadow-emerald-400/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-300"
          >
            Criar conta grátis
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-xs text-white/30">
        <p className="flex items-center justify-center gap-2">
          <Spade className="size-3.5" /> {MARCA.nome} — {MARCA.slogan}
        </p>
        <p className="mt-2 tracking-widest">♠ ♥ ♦ ♣</p>
        <p className="mt-3 text-white/20">
          Jogue com responsabilidade. {MARCA.nome} é uma ferramenta de gestão, não incentivo a jogo.
        </p>
      </footer>
    </div>
  );
}
