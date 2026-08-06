import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const ORG_PLANS = ["trial", "basico", "avancado", "profissional"] as const;
export type OrgPlan = (typeof ORG_PLANS)[number];

export const SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due", "canceled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const TRIAL_DAYS = 7;

/**
 * Definição dos planos do SaaS.
 * Preços em centavos. `null` = ilimitado.
 * Quando integrar o Stripe, mapeie cada plano para um Price ID.
 */
export const PLANS: Record<
  OrgPlan,
  {
    name: string;
    priceMonthly: number;
    maxVehicles: number | null;
    maxUsers: number | null;
    /** Integração com a Tabela FIPE (consulta, histórico e preenchimento automático). */
    fipeIntegration: boolean;
    /** Catálogo público de veículos (página /loja/:slug para clientes). */
    publicCatalog: boolean;
    stripePriceId?: string;
  }
> = {
  // O trial inclui tudo para o cliente experimentar durante o teste.
  trial: { name: "Teste Grátis", priceMonthly: 0, maxVehicles: 20, maxUsers: 3, fipeIntegration: true, publicCatalog: true },
  basico: { name: "Básico", priceMonthly: 9900, maxVehicles: 50, maxUsers: 5, fipeIntegration: false, publicCatalog: false },
  avancado: { name: "Avançado", priceMonthly: 17900, maxVehicles: 150, maxUsers: 10, fipeIntegration: true, publicCatalog: false },
  profissional: { name: "Profissional", priceMonthly: 39900, maxVehicles: null, maxUsers: null, fipeIntegration: true, publicCatalog: true },
};

/** Verifica se o plano da organização inclui a integração FIPE. */
export function planIncludesFipe(plan: string): boolean {
  return PLANS[plan as OrgPlan]?.fipeIntegration ?? false;
}

/** Verifica se o plano da organização inclui o catálogo público. */
export function planIncludesCatalog(plan: string): boolean {
  return PLANS[plan as OrgPlan]?.publicCatalog ?? false;
}

/** Regras do endereço público do catálogo (ex.: /loja/auto-center-silva). */
export const catalogSlugSchema = /^[a-z0-9][a-z0-9-]{2,49}$/;

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  document: text("document"), // CNPJ (opcional)
  phone: text("phone"),
  plan: text("plan", { enum: ORG_PLANS }).default("trial").notNull(),
  subscriptionStatus: text("subscription_status", { enum: SUBSCRIPTION_STATUSES })
    .default("trialing")
    .notNull(),
  trialEndsAt: timestamp("trial_ends_at"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  // Asaas (gateway de pagamento brasileiro)
  asaasCustomerId: text("asaas_customer_id"),
  asaasSubscriptionId: text("asaas_subscription_id"),
  /** Plano aguardando confirmação de pagamento no Asaas. */
  pendingPlan: text("pending_plan", { enum: ORG_PLANS }),
  // Cupom promocional aplicado à assinatura Asaas atual.
  // O Asaas não tem desconto por tempo limitado: a assinatura nasce com o valor
  // promocional e nós restauramos o valor cheio via PUT quando os ciclos acabam.
  /** Código do cupom em vigor; null quando não há promoção ativa. */
  couponCode: text("coupon_code"),
  /** Ciclos que o desconto cobre. null = permanente (nunca restaura o valor cheio). */
  couponCyclesTotal: integer("coupon_cycles_total"),
  /** Valor mensal cheio em centavos, restaurado no Asaas ao fim da promoção. */
  couponFullValue: integer("coupon_full_value"),
  /** Marca o resgate já contabilizado no usedCount — garante incremento único. */
  couponRedeemedAt: timestamp("coupon_redeemed_at"),
  // Catálogo público (plano Profissional)
  catalogSlug: text("catalog_slug").unique(),
  catalogEnabled: boolean("catalog_enabled").default(false).notNull(),
  catalogDescription: text("catalog_description"),
  catalogWhatsapp: text("catalog_whatsapp"),
  /** Banner (imagem full-width) exibido no topo do catálogo público. */
  catalogBannerPath: text("catalog_banner_path"),
  /** Cor de destaque (hex #rrggbb) que personaliza a página da loja. */
  catalogThemeColor: text("catalog_theme_color"),
  createdAt: timestamp("created_at").defaultNow(),
}).enableRLS();

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  plan: true,
  subscriptionStatus: true,
  trialEndsAt: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

/** Verifica se a organização tem acesso liberado ao sistema. */
export function hasActiveSubscription(org: Organization, now: Date = new Date()): boolean {
  if (org.subscriptionStatus === "active") return true;
  if (org.subscriptionStatus === "trialing") {
    return !org.trialEndsAt || org.trialEndsAt.getTime() > now.getTime();
  }
  return false;
}
