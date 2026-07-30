import type { Express } from "express";
import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { requireSuperAdmin } from "../auth";
import { supportTickets, coupons, vehicles, auditLogs } from "@shared/schema";
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
  /**
   * Impersonation: registra que o super admin entrou/saiu de uma loja e valida
   * que a loja pode ser acessada. O acesso em si é feito pelo cabeçalho
   * X-Impersonate-Org (ver requireAuth) — estes endpoints são o gatilho auditado.
   */
  async function auditImpersonation(orgId: number, email: string, entering: boolean) {
    await db.insert(auditLogs).values({
      organizationId: orgId,
      userId: null,
      action: entering ? "Impersonation iniciada" : "Impersonation encerrada",
      entityType: "organization",
      entityId: orgId,
      details: `[Super Admin: ${email}] ${entering ? "entrou na" : "saiu da"} loja pela central de controle`,
    });
  }

  app.post("/api/admin/impersonate/:orgId", requireSuperAdmin, async (req, res) => {
    const orgId = Number(req.params.orgId);
    if (!Number.isInteger(orgId) || orgId <= 0) {
      return res.status(400).json({ message: "Loja inválida" });
    }
    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
    if (!org) return res.status(404).json({ message: "Loja não encontrada" });
    const [adminUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.organizationId, orgId));
    if (!adminUser) {
      return res.status(422).json({ message: "Esta loja ainda não tem usuários para acessar." });
    }
    await auditImpersonation(orgId, req.authEmail || "?", true);
    res.json({ organization: { id: org.id, name: org.name } });
  });

  app.post("/api/admin/impersonate/:orgId/exit", requireSuperAdmin, async (req, res) => {
    const orgId = Number(req.params.orgId);
    if (Number.isInteger(orgId) && orgId > 0) {
      await auditImpersonation(orgId, req.authEmail || "?", false).catch(() => {});
    }
    res.json({ ok: true });
  });

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

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const soonMs = 7 * 86_400_000; // "próximas a vencer" = teste acaba em até 7 dias

      const byPlan: Record<string, number> = {};
      let activeSubscriptions = 0;
      let trialing = 0;
      let canceled = 0;
      let pastDue = 0;
      let newThisMonth = 0;
      let mrr = 0; // receita mensal recorrente estimada (centavos)
      const expiringSoon: Array<{
        id: number; name: string; plan: string; trialEndsAt: Date | null; daysLeft: number;
      }> = [];

      for (const org of orgs) {
        byPlan[org.plan] = (byPlan[org.plan] ?? 0) + 1;
        if (org.subscriptionStatus === "active") {
          activeSubscriptions++;
          mrr += PLANS[org.plan as OrgPlan]?.priceMonthly ?? 0;
        }
        if (org.subscriptionStatus === "trialing" && hasActiveSubscription(org)) trialing++;
        if (org.subscriptionStatus === "canceled") canceled++;
        if (org.subscriptionStatus === "past_due") pastDue++;
        if (org.createdAt && org.createdAt >= startOfMonth) newThisMonth++;

        // Testes que expiram nos próximos 7 dias (ainda dentro do prazo)
        if (
          org.subscriptionStatus === "trialing" &&
          org.trialEndsAt &&
          org.trialEndsAt >= now &&
          org.trialEndsAt.getTime() - now.getTime() <= soonMs
        ) {
          expiringSoon.push({
            id: org.id,
            name: org.name,
            plan: org.plan,
            trialEndsAt: org.trialEndsAt,
            daysLeft: Math.ceil((org.trialEndsAt.getTime() - now.getTime()) / 86_400_000),
          });
        }
      }
      expiringSoon.sort((a, b) => a.daysLeft - b.daysLeft);

      res.json({
        totalOrganizations: orgs.length,
        totalUsers: Number(userCount?.n ?? 0),
        totalVehicles: Number(vehicleCount?.n ?? 0),
        totalTickets: Number(ticketCount?.n ?? 0),
        activeSubscriptions,
        trialing,
        canceled,
        pastDue,
        newThisMonth,
        mrr,
        byPlan,
        expiringSoon,
      });
    } catch (err) {
      console.error("Admin overview error:", err);
      res.status(500).json({ message: "Erro ao carregar visão geral" });
    }
  });

  /**
   * Crescimento de lojas por mês, filtrável por ano.
   * Retorna os 12 meses do ano pedido + a lista de anos disponíveis (para o filtro).
   */
  app.get("/api/admin/overview/growth", requireSuperAdmin, async (req, res) => {
    try {
      const rows = await db.select({ createdAt: organizations.createdAt }).from(organizations);
      const nowYear = new Date().getFullYear();

      const years = Array.from(
        new Set(rows.map((r) => (r.createdAt ? new Date(r.createdAt).getFullYear() : nowYear))),
      ).sort((a, b) => a - b);
      if (years.length === 0) years.push(nowYear);

      const requested = Number(req.query.year);
      const year = years.includes(requested) ? requested : years[years.length - 1];

      const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, count: 0 }));
      for (const r of rows) {
        if (!r.createdAt) continue;
        const d = new Date(r.createdAt);
        if (d.getFullYear() === year) months[d.getMonth()].count++;
      }

      res.json({ years, year, months });
    } catch (err) {
      console.error("Admin growth error:", err);
      res.status(500).json({ message: "Erro ao carregar crescimento" });
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
          // Qualifica organizations.id (tabela externa): sem isso o Drizzle renderiza
          // apenas "id", que dentro do subquery colide com users.id (varchar) e quebra
          // com "operator does not exist: integer = character varying".
          userCount: sql<number>`(select count(*) from users u where u.organization_id = organizations.id)`,
          vehicleCount: sql<number>`(select count(*) from vehicles v where v.organization_id = organizations.id)`,
          adminEmail: sql<string | null>`(select u.email from users u where u.organization_id = organizations.id and u.role = 'Administrador' limit 1)`,
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

      // ── Liga cada cobrança à loja e ao admin (nome + contato) ──
      // A cobrança do Asaas carrega customer/subscription/externalReference;
      // mapeamos para a organização e, dela, para o Administrador.
      const orgs = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          phone: organizations.phone,
          asaasCustomerId: organizations.asaasCustomerId,
          asaasSubscriptionId: organizations.asaasSubscriptionId,
        })
        .from(organizations);
      const admins = await db
        .select({
          organizationId: users.organizationId,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phone: users.phone,
        })
        .from(users)
        .where(eq(users.role, "Administrador"));

      const byCustomer = new Map(orgs.filter((o) => o.asaasCustomerId).map((o) => [o.asaasCustomerId!, o]));
      const bySubscription = new Map(orgs.filter((o) => o.asaasSubscriptionId).map((o) => [o.asaasSubscriptionId!, o]));
      const byOrgId = new Map(orgs.map((o) => [o.id, o]));
      const adminByOrg = new Map(admins.map((a) => [a.organizationId, a]));

      type OrgRow = (typeof orgs)[number];
      const resolveOrg = (p: (typeof payments)[number]): OrgRow | null => {
        if (p.externalReference) {
          try {
            const ref = JSON.parse(p.externalReference);
            if (ref?.organizationId && byOrgId.has(Number(ref.organizationId))) {
              return byOrgId.get(Number(ref.organizationId))!;
            }
          } catch { /* formato desconhecido */ }
        }
        if (p.subscription && bySubscription.has(p.subscription)) return bySubscription.get(p.subscription)!;
        if (p.customer && byCustomer.has(p.customer)) return byCustomer.get(p.customer)!;
        return null;
      };

      const enriched = payments.slice(0, 30).map((p) => {
        const org = resolveOrg(p);
        const admin = org ? adminByOrg.get(org.id) : null;
        const personName = admin
          ? `${admin.firstName}${admin.lastName ? ` ${admin.lastName}` : ""}`
          : null;
        return {
          id: p.id,
          status: p.status,
          value: p.value,
          dueDate: p.dueDate,
          paymentDate: p.paymentDate,
          billingType: p.billingType,
          description: p.description,
          invoiceUrl: p.invoiceUrl,
          storeName: org?.name ?? null,
          personName,
          email: admin?.email ?? null,
          phone: admin?.phone ?? org?.phone ?? null,
        };
      });

      res.json({
        configured: true,
        payments: enriched,
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
