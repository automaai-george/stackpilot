"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import "driver.js/dist/driver.css";
import { rodarTour, TOUR_FLAG } from "@/lib/tour";

/**
 * Dispara o tour guiado no primeiro acesso e escuta o evento
 * "stackpilot:tour" para refazê-lo a pedido (botão em Configurações).
 */
export function TourLauncher() {
  const router = useRouter();

  useEffect(() => {
    const irParaConfig = () => router.push("/config");

    // primeiro acesso: espera o layout assentar e começa
    let visto = "1";
    try {
      visto = localStorage.getItem(TOUR_FLAG) ?? "";
    } catch {}
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!visto) {
      timer = setTimeout(() => rodarTour(irParaConfig), 900);
    }

    const refazer = () => rodarTour(irParaConfig);
    window.addEventListener("stackpilot:tour", refazer);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("stackpilot:tour", refazer);
    };
  }, [router]);

  return null;
}
