import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESSAO, uidDoToken } from "@/lib/auth";

/** Id do usuário logado (server components e route handlers), ou null */
export async function uidAtual(): Promise<number | null> {
  const jar = await cookies();
  return uidDoToken(jar.get(COOKIE_SESSAO)?.value);
}

/** Exige sessão em páginas — sem login, redireciona */
export async function exigirUid(): Promise<number> {
  const uid = await uidAtual();
  if (uid === null) redirect("/login");
  return uid;
}
