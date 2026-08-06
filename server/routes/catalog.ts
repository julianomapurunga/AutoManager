import type { Express } from "express";
import { z } from "zod";
import { eq, and, ne, desc, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { requireAuth, requireActiveSubscription, requireRole } from "../auth";
import { rateLimit } from "../security";
import { vehicles, vehicleImages } from "@shared/schema";
import {
  organizations,
  planIncludesCatalog,
  hasActiveSubscription,
  catalogSlugSchema,
} from "@shared/models/tenancy";

// Slugs que não podem ser usados por lojas (confusão/abuso)
const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "www", "loja", "lojas", "catalogo", "catalog",
  "suporte", "support", "ajuda", "help", "login", "cadastro", "signup",
  "automanager", "vehiro", "oficial", "billing", "upload", "uploads", "teste", "demo",
]);

const settingsSchema = z.object({
  catalogEnabled: z.boolean(),
  catalogSlug: z
    .string()
    .regex(catalogSlugSchema, "Use apenas letras minúsculas, números e hífens (3 a 50 caracteres)")
    .refine((s) => !RESERVED_SLUGS.has(s), "Este endereço é reservado, escolha outro")
    .nullable()
    .optional(),
  catalogDescription: z.string().max(500, "Máximo de 500 caracteres").nullable().optional(),
  catalogWhatsapp: z.string().max(20).nullable().optional(),
});

/** Bloqueia o recurso para planos sem catálogo público. */
const requireCatalogAccess = (req: any, res: any, next: any) => {
  if (!planIncludesCatalog(req.organization!.plan)) {
    return res.status(403).json({
      message: "O catálogo público está disponível no plano Profissional. Faça upgrade para usar este recurso.",
      code: "PLAN_FEATURE",
    });
  }
  next();
};

