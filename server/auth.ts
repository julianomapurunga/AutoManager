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

/** Extrai e valida o JWT do Supabase, carregando o perfil e a organização. */
export const requireAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = header.slice("Bearer ".length);
    let payload: JWTPayload;
    try {
      payload = await verifySupabaseToken(token);
    } catch {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = payload.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [row] = await db
      .select({ user: users, organization: organizations })
      .from(users)
      .innerJoin(organizations, eq(users.organizationId, organizations.id))
      .where(eq(users.id, userId));

    if (!row) {
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
