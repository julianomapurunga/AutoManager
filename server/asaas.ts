/**
 * Cliente mínimo da API do Asaas (sem SDK, usando fetch nativo).
 *
 * Sandbox: https://api-sandbox.asaas.com/v3 (padrão)
 * Produção: https://api.asaas.com/v3 (defina ASAAS_API_URL no .env)
 *
 * A chave de API é obtida no painel do Asaas em:
 * Configurações da conta → Integrações → Chave de API
 */

const ASAAS_API_URL = process.env.ASAAS_API_URL || "https://api-sandbox.asaas.com/v3";
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

export function isAsaasConfigured(): boolean {
  return !!ASAAS_API_KEY;
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
  if (!ASAAS_API_KEY) {
    throw new Error("ASAAS_API_KEY não está definido no .env");
  }

  const res = await fetch(`${ASAAS_API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "VEHIRO",
      access_token: ASAAS_API_KEY,
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

export async function cancelSubscription(id: string): Promise<void> {
  await asaasFetch(`/subscriptions/${id}`, { method: "DELETE" });
}

/** Retorna as cobranças de uma assinatura (a primeira contém a invoiceUrl para pagamento). */
export async function getSubscriptionPayments(id: string): Promise<AsaasPayment[]> {
  const res = await asaasFetch<{ data: AsaasPayment[] }>(`/subscriptions/${id}/payments`);
  return res.data ?? [];
}
