import { GrindClient } from "@/components/grind/grind-client";

// A data "de hoje" é decidida no navegador (fuso do usuário),
// por isso esta página é só um casulo para o componente cliente.
export default function GrindPage() {
  return <GrindClient />;
}
