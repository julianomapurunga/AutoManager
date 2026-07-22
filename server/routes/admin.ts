import type { Express } from "express";
import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { requireSuperAdmin } from "../auth";
import { supportTickets, coupons, vehicles } from "@shared/schema";
import { users } from "@shared/models/auth";
import { organizations, PLANS, hasActiveSubscription, type OrgPlan } from "@shared/models/tenancy";
import { isAsaasConfigured, listRecentPayments, getAsaasConfig, pingAsaas } from "../asaas";
import { getSetting, setSetting, deleteSetting } from "../settings";
import { formatTicketNumber } from "./support";

/**
 * Painel do dono do SaaS. Todas as rotas exigem o SUPER_ADMIN_EMAIL —
 * uma conta do Supabase Auth que NÃO pertence a nenhuma loja.
 */
export function registerAdminRoutes(app: Express): void {
  /** Identidade do painel (usado pelo front para confirmar acesso). */
  app.get("/api/admin/me", requireSuperAdmin, (_req, res) => {
    res.json({ superAdmin: true });
  });

  /** Visão geral da plataforma. */
  app.get("/api/admin/overview", requireSuperAdmin, async (_req, res) => {
    try {
      const orgs = await db.select().from(organizations);
      const [userCount] = await db.select({ n: sql<number>`count(*)` }).from(users);
      const [ticketCount] = await db.select({ n: sql<number>`count(*)` }).from(supportTickets);
      const [vehicleCount] = await db.select({ n: sql<number>`count(*)` }).from(vehicles);

      const byPlan: Record<string, number> = {};
      let activeSubscriptions = 0;
      let trialing = 0;
      let mrr = 0; // receita mensal recorrente estimada (centavos)

      for (const org of orgs) {
        byPlan[org.plan] = (byPlan[org.plan] ?? 0) + 1;
        if (org.subscriptionStatus === "active") {
          activeSubscriptions++;
          mrr += PLANS[org.plan as OrgPlan]?.priceMonthly ?? 0;
        }
        if (org.subscriptionStatus === "trialing" && hasActiveSubscription(org)) trialing++;
      }

      res.json({
        totalOrganizations: orgs.length,
        totalUsers: Number(userCount?.n ?? 0),
        totalVehicles: Number(vehicleCount?.n ?? 0),
        totalTickets: Number(ticketCount?.n ?? 0),
        activeSubscriptions,
        trialing,
        mrr,
        byPlan,
      });
    } catch (err) {
      console.error("Admin overview error:", err);
      res.status(500).json({ message: "Erro ao carregar visão geral" });
    }
  });

  /** Lojas cadastradas, com contagem de usuários e veículos. */
  app.get("/api/admin/organizations", requireSuperAdmin, async (_req, res) => {
    try {
      const rows = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          plan: organizations.plan,
          subscriptionStatus: organizations.subscriptionStatus,
          trialEndsAt: organizations.trialEndsAt,
          pendingPlan: organizations.pendingPlan,
          createdAt: organizations.createdAt,
          userCount: sql<number>`(select count(*) from users u where u.organization_id = ${organizations.id})`,
          vehicleCount: sql<number>`(select count(*) from vehicles v where v.organization_id = ${organizations.id})`,
          adminEmail: sql<string | null>`(select u.email from users u where u.organization_id = ${organizations.id} and u.role = 'Administrador' limit 1)`,
        })
        .from(organizations)
        .orderBy(desc(organizations.createdAt));

      res.json(rows.map((r) => ({
        ...r,
        userCount: Number(r.userCount),
        vehicleCount: Number(r.vehicleCount),
        planName: PLANS[r.plan as OrgPlan]?.name ?? r.plan,
      })));
    } catch (err) {
      console.error("Admin orgs error:", err);
      res.status(500).json({ message: "Erro ao listar lojas" });
    }
  });

  /** Todos os chamados de suporte da plataforma. */
  app.get("/api/admin/tickets", requireSuperAdmin, async (_req, res) => {
    try {
      const rows = await db
        .select({
          id: supportTickets.id,
          category: supportTickets.category,
          message: supportTickets.message,
          emailSent: supportTickets.emailSent,
          createdAt: supportTickets.createdAt,
          orgName: organizations.name,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
        })
        .from(supportTickets)
        .leftJoin(organizations, eq(supportTickets.organizationId, organizations.id))
        .leftJoin(users, eq(supportTickets.userId, users.id))
        .orderBy(desc(supportTickets.createdAt))
        .limit(100);

      res.json(rows.map((r) => ({
        ...r,
        ticketNumber: formatTicketNumber(r.id),
        openedBy: [r.userFirstName, r.userLastName].filter(Boolean).join(" ") || "—",
      })));
    } catch (err) {
      console.error("Admin tickets error:", err);
      res.status(500).json({ message: "Erro ao listar chamados" });
    }
  });

  /** Últimas cobranças no Asaas + resumo financeiro da plataforma. */
  app.get("/api/admin/payments", requireSuperAdmin, async (_req, res) => {
    try {
      if (!isAsaasConfigured()) {
        return res.json({ configured: false, payments: [], summary: null });
      }
      const payments = await listRecentPayments(100);

      const PAID = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];
      let revenue = 0;        // faturamento bruto (pagos), em reais
      let netRevenue = 0;     // líquido após taxas do Asaas, em reais
      let overdueCount = 0;   // desistências: faturas vencidas sem pagamento
      let overdueValue = 0;
      let refundedCount = 0;  // estornos
      let refundedValue = 0;

      for (const p of payments) {
        if (PAID.includes(p.status)) {
          revenue += p.value;
          netRevenue += p.netValue ?? p.value;
        } else if (p.status === "OVERDUE") {
          overdueCount++;
          overdueValue += p.value;
        } else if (p.status === "REFUNDED") {
          refundedCount++;
          refundedValue += p.value;
        }
      }

      // Assinaturas canceladas (lojas que assinaram e cancelaram)
      const [canceled] = await db
        .select({ n: sql<number>`count(*)` })
        .from(organizations)
        .where(eq(organizations.subscriptionStatus, "canceled"));

      res.json({
        configured: true,
        payments: payments.slice(0, 30),
        summary: {
          revenue,
          netRevenue,
          paidCount: payments.filter((p) => PAID.includes(p.status)).length,
          overdueCount,
          overdueValue,
          refundedCount,
          refundedValue,
          canceledOrgs: Number(canceled?.n ?? 0),
        },
      });
    } catch (err) {
      console.error("Admin payments error:", err);
      res.status(500).json({ message: "Erro ao consultar pagamentos no Asaas" });
    }
  });

  // ─── Cupons ─────────────────────────────────────────────────────────────

  const couponSchema = z.object({
    code: z.string().min(3, "Mínimo 3 caracteres").max(30)
      .regex(/^[A-Z0-9-]+$/, "Use letras maiúsculas, números e hífens"),
    percentOff: z.number().int().min(1, "Mínimo 1%").max(100, "Máximo 100%"),
    /** 1 = só a primeira mensalidade, 3 ou 6 meses; null = permanente. */
    durationCycles: z.union([z.literal(1), z.literal(3), z.literal(6)])
      .nullable().optional(),
    maxUses: z.number().int().min(1).nullable().optional(),
    expiresAt: z.string().nullable().optional(), // YYYY-MM-DD
  });

  app.get("/api/admin/coupons", requireSuperAdmin, async (_req, res) => {
    const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    res.json(rows);
  });

  app.post("/api/admin/coupons", requireSuperAdmin, async (req, res) => {
    try {
      const input = couponSchema.parse(req.body);
      const [existing] = await db.select().from(coupons).where(eq(coupons.code, input.code));
      if (existing) {
        return res.status(400).json({ message: "Já existe um cupom com este código", field: "code" });
      }
      const [coupon] = await db.insert(coupons).values({
        code: input.code,
        percentOff: input.percentOff,
        durationCycles: input.durationCycles ?? null,
        maxUses: input.maxUses ?? null,
        expiresAt: input.expiresAt ? new Date(`${input.expiresAt}T23:59:59`) : null,
      }).returning();
      res.status(201).json(coupon);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      console.error("Coupon create error:", err);
      res.status(500).json({ message: "Erro ao criar cupom" });
    }
  });

  /** Ativa/desativa um cupom. */
  app.patch("/api/admin/coupons/:id", requireSuperAdmin, async (req, res) => {
    const active = !!req.body?.active;
    const [updated] = await db.update(coupons)
      .set({ active })
      .where(eq(coupons.id, Number(req.params.id)))
      .returning();
    if (!updated) return res.status(404).json({ message: "Cupom não encontrado" });
    res.json(updated);
  });

  // ─── Configurações da integração Asaas ──────────────────────────────────

  /** Mostra só os últimos caracteres de um segredo. */
  const mask = (v: string | undefined) => (v ? `••••${v.slice(-6)}` : null);

  app.get("/api/admin/settings/asaas", requireSuperAdmin, async (_req, res) => {
    const { env, apiKey, baseUrl } = getAsaasConfig();
    const sandboxKey = getSetting("asaas_api_key_sandbox") || process.env.ASAAS_API_KEY;
    const productionKey = getSetting("asaas_api_key_production");
    const webhookToken = getSetting("asaas_webhook_token") || process.env.ASAAS_WEBHOOK_TOKEN;

    res.json({
      env,
      baseUrl,
      configured: !!apiKey,
      sandboxKeyMasked: mask(sandboxKey),
      sandboxKeyFromEnv: !getSetting("asaas_api_key_sandbox") && !!process.env.ASAAS_API_KEY,
      productionKeyMasked: mask(productionKey),
      webhookTokenMasked: mask(webhookToken),
      webhookTokenFromEnv: !getSetting("asaas_webhook_token") && !!process.env.ASAAS_WEBHOOK_TOKEN,
      webhookPath: "/api/billing/webhook",
    });
  });

  const settingsSchemaAsaas = z.object({
    env: z.enum(["sandbox", "production"]).optional(),
    sandboxApiKey: z.string().max(400).optional(),
    productionApiKey: z.string().max(400).optional(),
    webhookToken: z.string().max(200).optional(),
  });

  app.put("/api/admin/settings/asaas", requireSuperAdmin, async (req, res) => {
    try {
      const input = settingsSchemaAsaas.parse(req.body);

      // Trocar para produção exige chave de produção definida
      if (input.env === "production") {
        const prodKey = input.productionApiKey?.trim() || getSetting("asaas_api_key_production");
        if (!prodKey) {
          return res.status(400).json({
            message: "Defina a chave de API de PRODUÇÃO antes de sair do sandbox.",
            field: "productionApiKey",
          });
        }
      }

      if (input.env) await setSetting("asaas_env", input.env);
      if (input.sandboxApiKey?.trim()) await setSetting("asaas_api_key_sandbox", input.sandboxApiKey.trim());
      if (input.productionApiKey?.trim()) await setSetting("asaas_api_key_production", input.productionApiKey.trim());
      if (input.webhookToken?.trim()) await setSetting("asaas_webhook_token", input.webhookToken.trim());

      console.log(`[admin] Configurações do Asaas atualizadas (ambiente: ${getAsaasConfig().env})`);
      res.json({ ok: true, env: getAsaasConfig().env });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      console.error("Asaas settings error:", err);
      res.status(500).json({ message: "Erro ao salvar configurações" });
    }
  });

  /** Remove uma chave salva no painel (volta a valer o .env, se houver). */
  app.delete("/api/admin/settings/asaas/:key", requireSuperAdmin, async (req, res) => {
    const allowed: Record<string, string> = {
      sandbox: "asaas_api_key_sandbox",
      production: "asaas_api_key_production",
      webhook: "asaas_webhook_token",
    };
    const key = allowed[String(req.params.key)];
    if (!key) return res.status(400).json({ message: "Chave inválida" });
    await deleteSetting(key);
    res.json({ ok: true });
  });

  /** Testa a conexão com o ambiente/chave atuais. */
  app.post("/api/admin/settings/asaas/test", requireSuperAdmin, async (_req, res) => {
    try {
      const { env, apiKey } = getAsaasConfig();
      if (!apiKey) {
        return res.status(400).json({ ok: false, message: "Nenhuma chave configurada para este ambiente" });
      }
      await pingAsaas();
      res.json({ ok: true, env, message: `Conexão com o Asaas (${env === "sandbox" ? "Sandbox" : "Produção"}) OK!` });
    } catch (err: any) {
      res.status(400).json({ ok: false, message: err.message || "Falha na conexão com o Asaas" });
    }
  });
}
