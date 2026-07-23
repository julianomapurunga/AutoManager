/**
 * Estado de impersonation do super admin (acessar uma loja como Administrador).
 *
 * Guardamos só o ID da loja no localStorage para que:
 * - o apiFetch adicione o cabeçalho `X-Impersonate-Org` em toda chamada;
 * - o estado sobreviva a um reload da página.
 *
 * O servidor só honra o cabeçalho se o JWT for o do super admin (ver requireAuth),
 * então isto não concede acesso a mais ninguém — é apenas um interruptor de UI.
 */
const KEY = "vehiro_impersonate_org";

export function getImpersonateOrgId(): number | null {
  const v = localStorage.getItem(KEY);
  const n = v ? Number(v) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function setImpersonateOrgId(id: number | null): void {
  if (id == null) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, String(id));
}