export function registerCatalogRoutes(app: Express): void {
  // ─── Configurações (admin/gerente da loja) ──────────────────────────────

  app.get(
    "/api/catalog/settings",
    requireAuth,
    requireActiveSubscription,
    requireRole("Administrador", "Gerente"),
    async (req, res) => {
      const org = req.organization!;
      res.json({
        available: planIncludesCatalog(org.plan),
        catalogEnabled: org.catalogEnabled,
        catalogSlug: org.catalogSlug,
        catalogDescription: org.catalogDescription,
        catalogWhatsapp: org.catalogWhatsapp,
      });
    },
  );

  app.put(
    "/api/catalog/settings",
    requireAuth,
    requireActiveSubscription,
    requireRole("Administrador", "Gerente"),
    requireCatalogAccess,
    async (req, res) => {
      try {
        const input = settingsSchema.parse(req.body);
        const org = req.organization!;

        if (input.catalogEnabled && !input.catalogSlug && !org.catalogSlug) {
          return res.status(400).json({
            message: "Defina o endereço do catálogo antes de ativá-lo",
            field: "catalogSlug",
          });
        }

        if (input.catalogSlug) {
          const [taken] = await db
            .select({ id: organizations.id })
            .from(organizations)
            .where(and(eq(organizations.catalogSlug, input.catalogSlug), ne(organizations.id, org.id)));
          if (taken) {
            return res.status(400).json({ message: "Este endereço já está em uso", field: "catalogSlug" });
          }
        }

        const [updated] = await db
          .update(organizations)
          .set({
            catalogEnabled: input.catalogEnabled,
            ...(input.catalogSlug !== undefined ? { catalogSlug: input.catalogSlug } : {}),
            ...(input.catalogDescription !== undefined ? { catalogDescription: input.catalogDescription } : {}),
            ...(input.catalogWhatsapp !== undefined ? { catalogWhatsapp: input.catalogWhatsapp } : {}),
          })
          .where(eq(organizations.id, org.id))
          .returning();

        res.json({
          available: true,
          catalogEnabled: updated.catalogEnabled,
          catalogSlug: updated.catalogSlug,
          catalogDescription: updated.catalogDescription,
          catalogWhatsapp: updated.catalogWhatsapp,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({
            message: err.errors[0].message,
            field: err.errors[0].path.join("."),
          });
        }
        console.error("Catalog settings error:", err);
        res.status(500).json({ message: "Erro ao salvar configurações do catálogo" });
      }
    },
  );

  // Verifica em tempo real se um endereço (slug) está disponível para esta loja.
  app.get(
    "/api/catalog/slug-available",
    requireAuth,
    requireActiveSubscription,
    requireRole("Administrador", "Gerente"),
    async (req, res) => {
      const slug = String(req.query.slug ?? "").toLowerCase();
      if (!slug) return res.json({ available: false, reason: "empty" });
      if (!catalogSlugSchema.test(slug)) {
        return res.json({
          available: false,
          reason: "format",
          message: "Use apenas letras minúsculas, números e hífens (3 a 50 caracteres)",
        });
      }
      if (RESERVED_SLUGS.has(slug)) {
        return res.json({ available: false, reason: "reserved", message: "Este endereço é reservado, escolha outro" });
      }
      const org = req.organization!;
      const [taken] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(and(eq(organizations.catalogSlug, slug), ne(organizations.id, org.id)));
      if (taken) return res.json({ available: false, reason: "taken", message: "Este endereço já está em uso" });
      return res.json({ available: true });
    },
  );

  // ─── Página pública (sem autenticação) ──────────────────────────────────
  // Expõe SOMENTE dados públicos: nada de preço de compra, placa,
  // proprietário, observações internas ou dados de venda.

  const publicCatalogLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: "Muitas requisições ao catálogo. Aguarde um instante.",
  });

  app.get("/api/public/catalog/:slug", publicCatalogLimiter, async (req, res) => {
    try {
      const slug = String(req.params.slug).toLowerCase();
      if (!catalogSlugSchema.test(slug)) {
        return res.status(404).json({ message: "Catálogo não encontrado" });
      }

      const [org] = await db.select().from(organizations).where(eq(organizations.catalogSlug, slug));

      if (
        !org ||
        !org.catalogEnabled ||
        !planIncludesCatalog(org.plan) ||
        !hasActiveSubscription(org)
      ) {
        return res.status(404).json({ message: "Catálogo não encontrado" });
      }

      const availableVehicles = await db
        .select({
          id: vehicles.id,
          brand: vehicles.brand,
          model: vehicles.model,
          color: vehicles.color,
          yearFab: vehicles.yearFab,
          yearModel: vehicles.yearModel,
          condition: vehicles.condition,
          mileage: vehicles.mileage,
          price: vehicles.price,
        })
        .from(vehicles)
        .where(and(eq(vehicles.organizationId, org.id), eq(vehicles.status, "Disponível")))
        .orderBy(desc(vehicles.entryDate));

      const ids = availableVehicles.map((v) => v.id);
      const images = ids.length
        ? await db
            .select({
              vehicleId: vehicleImages.vehicleId,
              filePath: vehicleImages.filePath,
            })
            .from(vehicleImages)
            .where(inArray(vehicleImages.vehicleId, ids))
            // Externas primeiro (são as principais dos anúncios), depois internas e placa.
            .orderBy(
              sql`case ${vehicleImages.category} when 'externa' then 0 when 'interna' then 1 when 'placa' then 2 else 3 end`,
              desc(vehicleImages.createdAt),
            )
        : [];

      const imagesByVehicle = new Map<number, string[]>();
      for (const img of images) {
        const list = imagesByVehicle.get(img.vehicleId) ?? [];
        list.push(img.filePath);
        imagesByVehicle.set(img.vehicleId, list);
      }

      // Cache curto: alivia o servidor sem atrasar demais mudanças de estoque
      res.setHeader("Cache-Control", "public, max-age=60");
      res.json({
        store: {
          name: org.name,
          description: org.catalogDescription,
          whatsapp: org.catalogWhatsapp || org.phone,
        },
        vehicles: availableVehicles.map((v) => ({
          ...v,
          images: imagesByVehicle.get(v.id) ?? [],
        })),
      });
    } catch (err) {
      console.error("Public catalog error:", err);
      res.status(500).json({ message: "Erro ao carregar catálogo" });
    }
  });
}
