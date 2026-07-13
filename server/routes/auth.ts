import type { Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { eq, and, desc, ne } from "drizzle-orm";
import { db } from "../db";
import { supabaseAdmin } from "../supabase";
import { requireAuth, guardAdmin } from "../auth";
import { rateLimit, isRealImage } from "../security";
import { users, signupSchema, createUserSchema, updateUserSchema } from "@shared/models/auth";
import { organizations, PLANS, TRIAL_DAYS, hasActiveSubscription } from "@shared/models/tenancy";

const profileUploadsDir = path.join(process.cwd(), "uploads", "profiles");
if (!fs.existsSync(profileUploadsDir)) {
  fs.mkdirSync(profileUploadsDir, { recursive: true });
}

const profileUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, profileUploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `profile-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo não suportado"));
    }
  },
});

function zodError(err: z.ZodError, res: any) {
  return res.status(400).json({
    message: err.errors[0].message,
    field: err.errors[0].path.join("."),
  });
}

export function registerAuthRoutes(app: Express): void {
  /**
   * Cadastro SaaS: cria a loja (organização) + usuário administrador.
   * Rota pública. A senha é gerenciada pelo Supabase Auth.
   */
  const signupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Muitas tentativas de cadastro. Tente novamente em 15 minutos.",
  });

  app.post("/api/auth/signup", signupLimiter, async (req, res) => {
    let createdAuthUserId: string | null = null;
    try {
      const input = signupSchema.parse(req.body);

      const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
      });

      if (authError || !created?.user) {
        const msg = authError?.message?.includes("already")
          ? "E-mail já cadastrado"
          : authError?.message || "Erro ao criar conta";
        return res.status(400).json({ message: msg, field: "email" });
      }
      createdAuthUserId = created.user.id;

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

      const result = await db.transaction(async (tx) => {
        const [org] = await tx
          .insert(organizations)
          .values({
            name: input.organizationName,
            plan: "trial",
            subscriptionStatus: "trialing",
            trialEndsAt,
          })
          .returning();

        const [profile] = await tx
          .insert(users)
          .values({
            id: created.user.id,
            organizationId: org.id,
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName ?? null,
            phone: input.phone,
            cpf: input.cpf,
            gender: input.gender,
            role: "Administrador",
          })
          .returning();

        return { org, profile };
      });

      res.status(201).json({
        organization: result.org,
        user: result.profile,
      });
    } catch (err) {
      // Rollback do usuário no Supabase Auth se o banco falhar
      if (createdAuthUserId) {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId).catch(() => {});
      }
      if (err instanceof z.ZodError) return zodError(err, res);
      console.error("Signup error:", err);
      res.status(500).json({ message: "Erro ao criar conta" });
    }
  });

  /** Perfil do usuário logado + dados da organização/plano. */
  app.get("/api/auth/user", requireAuth, async (req, res) => {
    const org = req.organization!;
    res.json({
      ...req.user!,
      organization: {
        id: org.id,
        name: org.name,
        plan: org.plan,
        planName: PLANS[org.plan as keyof typeof PLANS]?.name ?? org.plan,
        subscriptionStatus: org.subscriptionStatus,
        trialEndsAt: org.trialEndsAt,
        active: hasActiveSubscription(org),
      },
    });
  });

  app.put("/api/auth/profile", requireAuth, profileUpload.single("profileImage"), async (req, res) => {
    try {
      const user = req.user!;
      const updateData: Record<string, unknown> = {};

      if (req.body.firstName) updateData.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) updateData.lastName = req.body.lastName || null;

      const oldImageUrl = user.profileImageUrl;
      if (req.file) {
        if (!isRealImage(req.file.path)) {
          fs.promises.unlink(req.file.path).catch(() => {});
          return res.status(400).json({ message: "Arquivo inválido: envie uma imagem real (jpg, png, gif ou webp)" });
        }
        updateData.profileImageUrl = `/uploads/profiles/${req.file.filename}`;
      }

      if (Object.keys(updateData).length === 0) {
        return res.json(user);
      }

      const [updated] = await db
        .update(users)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();

      if (req.file && oldImageUrl) {
        const oldFilename = oldImageUrl.replace("/uploads/profiles/", "");
        const oldPath = path.join(profileUploadsDir, oldFilename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      res.json(updated);
    } catch (err) {
      console.error("Error updating profile:", err);
      res.status(500).json({ message: "Erro ao atualizar perfil" });
    }
  });

  app.delete("/api/auth/profile-image", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      if (user.profileImageUrl) {
        const filename = user.profileImageUrl.replace("/uploads/profiles/", "");
        const filePath = path.join(profileUploadsDir, filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      const [updated] = await db
        .update(users)
        .set({ profileImageUrl: null, updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();
      res.json(updated);
    } catch (err) {
      console.error("Error removing profile image:", err);
      res.status(500).json({ message: "Erro ao remover foto de perfil" });
    }
  });

  /** Lista usuários da MESMA organização. */
  app.get("/api/users", guardAdmin(), async (req, res) => {
    try {
      const list = await db
        .select()
        .from(users)
        .where(eq(users.organizationId, req.user!.organizationId))
        .orderBy(desc(users.createdAt));
      res.json(list);
    } catch (error) {
      console.error("Error listing users:", error);
      res.status(500).json({ message: "Erro ao listar usuários" });
    }
  });

  /** Cria usuário da equipe (dentro da organização do admin). */
  app.post("/api/users", guardAdmin(), async (req, res) => {
    let createdAuthUserId: string | null = null;
    try {
      const input = createUserSchema.parse(req.body);
      const orgId = req.user!.organizationId;

      // Limite de usuários do plano
      const plan = PLANS[req.organization!.plan as keyof typeof PLANS];
      if (plan?.maxUsers != null) {
        const current = await db.select({ id: users.id }).from(users).where(eq(users.organizationId, orgId));
        if (current.length >= plan.maxUsers) {
          return res.status(403).json({
            message: `Seu plano permite no máximo ${plan.maxUsers} usuários. Faça upgrade para adicionar mais.`,
            code: "PLAN_LIMIT",
          });
        }
      }

      const [existingCpf] = await db
        .select()
        .from(users)
        .where(and(eq(users.organizationId, orgId), eq(users.cpf, input.cpf)));
      if (existingCpf) {
        return res.status(400).json({ message: "CPF já cadastrado", field: "cpf" });
      }

      const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
      });
      if (authError || !created?.user) {
        const msg = authError?.message?.includes("already")
          ? "E-mail já cadastrado"
          : authError?.message || "Erro ao criar usuário";
        return res.status(400).json({ message: msg, field: "email" });
      }
      createdAuthUserId = created.user.id;

      const [profile] = await db
        .insert(users)
        .values({
          id: created.user.id,
          organizationId: orgId,
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName ?? null,
          phone: input.phone,
          cpf: input.cpf,
          gender: input.gender,
          role: input.role,
        })
        .returning();

      res.status(201).json(profile);
    } catch (err) {
      if (createdAuthUserId) {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId).catch(() => {});
      }
      if (err instanceof z.ZodError) return zodError(err, res);
      console.error("Error creating user:", err);
      res.status(500).json({ message: "Erro ao criar usuário" });
    }
  });

  app.put("/api/users/:id", guardAdmin(), async (req, res) => {
    try {
      const targetId = String(req.params.id);
      const orgId = req.user!.organizationId;
      const input = updateUserSchema.parse(req.body);

      const [existingUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, targetId), eq(users.organizationId, orgId)));
      if (!existingUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      if (input.cpf && input.cpf !== existingUser.cpf) {
        const [existingCpf] = await db
          .select()
          .from(users)
          .where(and(eq(users.organizationId, orgId), eq(users.cpf, input.cpf), ne(users.id, targetId)));
        if (existingCpf) {
          return res.status(400).json({ message: "CPF já cadastrado", field: "cpf" });
        }
      }

      // Senha é atualizada no Supabase Auth, não no banco
      const { password, ...profileData } = input;
      if (password) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(targetId, { password });
        if (error) {
          return res.status(400).json({ message: "Erro ao atualizar senha", field: "password" });
        }
      }

      const [updated] = await db
        .update(users)
        .set({ ...profileData, updatedAt: new Date() })
        .where(and(eq(users.id, targetId), eq(users.organizationId, orgId)))
        .returning();

      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return zodError(err, res);
      console.error("Error updating user:", err);
      res.status(500).json({ message: "Erro ao atualizar usuário" });
    }
  });

  app.delete("/api/users/:id", guardAdmin(), async (req, res) => {
    try {
      const targetId = String(req.params.id);
      const orgId = req.user!.organizationId;

      if (targetId === req.user!.id) {
        return res.status(400).json({ message: "Você não pode excluir sua própria conta" });
      }

      const [target] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, targetId), eq(users.organizationId, orgId)));
      if (!target) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      await db.delete(users).where(eq(users.id, targetId));
      await supabaseAdmin.auth.admin.deleteUser(targetId).catch((e) => {
        console.error("Erro ao excluir usuário do Supabase Auth:", e);
      });

      res.status(204).end();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Erro ao excluir usuário" });
    }
  });
}
