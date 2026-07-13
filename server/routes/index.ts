import express from "express";
import type { Express } from "express";
import type { Server } from "http";
import { storage, type TenantCtx } from "../storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { guard, guardAdmin, guardGerente, guardFinanceiro, requireFipeAccess } from "../auth";
import { validateUploadedImages, isRealImage } from "../security";
import { registerAuthRoutes } from "./auth";
import { registerBillingRoutes } from "./billing";
import { registerCatalogRoutes } from "./catalog";
import { PLANS, type OrgPlan } from "@shared/models/tenancy";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const profilesDir = path.join(uploadsDir, "profiles");
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomBytes(16).toString("hex");
    cb(null, `${name}${ext}`);
  },
});

const profileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, profilesDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomBytes(16).toString("hex");
    cb(null, `${name}${ext}`);
  },
});

const imageFilter = (_req: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
  if (allowed.test(path.extname(file.originalname))) {
    cb(null, true);
  } else {
    cb(new Error("Apenas imagens são permitidas (jpg, png, gif, webp)"));
  }
};

const upload = multer({ storage: multerStorage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: imageFilter });
const uploadProfile = multer({ storage: profileStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter });

/** Contexto do tenant extraído do usuário autenticado. */
function ctx(req: express.Request): TenantCtx {
  return { organizationId: req.user!.organizationId, userId: req.user!.id };
}

