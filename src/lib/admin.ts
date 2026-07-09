// O dono do SaaS (id 1) tem acesso ao painel de administração.
export const DONO_ID = 1;

export function EH_DONO(uid: number | null): boolean {
  return uid === DONO_ID;
}
