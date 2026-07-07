import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** Gera o hash de uma senha (scrypt + sal aleatório) */
export function hashSenha(senha: string): string {
  const sal = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, sal, 64).toString("hex");
  return `${sal}:${hash}`;
}

/** Compara senha com hash em tempo constante */
export function senhaConfere(senha: string, salEHash: string): boolean {
  const [sal, hash] = salEHash.split(":");
  if (!sal || !hash) return false;
  const alvo = Buffer.from(hash, "hex");
  const calculado = scryptSync(senha, sal, 64);
  return alvo.length === calculado.length && timingSafeEqual(alvo, calculado);
}
