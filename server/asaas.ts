/**
 * Cliente mínimo da API do Asaas (sem SDK, usando fetch nativo).
 *
 * Sandbox: https://api-sandbox.asaas.com/v3 (padrão)
 * Produção: https://api.asaas.com/v3 (defina ASAAS_API_URL no .env)
 *
 * A chave de API é obtida no painel do Asaas em:
 * Configurações da conta → Integrações → Chave de API
 */

import { getSetting } from "./settings";

export type AsaasEnv = "sandbox" | "production";

const URLS: Record<AsaasEnv, string> = {
  sandbox: process.env.ASAAS_API_URL || "https://api-sandbox.asaas.com/v3",
  production: "https://api.asaas.com/v3",
};

/**
 * Configuração dinâmica: o painel do super admin grava no banco
 * (asaas_env, asaas_api_key_sandbox, asaas_api_key_production);
 * o .env é o fallback quando nada foi definido no painel.
 */
export function getAsaasConfig(): { env: AsaasEnv; apiKey: string | undefined; baseUrl: string } {
  const env = (getSetting("asaas_env") as AsaasEnv) || "sandbox";
  const dbKey = getSetting(`asaas_api_key_${env}`);
  // fallback do .env vale apenas para o sandbox (chaves são diferentes por ambiente)
  const apiKey = dbKey || (env === "sandbox" ? process.env.ASAAS_API_KEY : undefined);
  return { env, apiKey, baseUrl: URLS[env] };
}

export function isAsaasConfigured(): boolean {
  return !!getAsaasConfig().apiKey;
}

class AsaasError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
  }
}

async function asaasFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { apiKey, baseUrl } = getAsaasConfig();
  if (!apiKey) {
    throw new Error("Chave de API do Asaas não configurada (painel Admin > Configurações ou .env)");
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "VEHIRO",
      access_token: apiKey,
      ...(options.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const description =
      (body as any)?.errors?.[0]?.description || `Asaas respondeu ${res.status}`;
    console.error("Asaas error:", res.status, JSON.stringify(body));
    throw new AsaasError(description, res.status, body);
  }
  return body as T;
}

// ─── Tipos (apenas os campos que usamos) ─────────────────────────────────────

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
}

export interface AsaasSubscription {
  id: string;
  status: string;
  value: number;
}

export interface AsaasPayment {
  id: string;
  status: string;
  value: number;
  invoiceUrl: string;
  subscription?: string;
  externalReference?: string;
}

// ─── Operações ───────────────────────────────────────────────────────────────

export async function createCustomer(data: {
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone?: string;
  externalReference?: string;
}): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function createSubscription(data: {
  customer: string;
  value: number; // em reais (ex.: 99.0), não centavos
  description: string;
  externalReference: string;
  nextDueDate: string; // YYYY-MM-DD
}): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      // UNDEFINED deixa o cliente escolher Pix, boleto ou cartão na fatura
      billingType: "UNDEFINED",
      cycle: "MONTHLY",
    }),
  });
}

/**
 * Atualiza uma assinatura existente.
 *
 * `updatePendingPayments: true` é essencial ao trocar o `value`: o Asaas gera a
 * próxima cobrança antes do vencimento, então a cobrança seguinte já pode existir
 * com o valor antigo — e por padrão "cobranças já criadas permanecem inalteradas".
 * Sem isso, o cliente ganharia um ciclo extra de desconto.
 */
export async function updateSubscription(
  id: string,
  data: { value?: number; description?: string; updatePendingPayments?: boolean },
): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function cancelSubscription(id: string): Promise<void> {
  await asaasFetch(`/subscriptions/${id}`, { method: "DELETE" });
}

/** Retorna as cobranças de uma assinatura (a primeira contém a invoiceUrl para pagamento). */
export async function getSubscriptionPayments(id: string): Promise<AsaasPayment[]> {
  const res = await asaasFetch<{ data: AsaasPayment[] }>(`/subscriptions/${id}/payments`);
  return res.data ?? [];
}

export interface AsaasPaymentDetail extends AsaasPayment {
  customer: string;
  dueDate: string;
  paymentDate?: string | null;
  billingType: string;
  description?: string;
  /** Valor líquido após as taxas do Asaas (disponível em cobranças pagas). */
  netValue?: number | null;
}

/** Últimas cobranças da conta (painel do super admin). */
export async function listRecentPayments(limit = 30): Promise<AsaasPaymentDetail[]> {
  const res = await asaasFetch<{ data: AsaasPaymentDetail[] }>(`/payments?limit=${limit}&offset=0`);
  return res.data ?? [];
}

/** Testa a conexão/chave atual (lista 1 cliente). */
export async function pingAsaas(): Promise<void> {
  await asaasFetch("/customers?limit=1");
}
