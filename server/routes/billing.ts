import type { Express } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { requireAuth, requireRole } from "../auth";
import { rateLimit } from "../security";
import {
  organizations, PLANS, ORG_PLANS, hasActiveSubscription, type OrgPlan,
} from "@shared/models/tenancy";
import {
  isAsaasConfigured, createCustomer, createSubscription,
  cancelSubscription, getSubscriptionPayments,
} from "../asaas";

/**
 * Billing com Asaas (sandbox por padrão).
 *
 * Fluxo:
 * 1. Admin escolhe um plano → POST /api/billing/checkout
 *    → criamos o cliente e a assinatura mensal no Asaas e devolvemos a
 *      invoiceUrl da primeira cobrança (Pix, boleto ou cartão, à escolha).
 * 2. O Asaas chama POST /api/billing/webhook quando o pagamento é confirmado
 *    → ativamos o plano da organização.
 * 3. PAYMENT_OVERDUE → past_due; assinatura cancelada → canceled.
 */
export function registerBillingRoutes(app: Express): void {
  /** Status da assinatura + catálogo de planos. */
  app.get("/api/billing/status", requireAuth, async (req, res) => {
    const org = req.organization!;
    const now = new Date();
    const trialDaysLeft =
      org.subscriptionStatus === "trialing" && org.trialEndsAt
        ? Math.max(0, Math.ceil((org.trialEndsAt.getTime() - now.getTime()) / 86_400_000))
        : null;

    // Se há assinatura pendente, busca a fatura em aberto para reexibir o link
    let pendingInvoiceUrl: string | null = null;
    if (org.pendingPlan && org.asaasSubscriptionId && isAsaasConfigured()) {
      try {
        const payments = await getSubscriptionPayments(org.asaasSubscriptionId);
        const open = payments.find((p) => p.status === "PENDING" || p.status === "OVERDUE");
        pendingInvoiceUrl = open?.invoiceUrl ?? null;
      } catch {
        // silencioso: status ainda é exibido sem o link
      }
    }

    res.json({
      configured: isAsaasConfigured(),
      plan: org.plan,
      planName: PLANS[org.plan as OrgPlan]?.name ?? org.plan,
      subscriptionStatus: org.subscriptionStatus,
      trialEndsAt: org.trialEndsAt,
      trialDaysLeft,
      active: hasActiveSubscription(org),
      pendingPlan: org.pendingPlan,
      pendingInvoiceUrl,
      plans: PLANS,
    });
  });

  const checkoutLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });

  /** Cria a assinatura no Asaas e devolve o link de pagamento. */
  app.post(
    "/api/billing/checkout",
    requireAuth,
    requireRole("Administrador"),
    checkoutLimiter,
    async (req, res) => {
      try {
        if (!isAsaasConfigured()) {
          return res.status(503).json({
            message: "Pagamentos ainda não configurados. Defina ASAAS_API_KEY no servidor.",
          });
        }

        const input = z.object({
          plan: z.enum(ORG_PLANS).refine((p) => p !== "trial", "Plano inválido"),
        }).parse(req.body);

        const org = req.organization!;
        const user = req.user!;
        const plan = PLANS[input.plan];

        // 1. Cliente no Asaas (reusa se já existir)
        let customerId = org.asaasCustomerId;
        if (!customerId) {
          const customer = await createCustomer({
            name: org.name,
            email: user.email,
            cpfCnpj: (org.document || user.cpf).replace(/\D/g, ""),
            mobilePhone: (user.phone || "").replace(/\D/g, "") || undefined,
            externalReference: String(org.id),
          });
          customerId = customer.id;
        }

        // 2. Cancela assinatura anterior (troca de plano / nova tentativa)
        if (org.asaasSubscriptionId) {
          await cancelSubscription(org.asaasSubscriptionId).catch(() => {});
        }

        // 3. Assinatura mensal com primeira cobrança para hoje
        const today = new Date().toISOString().slice(0, 10);
        const subscription = await createSubscription({
          customer: customerId,
          value: plan.priceMonthly / 100, // Asaas usa reais, o sistema usa centavos
          description: `VEHIRO — Plano ${plan.name}`,
          externalReference: JSON.stringify({ organizationId: org.id, plan: input.plan }),
          nextDueDate: today,
        });

        // 4. Link de pagamento da primeira cobrança
        const payments = await getSubscriptionPayments(subscription.id);
        const invoiceUrl = payments[0]?.invoiceUrl ?? null;

        await db
          .update(organizations)
          .set({
            asaasCustomerId: customerId,
            asaasSubscriptionId: subscription.id,
            pendingPlan: input.plan,
          })
          .where(eq(organizations.id, org.id));

        res.json({
          invoiceUrl,
          message: "Assinatura criada. Conclua o pagamento para liberar o plano.",
        });
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({ message: err.errors[0].message });
        }
        console.error("Checkout error:", err);
        res.status(500).json({ message: err.message || "Erro ao criar assinatura" });
      }
    },
  );

  const syncLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

  /**
   * Sincronização manual: consulta o Asaas e ativa o plano se a fatura foi paga.
   * Usada pelo botão "Já paguei, atualizar" — funciona mesmo sem webhook
   * (essencial em testes locais, onde o túnel pode cair).
   */
  app.post("/api/billing/sync", requireAuth, syncLimiter, async (req, res) => {
    try {
      const org = req.organization!;
      if (!isAsaasConfigured() || !org.asaasSubscriptionId) {
        return res.json({ updated: false, status: org.subscriptionStatus });
      }

      const payments = await getSubscriptionPayments(org.asaasSubscriptionId);
      const PAID = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];
      const hasPaid = payments.some((p) => PAID.includes(p.status));
      const hasOverdue = payments.some((p) => p.status === "OVERDUE");

      if (hasPaid && (org.pendingPlan || org.subscriptionStatus !== "active")) {
        const newPlan = (org.pendingPlan as OrgPlan | null) ?? (org.plan as OrgPlan);
        await db.update(organizations).set({
          plan: newPlan,
          subscriptionStatus: "active",
          pendingPlan: null,
        }).where(eq(organizations.id, org.id));
        console.log(`[billing] Org ${org.id} ativada no plano ${newPlan} (sync manual)`);
        return res.json({ updated: true, status: "active", plan: newPlan });
      }

      if (!hasPaid && hasOverdue && org.subscriptionStatus === "active") {
        await db.update(organizations).set({ subscriptionStatus: "past_due" })
          .where(eq(organizations.id, org.id));
        return res.json({ updated: true, status: "past_due" });
      }

      res.json({ updated: false, status: org.subscriptionStatus });
    } catch (err) {
      console.error("Sync error:", err);
      res.status(500).json({ message: "Erro ao consultar o Asaas" });
    }
  });

  /**
   * Webhook do Asaas.
   * Configure no painel: Integrações → Webhooks → URL {SEU_DOMINIO}/api/billing/webhook
   * e defina um "Token de autenticação" igual ao ASAAS_WEBHOOK_TOKEN do .env.
   */
  app.post("/api/billing/webhook", async (req, res) => {
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (expectedToken && req.headers["asaas-access-token"] !== expectedToken) {
      return res.status(401).json({ message: "Token inválido" });
    }

    try {
      const event = String(req.body?.event ?? "");
      const payment = req.body?.payment;

      // Localiza a organização: primeiro pelo externalReference, depois pela assinatura
      let orgId: number | null = null;
      let plan: OrgPlan | null = null;

      if (payment?.externalReference) {
        try {
          const ref = JSON.parse(payment.externalReference);
          if (ref?.organizationId) orgId = Number(ref.organizationId);
          if (ref?.plan && (ORG_PLANS as readonly string[]).includes(ref.plan)) plan = ref.plan;
        } catch {
          /* externalReference em formato desconhecido */
        }
      }

      let org = null;
      if (orgId) {
        [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
      } else if (payment?.subscription) {
        [org] = await db.select().from(organizations)
          .where(eq(organizations.asaasSubscriptionId, String(payment.subscription)));
      }

      if (!org) {
        // Responde 200 para o Asaas não reenviar eternamente um evento órfão
        return res.json({ received: true, matched: false });
      }

      switch (event) {
        case "PAYMENT_CONFIRMED":
        case "PAYMENT_RECEIVED": {
          const newPlan = plan ?? (org.pendingPlan as OrgPlan | null) ?? (org.plan as OrgPlan);
          await db.update(organizations).set({
            plan: newPlan,
            subscriptionStatus: "active",
            pendingPlan: null,
          }).where(eq(organizations.id, org.id));
          console.log(`[billing] Org ${org.id} ativada no plano ${newPlan} (${event})`);
          break;
        }
        case "PAYMENT_OVERDUE": {
          await db.update(organizations).set({
            subscriptionStatus: "past_due",
          }).where(eq(organizations.id, org.id));
          console.log(`[billing] Org ${org.id} marcada como past_due`);
          break;
        }
        case "PAYMENT_REFUNDED":
        case "SUBSCRIPTION_DELETED": {
          await db.update(organizations).set({
            subscriptionStatus: "canceled",
            pendingPlan: null,
          }).where(eq(organizations.id, org.id));
          console.log(`[billing] Org ${org.id} cancelada (${event})`);
          break;
        }
        default:
          // Demais eventos são ignorados
          break;
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook error:", err);
      // 500 faz o Asaas reenviar depois — desejável em falha transitória
      res.status(500).json({ message: "Erro ao processar webhook" });
    }
  });
}
