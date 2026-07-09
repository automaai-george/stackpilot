import { driver, type DriveStep } from "driver.js";
import { MARCA } from "@/lib/marca";

export const TOUR_FLAG = "stackpilot_tour_v1";

/** Um passo do tour; se `alvo` não estiver visível, o passo é descartado. */
type Passo = {
  alvo?: string; // seletor CSS (data-tour). Sem alvo = balão central.
  titulo: string;
  texto: string;
  lado?: "top" | "bottom" | "left" | "right";
};

function visivel(sel: string): boolean {
  const el = document.querySelector(sel);
  return !!el && el.getClientRects().length > 0;
}

const PASSOS: Passo[] = [
  {
    titulo: `Bem-vindo ao ${MARCA.nome}! ♠`,
    texto:
      "Em um minuto eu te mostro como controlar sua banca e sua carreira. Pode avançar — dá para pular a qualquer momento.",
  },
  {
    alvo: '[data-tour="menu-mobile"]',
    titulo: "Seu menu",
    texto: "Toque aqui sempre que quiser navegar entre as telas do app.",
    lado: "bottom",
  },
  {
    alvo: '[data-tour="menu-config"]',
    titulo: "1º passo: cadastre seus sites",
    texto:
      "Comece por Configurações. Lá você adiciona os sites em que joga (PokerStars, GG, ACR…) e suas carteiras digitais (Skrill, cripto…). É a base de tudo.",
    lado: "right",
  },
  {
    alvo: '[data-tour="menu-grind"]',
    titulo: "Todo dia: Iniciar grind",
    texto:
      "Aqui é a sua rotina. Um clique já começa a sessão com cronômetro; você lança a banca inicial de cada site e, no fim do dia, o saldo final. O lucro se calcula sozinho.",
    lado: "right",
  },
  {
    alvo: '[data-tour="menu-bankroll"]',
    titulo: "Bankroll: onde está seu dinheiro",
    texto:
      "Veja o saldo de cada site e carteira, defina seu Average Buy-in (com alertas de banca curta) e faça depósitos, saques e transferências — sem nunca gerar lucro ou prejuízo falso.",
    lado: "right",
  },
  {
    alvo: '[data-tour="menu-extrato"]',
    titulo: "Extrato",
    texto: "Todo saque, depósito e transferência entre suas contas fica registrado aqui.",
    lado: "right",
  },
  {
    alvo: '[data-tour="menu-meses"]',
    titulo: "Acompanhe a evolução",
    texto:
      "Em Meses e Anual você vê seus resultados mês a mês, com o mapa do ano mostrando cada dia — verde lucro, vermelho prejuízo.",
    lado: "right",
  },
  {
    alvo: '[data-tour="menu-torneios"]',
    titulo: "Torneios",
    texto: "Registre seus torneios e veja ROI, ITM% e seu ABI real calculados automaticamente.",
    lado: "right",
  },
  {
    alvo: '[data-tour="menu-stats"]',
    titulo: "Estatísticas de profissional",
    texto:
      "Downswing tracker, simulador de variância e seus recordes — para saber o que é matemática e o que é ajuste de jogo.",
    lado: "right",
  },
  {
    alvo: '[data-tour="filtro-periodo"]',
    titulo: "Filtre o período",
    texto: "No Dashboard você escolhe ver o mês atual, um ano inteiro ou todo o histórico.",
    lado: "bottom",
  },
  {
    alvo: '[data-tour="metas"]',
    titulo: "Metas com ritmo",
    texto:
      "Defina metas de dias jogados e lucro. As barras mostram se você está à frente ou atrás do ritmo, com projeção de fechamento.",
    lado: "top",
  },
  {
    titulo: "Pronto para começar! 🚀",
    texto:
      "Seu primeiro passo é cadastrar seus sites. Clique abaixo que eu te levo direto para lá.",
  },
];

/**
 * Roda o tour guiado (spotlight). Passos cujo alvo não está visível são
 * descartados — assim funciona tanto no desktop (menu lateral) quanto no
 * celular (menu recolhido).
 */
export function rodarTour(onConcluir?: () => void) {
  const passos: DriveStep[] = PASSOS.filter(
    (p) => !p.alvo || visivel(p.alvo)
  ).map((p) => ({
    element: p.alvo,
    popover: {
      title: p.titulo,
      description: p.texto,
      side: p.lado ?? "bottom",
      align: "start",
    },
  }));

  const d = driver({
    showProgress: true,
    progressText: "{{current}} de {{total}}",
    nextBtnText: "Próximo",
    prevBtnText: "Voltar",
    doneBtnText: "Cadastrar meus sites",
    overlayColor: "#0a1512",
    overlayOpacity: 0.75,
    stagePadding: 6,
    stageRadius: 10,
    // impede que clicar no item destacado (ex.: link do menu) saia do tour
    disableActiveInteraction: true,
    steps: passos,
    onDestroyStarted: () => {
      const concluiu = !d.hasNextStep();
      try {
        localStorage.setItem(TOUR_FLAG, "1");
      } catch {}
      d.destroy();
      if (concluiu) onConcluir?.();
    },
  });

  d.drive();
}
