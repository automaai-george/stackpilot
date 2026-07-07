import { SignJWT, jwtVerify } from "jose";

export const COOKIE_SESSAO = "poker_sessao";
const DURACAO = "30d";

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET não configurado (mínimo 32 caracteres)");
  }
  return new TextEncoder().encode(s);
}

/** Cria o token de sessão de um usuário */
export async function criarToken(usuarioId: number): Promise<string> {
  return new SignJWT({ uid: usuarioId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(DURACAO)
    .sign(secret());
}

/** Devolve o id do usuário do token, ou null se inválido/expirado */
export async function uidDoToken(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const uid = payload.uid;
    return typeof uid === "number" && Number.isInteger(uid) ? uid : null;
  } catch {
    return null;
  }
}