function zodError(err: z.ZodError, res: express.Response) {
  return res.status(400).json({
    message: err.errors[0].message,
    field: err.errors[0].path.join("."),
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  registerAuthRoutes(app);
  registerBillingRoutes(app);
  registerCatalogRoutes(app);

  // Log de auditoria
  app.get("/api/audit-logs", guardAdmin(), async (req, res) => {
    const logs = await storage.getAuditLogs(ctx(req));
    res.json(logs);
  });

  // ─── Pessoas ────────────────────────────────────────────────────────────

  app.get(api.people.list.path, guardFinanceiro(), async (req, res) => {
    const type = req.query.type as string | undefined;
    const result = await storage.getPeople(ctx(req), type);
    res.json(result);
  });

  app.get("/api/people/search-by-document", guard(), async (req, res) => {
    const document = req.query.document as string;
    if (!document || document.replace(/\D/g, "").length < 3) {
      return res.json(null);
    }
    const person = await storage.getPersonByDocument(ctx(req), document);
    res.json(person || null);
  });

  app.get(api.people.get.path, guard(), async (req, res) => {
    const person = await storage.getPerson(ctx(req), Number(req.params.id));
    if (!person) return res.status(404).json({ message: "Person not found" });
    res.json(person);
  });

  // Qualquer usuário pode cadastrar Cliente (necessário no fluxo de venda);
  // cadastrar Proprietário continua restrito a Gerente/Admin.
  app.post(api.people.create.path, guard(), async (req, res) => {
    try {
      const input = api.people.create.input.parse(req.body);
      const role = req.user!.role;
      if (input.type !== "Cliente" && role !== "Administrador" && role !== "Gerente") {
        return res.status(403).json({
          message: "Apenas Gerentes e Administradores podem cadastrar proprietários.",
        });
      }
      const person = await storage.createPerson(ctx(req), input);
      res.status(201).json(person);
    } catch (err) {
      if (err instanceof z.ZodError) return zodError(err, res);
      throw err;
    }
  });

  app.put(api.people.update.path, guardGerente(), async (req, res) => {
    try {
      const input = api.people.update.input.parse(req.body);
      const updated = await storage.updatePerson(ctx(req), Number(req.params.id), input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return zodError(err, res);
      return res.status(404).json({ message: "Person not found" });
    }
  });

  app.delete(api.people.delete.path, guardAdmin(), async (req, res) => {
    const personId = Number(req.params.id);
    if (await storage.personHasVehicles(ctx(req), personId)) {
      return res.status(400).json({
        message: "Esta pessoa está vinculada a veículos (como dono ou comprador) e não pode ser excluída.",
      });
    }
    await storage.deletePerson(ctx(req), personId);
    res.status(204).end();
  });

  // ─── Veículos ───────────────────────────────────────────────────────────

  app.get(api.vehicles.list.path, guard(), async (req, res) => {
    const filters = {
      status: req.query.status as string | undefined,
      ownerId: req.query.ownerId ? Number(req.query.ownerId) : undefined,
      search: req.query.search as string | undefined,
    };
    const result = await storage.getVehicles(ctx(req), filters);
    res.json(result);
  });

  app.get(api.vehicles.get.path, guard(), async (req, res) => {
    const vehicle = await storage.getVehicle(ctx(req), Number(req.params.id));
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.json(vehicle);
  });

  app.post(api.vehicles.create.path, guardGerente(), async (req, res) => {
    try {
      const input = api.vehicles.create.input.parse(req.body);

      // Limite de veículos do plano
      const plan = PLANS[req.organization!.plan as OrgPlan];
      if (plan?.maxVehicles != null) {
        const current = await storage.countVehicles(ctx(req));
        if (current >= plan.maxVehicles) {
          return res.status(403).json({
            message: `Seu plano permite no máximo ${plan.maxVehicles} veículos. Faça upgrade para adicionar mais.`,
            code: "PLAN_LIMIT",
          });
        }
      }

      const existing = await storage.getVehicleByPlate(ctx(req), input.plate);
      if (existing) {
        return res.status(400).json({ message: "Placa já cadastrada", field: "plate" });
      }

      const vehicle = await storage.createVehicle(ctx(req), input);
      res.status(201).json(vehicle);
    } catch (err) {
      if (err instanceof z.ZodError) return zodError(err, res);
      throw err;
    }
  });

  app.put(api.vehicles.update.path, guardGerente(), async (req, res) => {
    try {
      const input = api.vehicles.update.input.parse(req.body);
      if (input.status === "Vendido") {
        return res.status(400).json({
          message: "Use o formulário de venda para marcar como vendido",
          field: "status",
        });
      }
      const updated = await storage.updateVehicle(ctx(req), Number(req.params.id), input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return zodError(err, res);
      return res.status(404).json({ message: "Vehicle not found" });
    }
  });

  app.delete(api.vehicles.delete.path, guardAdmin(), async (req, res) => {
    await storage.deleteVehicle(ctx(req), Number(req.params.id));
    res.status(204).end();
  });

  // ─── Despesas de veículo ────────────────────────────────────────────────

  app.get(api.expenses.listByVehicle.path, guard(), async (req, res) => {
    const result = await storage.getExpensesByVehicle(ctx(req), Number(req.params.vehicleId));
    res.json(result);
  });

  app.post(api.expenses.create.path, guardFinanceiro(), async (req, res) => {
    try {
      const input = api.expenses.create.input.parse(req.body);
      // Garante que o veículo pertence à organização
      const vehicle = await storage.getVehicle(ctx(req), input.vehicleId);
      if (!vehicle) return res.status(404).json({ message: "Veículo não encontrado" });
      const expense = await storage.createExpense(ctx(req), input);
      res.status(201).json(expense);
    } catch (err) {
      if (err instanceof z.ZodError) return zodError(err, res);
      throw err;
    }
  });

  app.delete(api.expenses.delete.path, guardAdmin(), async (req, res) => {
    await storage.deleteExpense(ctx(req), Number(req.params.id));
    res.status(204).end();
  });

  // ─── Venda ──────────────────────────────────────────────────────────────

  app.post("/api/vehicles/:id/sell", guard(), async (req, res) => {
    try {
      const input = api.sales.markAsSold.input.parse(req.body);
      const vehicle = await storage.getVehicle(ctx(req), Number(req.params.id));
      if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

      // Impede venda dupla (a segunda venda sobrescreveria a primeira)
      if (vehicle.status === "Vendido") {
        return res.status(400).json({
          message: "Este veículo já foi vendido. Para corrigir a venda, edite o veículo.",
        });
      }

      if (input.salePrice <= 0) {
        return res.status(400).json({ message: "Preço de venda deve ser maior que zero", field: "salePrice" });
      }

      let tradeInVehicleId: number | null = null;
      if (input.tradeInVehicle) {
        const tv = input.tradeInVehicle;

        // Troca também conta no limite de veículos do plano
        const plan = PLANS[req.organization!.plan as OrgPlan];
        if (plan?.maxVehicles != null) {
          const current = await storage.countVehicles(ctx(req));
          if (current >= plan.maxVehicles) {
            return res.status(403).json({
              message: `Seu plano permite no máximo ${plan.maxVehicles} veículos e o veículo de troca ultrapassaria o limite. Faça upgrade para concluir.`,
              code: "PLAN_LIMIT",
            });
          }
        }

        // Placa da troca não pode já existir no estoque
        const existingPlate = await storage.getVehicleByPlate(ctx(req), tv.plate);
        if (existingPlate) {
          return res.status(400).json({
            message: `A placa ${tv.plate} do veículo de troca já está cadastrada no estoque.`,
          });
        }

        const tradeIn = await storage.createVehicle(ctx(req), {
          plate: tv.plate,
          brand: tv.brand as any,
          model: tv.model,
          color: tv.color,
          yearFab: tv.yearFab ?? null,
          yearModel: tv.yearModel ?? null,
          condition: tv.condition as any ?? null,
          mileage: tv.mileage ?? null,
          acquisitionPrice: tv.acquisitionPrice ?? null,
          price: tv.price ?? null,
          fipeCode: tv.fipeCode ?? null,
          fipePrice: tv.fipePrice ?? null,
          ownerId: tv.ownerId ?? null,
          notes: tv.notes ?? null,
          status: "Aguardando Preparação",
        });
        tradeInVehicleId = tradeIn.id;
      }

      const updated = await storage.markVehicleAsSold(
        ctx(req),
        Number(req.params.id),
        {
          salePrice: input.salePrice,
          buyerId: input.buyerId ?? null,
          saleDate: input.saleDate ? new Date(input.saleDate) : new Date(),
          saleMileage: input.saleMileage ?? null,
          tradeInVehicleId,
          tradeInValue: input.tradeInValue ?? null,
          intermediaryId: input.intermediaryId ?? null,
          intermediaryCommission: input.intermediaryCommission ?? null,
        }
      );
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return zodError(err, res);
      throw err;
    }
  });

  // ─── Despesas da loja ───────────────────────────────────────────────────

  app.get(api.storeExpenses.list.path, guardFinanceiro(), async (req, res) => {
    const result = await storage.getStoreExpenses(ctx(req));
    res.json(result);
  });

  app.post(api.storeExpenses.create.path, guardFinanceiro(), async (req, res) => {
    try {
      const input = api.storeExpenses.create.input.parse(req.body);
      const expense = await storage.createStoreExpense(ctx(req), input);
      res.status(201).json(expense);
    } catch (err) {
      if (err instanceof z.ZodError) return zodError(err, res);
      throw err;
    }
  });

  app.delete(api.storeExpenses.delete.path, guardAdmin(), async (req, res) => {
    await storage.deleteStoreExpense(ctx(req), Number(req.params.id));
    res.status(204).end();
  });

  // ─── Arquivos enviados ──────────────────────────────────────────────────
  // Servidos publicamente: tags <img> não enviam header Authorization.
  // Os nomes de arquivo são aleatórios (16 bytes hex), o que evita enumeração.
  // Para privacidade real, migre para o Supabase Storage com URLs assinadas.

  // Nomes de arquivo são aleatórios e imutáveis: cache longo é seguro
  app.use("/uploads", express.static(uploadsDir, { fallthrough: false, index: false, maxAge: "7d", immutable: true }));

  // ─── Imagens de veículos ────────────────────────────────────────────────

  app.get("/api/vehicles/:vehicleId/images", guard(), async (req, res) => {
    const images = await storage.getVehicleImages(ctx(req), Number(req.params.vehicleId));
    res.json(images);
  });

  app.post("/api/vehicles/:vehicleId/images", guardGerente(), upload.array("images", 20), async (req, res) => {
    try {
      const vehicleId = Number(req.params.vehicleId);
      const vehicle = await storage.getVehicle(ctx(req), vehicleId);
      if (!vehicle) return res.status(404).json({ message: "Veículo não encontrado" });

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "Nenhuma imagem enviada" });
      }

      // Confere o conteúdo real dos arquivos (não apenas a extensão)
      if (!validateUploadedImages(files)) {
        return res.status(400).json({ message: "Arquivo inválido: envie apenas imagens reais (jpg, png, gif ou webp)" });
      }

      const results = [];
      for (const file of files) {
        const image = await storage.createVehicleImage(
          ctx(req),
          vehicleId,
          file.originalname,
          `/uploads/${file.filename}`
        );
        results.push(image);
      }
      res.status(201).json(results);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Erro ao enviar imagens" });
    }
  });

  app.delete("/api/vehicle-images/:id", guardAdmin(), async (req, res) => {
    const deleted = await storage.deleteVehicleImage(ctx(req), Number(req.params.id));
    if (deleted?.filePath) {
      const filename = path.basename(deleted.filePath);
      const fullPath = path.join(uploadsDir, filename);
      fs.unlink(fullPath, () => {});
    }
    res.status(204).end();
  });

  app.delete("/api/vehicles/:vehicleId/images", guardAdmin(), async (req, res) => {
    const deleted = await storage.deleteAllVehicleImages(ctx(req), Number(req.params.vehicleId));
    for (const img of deleted) {
      if (img.filePath) {
        const filename = path.basename(img.filePath);
        const fullPath = path.join(uploadsDir, filename);
        fs.unlink(fullPath, () => {});
      }
    }
    res.status(204).end();
  });

  // ─── Intermediários ─────────────────────────────────────────────────────

  app.get(api.intermediaries.list.path, guard(), async (req, res) => {
    const list = await storage.getIntermediaries(ctx(req));
    res.json(list);
  });

  app.get(api.intermediaries.get.path, guard(), async (req, res) => {
    const item = await storage.getIntermediary(ctx(req), Number(req.params.id));
    if (!item) return res.status(404).json({ message: "Intermediário não encontrado" });
    res.json(item);
  });

  app.post(api.intermediaries.create.path, guardGerente(), uploadProfile.single("photo"), async (req, res) => {
    try {
      const data: any = {
        name: req.body.name,
        cpf: req.body.cpf,
        birthDate: req.body.birthDate ? new Date(req.body.birthDate) : null,
        photoUrl: null,
      };
      if (req.file) {
        if (!isRealImage(req.file.path)) {
          fs.promises.unlink(req.file.path).catch(() => {});
          return res.status(400).json({ message: "Arquivo inválido: envie uma imagem real" });
        }
        data.photoUrl = `/uploads/profiles/${req.file.filename}`;
      }
      const item = await storage.createIntermediary(ctx(req), data);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.intermediaries.update.path, guardGerente(), uploadProfile.single("photo"), async (req, res) => {
    try {
      const data: any = {};
      if (req.body.name) data.name = req.body.name;
      if (req.body.cpf) data.cpf = req.body.cpf;
      if (req.body.birthDate) data.birthDate = new Date(req.body.birthDate);
      if (req.file) {
        if (!isRealImage(req.file.path)) {
          fs.promises.unlink(req.file.path).catch(() => {});
          return res.status(400).json({ message: "Arquivo inválido: envie uma imagem real" });
        }
        data.photoUrl = `/uploads/profiles/${req.file.filename}`;
      }
      const item = await storage.updateIntermediary(ctx(req), Number(req.params.id), data);
      res.json(item);
    } catch (err) {
      return res.status(404).json({ message: "Intermediário não encontrado" });
    }
  });

  app.delete(api.intermediaries.delete.path, guardAdmin(), async (req, res) => {
    const intermediaryId = Number(req.params.id);
    if (await storage.intermediaryHasVehicles(ctx(req), intermediaryId)) {
      return res.status(400).json({
        message: "Este intermediário está vinculado a vendas e não pode ser excluído.",
      });
    }
    await storage.deleteIntermediary(ctx(req), intermediaryId);
    res.status(204).end();
  });

  // ─── Dashboard ──────────────────────────────────────────────────────────

  app.get("/api/dashboard/stats", guardFinanceiro(), async (req, res) => {
    const stats = await storage.getDashboardStats(ctx(req));
    res.json(stats);
  });

  // ─── FIPE (API pública, proxy) ──────────────────────────────────────────

  const FIPE_BASE = "https://fipe.parallelum.com.br/api/v2";
  const VALID_VEHICLE_TYPES = ["cars", "motorcycles", "trucks"];

  function validateVehicleType(type: string | string[], res: express.Response): type is string {
    if (typeof type !== "string" || !VALID_VEHICLE_TYPES.includes(type)) {
      res.status(400).json({ message: "Tipo de veículo inválido" });
      return false;
    }
    return true;
  }

  app.get("/api/fipe/:vehicleType/brands", guard(), requireFipeAccess, async (req, res) => {
    try {
      if (!validateVehicleType(req.params.vehicleType, res)) return;
      const response = await fetch(`${FIPE_BASE}/${req.params.vehicleType}/brands`);
      const data = await response.json();
      res.json(data);
    } catch (e) {
      res.status(500).json({ message: "Erro ao consultar FIPE" });
    }
  });

  app.get("/api/fipe/:vehicleType/brands/:brandId/models", guard(), requireFipeAccess, async (req, res) => {
    try {
      if (!validateVehicleType(req.params.vehicleType, res)) return;
      const { vehicleType, brandId } = req.params;
      const response = await fetch(`${FIPE_BASE}/${vehicleType}/brands/${brandId}/models`);
      const data = await response.json();
      res.json(data);
    } catch (e) {
      res.status(500).json({ message: "Erro ao consultar FIPE" });
    }
  });

  app.get("/api/fipe/:vehicleType/brands/:brandId/models/:modelId/years", guard(), requireFipeAccess, async (req, res) => {
    try {
      if (!validateVehicleType(req.params.vehicleType, res)) return;
      const { vehicleType, brandId, modelId } = req.params;
      const response = await fetch(`${FIPE_BASE}/${vehicleType}/brands/${brandId}/models/${modelId}/years`);
      const data = await response.json();
      res.json(data);
    } catch (e) {
      res.status(500).json({ message: "Erro ao consultar FIPE" });
    }
  });

  app.get("/api/fipe/:vehicleType/brands/:brandId/models/:modelId/years/:yearId", guard(), requireFipeAccess, async (req, res) => {
    try {
      if (!validateVehicleType(req.params.vehicleType, res)) return;
      const { vehicleType, brandId, modelId, yearId } = req.params;
      const response = await fetch(`${FIPE_BASE}/${vehicleType}/brands/${brandId}/models/${modelId}/years/${yearId}`);
      const data = await response.json();
      res.json(data);
    } catch (e) {
      res.status(500).json({ message: "Erro ao consultar FIPE" });
    }
  });

  app.get("/api/fipe/:vehicleType/:fipeCode/years/:yearId/history", guard(), requireFipeAccess, async (req, res) => {
    try {
      if (!validateVehicleType(req.params.vehicleType, res)) return;
      const { vehicleType, fipeCode, yearId } = req.params;
      const response = await fetch(`${FIPE_BASE}/${vehicleType}/${fipeCode}/years/${yearId}/history`);
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        res.json([]);
        return;
      }
      res.json(data);
    } catch (e) {
      res.status(500).json({ message: "Erro ao consultar histórico FIPE" });
    }
  });

  return httpServer;
}
