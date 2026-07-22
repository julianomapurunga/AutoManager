import type { Request, Response, NextFunction, RequestHandler } from "express";
import { createRemoteJWKSet, jwtVerify, decodeProtectedHeader, type JWTPayload } from "jose";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, USER_ROLES, type User } from "@shared/models/auth";
import { organizations, hasActiveSubscription, planIncludesFipe, type Organization } from "@shared/models/tenancy";
import { supabaseUrl } from "./supabase";

type Role = (typeof USER_ROLES)[number];

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      organization?: Organization;
      /** Preenchidos por requireSupabaseUser: usuário autenticado que ainda pode não ter perfil. */
      authUserId?: string;
      authEmail?: string | null;
    }
  }
}

// Projetos novos do Supabase assinam JWTs com chaves assimétricas (JWKS);
// projetos antigos usam HS256 com o "JWT Secret" do painel.
const jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
const legacySecret = process.env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET)
  : null;

async function verifySupabaseToken(token: string): Promise<JWTPayload> {
  const { alg } = decodeProtectedHeader(token);
  if (alg === "HS256") {
    if (!legacySecret) {
      throw new Error(
        "Token HS256 recebido mas SUPABASE_JWT_SECRET não está definido no .env",
      );
    }
    const { payload } = await jwtVerify(token, legacySecret);
    return payload;
  }
  const { payload } = await jwtVerify(token, jwks);
  return payload;
}

/** E-mail único com acesso ao painel do dono do SaaS (definido no .env). */
const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase();

export function isSuperAdminEmail(email: unknown): boolean {
  return !!SUPER_ADMIN_EMAIL && String(email ?? "").trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

/** Valida o Bearer token e devolve o payload do JWT (ou null). */
async function verifyBearer(req: Request): Promise<JWTPayload | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    return await verifySupabaseToken(header.slice("Bearer ".length));
  } catch {
    return null;
  }
}

/** Extrai e valida o JWT do Supabase, carregando o perfil e a organização. */
export const requireAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = await verifyBearer(req);
    if (!payload?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [row] = await db
      .select({ user: users, organization: organizations })
      .from(users)
      .innerJoin(organizations, eq(users.organizationId, organizations.id))
      .where(eq(users.id, payload.sub));

    if (!row) {
      // Conta do super admin: existe no Supabase Auth mas não pertence a loja alguma
      if (isSuperAdminEmail(payload.email)) {
        return res.status(403).json({ message: "Conta administrativa", code: "SUPER_ADMIN" });
      }
      return res.status(403).json({
        message: "Sua conta não está vinculada a nenhuma loja. Conclua o cadastro.",
        code: "NO_PROFILE",
      });
    }

    req.user = row.user;
    req.organization = row.organization;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(500).json({ message: "Erro de autenticação" });
  }
};

/**
 * Valida o JWT do Supabase e expõe o id/e-mail do usuário, SEM exigir perfil.
 * Usado no fluxo de login social: o usuário já existe no Supabase Auth (via Google)
 * mas ainda não tem loja/perfil — ele precisa concluir o cadastro.
 */
export const requireSupabaseUser: RequestHandler = async (req, res, next) => {
  const payload = await verifyBearer(req);
  if (!payload?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.authUserId = payload.sub;
  req.authEmail = typeof payload.email === "string" ? payload.email : null;
  next();
};

/** Acesso exclusivo do dono do SaaS (SUPER_ADMIN_EMAIL). Não consulta tabelas de loja. */
export const requireSuperAdmin: RequestHandler = async (req, res, next) => {
  const payload = await verifyBearer(req);
  if (!payload?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!isSuperAdminEmail(payload.email)) {
    return res.status(403).json({ message: "Acesso restrito" });
  }
  next();
};

/** Bloqueia o acesso quando o teste grátis expirou ou a assinatura está inativa. */
export const requireActiveSubscription: RequestHandler = (req, res, next) => {
  const org = req.organization;
  if (!org) return res.status(401).json({ message: "Unauthorized" });
  if (!hasActiveSubscription(org)) {
    return res.status(402).json({
      message:
        org.subscriptionStatus === "trialing"
          ? "Seu período de teste terminou. Assine um plano para continuar."
          : "Assinatura inativa. Regularize o pagamento para continuar.",
      code: "SUBSCRIPTION_REQUIRED",
    });
  }
  next();
};

/** Restringe a rota aos cargos informados. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(req.user.role as Role)) {
      return res.status(403).json({ message: "Acesso negado para o seu cargo." });
    }
    next();
  };
}

/**
 * Atalho para proteger rotas de negócio:
 * autenticação + assinatura ativa + (opcionalmente) cargo.
 */
export function guard(...roles: Role[]): RequestHandler[] {
  const chain: RequestHandler[] = [requireAuth, requireActiveSubscription];
  if (roles.length > 0) chain.push(requireRole(...roles));
  return chain;
}

/** Bloqueia rotas FIPE para planos que não incluem a integração. */
export const requireFipeAccess: RequestHandler = (req, res, next) => {
  const org = req.organization;
  if (!org) return res.status(401).json({ message: "Unauthorized" });
  if (!planIncludesFipe(org.plan)) {
    return res.status(403).json({
      message: "A integração FIPE está disponível a partir do plano Avançado. Faça upgrade para usar este recurso.",
      code: "PLAN_FEATURE",
    });
  }
  next();
};

export const guardAdmin = () => guard("Administrador");
export const guardGerente = () => guard("Administrador", "Gerente");
export const guardFinanceiro = () => guard("Administrador", "Gerente", "Financeiro");
