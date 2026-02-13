import express from "express";
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
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

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Apenas imagens são permitidas (jpg, png, gif, webp)"));
    }
  },
});

const uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Apenas imagens são permitidas (jpg, png, gif, webp)"));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await setupAuth(app);
  registerAuthRoutes(app);

  app.get(api.people.list.path, isAuthenticated, async (req, res) => {
    const type = req.query.type as string | undefined;
    const people = await storage.getPeople(type);
    res.json(people);
  });

  app.get("/api/people/search-by-document", isAuthenticated, async (req, res) => {
    const document = req.query.document as string;
    if (!document || document.replace(/\D/g, "").length < 3) {
      return res.json(null);
    }
    const person = await storage.getPersonByDocument(document);
    res.json(person || null);
  });

  app.get(api.people.get.path, isAuthenticated, async (req, res) => {
    const person = await storage.getPerson(Number(req.params.id));
    if (!person) return res.status(404).json({ message: "Person not found" });
    res.json(person);
  });

  app.post(api.people.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.people.create.input.parse(req.body);
      const person = await storage.createPerson(input);
      res.status(201).json(person);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.people.update.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.people.update.input.parse(req.body);
      const updated = await storage.updatePerson(Number(req.params.id), input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      return res.status(404).json({ message: "Person not found" });
    }
  });

  app.delete(api.people.delete.path, isAuthenticated, async (req, res) => {
    await storage.deletePerson(Number(req.params.id));
    res.status(204).end();
  });

  app.get(api.vehicles.list.path, isAuthenticated, async (req, res) => {
    const filters = {
      status: req.query.status as string | undefined,
      ownerId: req.query.ownerId ? Number(req.query.ownerId) : undefined,
      search: req.query.search as string | undefined,
    };
    const vehicles = await storage.getVehicles(filters);
    res.json(vehicles);
  });

  app.get(api.vehicles.get.path, isAuthenticated, async (req, res) => {
    const vehicle = await storage.getVehicle(Number(req.params.id));
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.json(vehicle);
  });

  app.post(api.vehicles.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.vehicles.create.input.parse(req.body);

      const existing = await storage.getVehicleByPlate(input.plate);
      if (existing) {
        return res.status(400).json({ message: "Placa já cadastrada", field: "plate" });
      }

      const vehicle = await storage.createVehicle(input);
      res.status(201).json(vehicle);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.vehicles.update.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.vehicles.update.input.parse(req.body);
      if (input.status === "Vendido") {
        return res.status(400).json({
          message: "Use o formulário de venda para marcar como vendido",
          field: "status",
        });
      }
      const updated = await storage.updateVehicle(Number(req.params.id), input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      return res.status(404).json({ message: "Vehicle not found" });
    }
  });

  app.delete(api.vehicles.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteVehicle(Number(req.params.id));
    res.status(204).end();
  });

  app.get(api.expenses.listByVehicle.path, isAuthenticated, async (req, res) => {
    const expenses = await storage.getExpensesByVehicle(Number(req.params.vehicleId));
    res.json(expenses);
  });

  app.post(api.expenses.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.expenses.create.input.parse(req.body);
      const expense = await storage.createExpense(input);
      res.status(201).json(expense);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.expenses.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteExpense(Number(req.params.id));
    res.status(204).end();
  });

  app.post("/api/vehicles/:id/sell", isAuthenticated, async (req, res) => {
    try {
      const input = api.sales.markAsSold.input.parse(req.body);
      const vehicle = await storage.getVehicle(Number(req.params.id));
      if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

      let tradeInVehicleId: number | null = null;
      if (input.tradeInVehicle) {
        const tv = input.tradeInVehicle;
        const tradeIn = await storage.createVehicle({
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
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.storeExpenses.list.path, isAuthenticated, async (req, res) => {
    const storeExpenses = await storage.getStoreExpenses();
    res.json(storeExpenses);
  });

  app.post(api.storeExpenses.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.storeExpenses.create.input.parse(req.body);
      const expense = await storage.createStoreExpense(input);
      res.status(201).json(expense);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.storeExpenses.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteStoreExpense(Number(req.params.id));
    res.status(204).end();
  });

  app.get("/uploads/profiles/:filename", isAuthenticated, (req, res) => {
    const filename = path.basename(String(req.params.filename));
    const filePath = path.join(uploadsDir, "profiles", filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Arquivo não encontrado" });
    res.sendFile(filePath);
  });

  app.get("/uploads/:filename", isAuthenticated, (req, res) => {
    const filename = path.basename(String(req.params.filename));
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Arquivo não encontrado" });
    res.sendFile(filePath);
  });

  app.get("/api/vehicles/:vehicleId/images", isAuthenticated, async (req, res) => {
    const images = await storage.getVehicleImages(Number(req.params.vehicleId));
    res.json(images);
  });

  app.post("/api/vehicles/:vehicleId/images", isAuthenticated, upload.array("images", 20), async (req, res) => {
    try {
      const vehicleId = Number(req.params.vehicleId);
      const vehicle = await storage.getVehicle(vehicleId);
      if (!vehicle) return res.status(404).json({ message: "Veículo não encontrado" });

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "Nenhuma imagem enviada" });
      }

      const results = [];
      for (const file of files) {
        const image = await storage.createVehicleImage(
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

  app.delete("/api/vehicle-images/:id", isAuthenticated, async (req, res) => {
    const deleted = await storage.deleteVehicleImage(Number(req.params.id));
    if (deleted?.filePath) {
      const filename = path.basename(deleted.filePath);
      const fullPath = path.join(uploadsDir, filename);
      fs.unlink(fullPath, () => {});
    }
    res.status(204).end();
  });

  app.delete("/api/vehicles/:vehicleId/images", isAuthenticated, async (req, res) => {
    const deleted = await storage.deleteAllVehicleImages(Number(req.params.vehicleId));
    for (const img of deleted) {
      if (img.filePath) {
        const filename = path.basename(img.filePath);
        const fullPath = path.join(uploadsDir, filename);
        fs.unlink(fullPath, () => {});
      }
    }
    res.status(204).end();
  });

  app.get(api.intermediaries.list.path, isAuthenticated, async (_req, res) => {
    const list = await storage.getIntermediaries();
    res.json(list);
  });

  app.get(api.intermediaries.get.path, isAuthenticated, async (req, res) => {
    const item = await storage.getIntermediary(Number(req.params.id));
    if (!item) return res.status(404).json({ message: "Intermediário não encontrado" });
    res.json(item);
  });

  app.post(api.intermediaries.create.path, isAuthenticated, uploadProfile.single("photo"), async (req, res) => {
    try {
      const data: any = {
        name: req.body.name,
        cpf: req.body.cpf,
        birthDate: req.body.birthDate ? new Date(req.body.birthDate) : null,
        photoUrl: null,
      };
      if (req.file) {
        data.photoUrl = `/uploads/profiles/${req.file.filename}`;
      }
      const item = await storage.createIntermediary(data);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.intermediaries.update.path, isAuthenticated, uploadProfile.single("photo"), async (req, res) => {
    try {
      const data: any = {};
      if (req.body.name) data.name = req.body.name;
      if (req.body.cpf) data.cpf = req.body.cpf;
      if (req.body.birthDate) data.birthDate = new Date(req.body.birthDate);
      if (req.file) {
        data.photoUrl = `/uploads/profiles/${req.file.filename}`;
      }
      const item = await storage.updateIntermediary(Number(req.params.id), data);
      res.json(item);
    } catch (err) {
      return res.status(404).json({ message: "Intermediário não encontrado" });
    }
  });

  app.delete(api.intermediaries.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteIntermediary(Number(req.params.id));
    res.status(204).end();
  });

  app.get(api.dashboard.get.path, isAuthenticated, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  const FIPE_BASE = "https://fipe.parallelum.com.br/api/v2";
  const VALID_VEHICLE_TYPES = ["cars", "motorcycles", "trucks"];

  function validateVehicleType(type: string | string[], res: express.Response): type is string {
    if (typeof type !== "string" || !VALID_VEHICLE_TYPES.includes(type)) {
      res.status(400).json({ message: "Tipo de veículo inválido" });
      return false;
    }
    return true;
  }

  app.get("/api/fipe/:vehicleType/brands", isAuthenticated, async (req, res) => {
    try {
      if (!validateVehicleType(req.params.vehicleType, res)) return;
      const response = await fetch(`${FIPE_BASE}/${req.params.vehicleType}/brands`);
      const data = await response.json();
      res.json(data);
    } catch (e) {
      res.status(500).json({ message: "Erro ao consultar FIPE" });
    }
  });

  app.get("/api/fipe/:vehicleType/brands/:brandId/models", isAuthenticated, async (req, res) => {
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

  app.get("/api/fipe/:vehicleType/brands/:brandId/models/:modelId/years", isAuthenticated, async (req, res) => {
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

  app.get("/api/fipe/:vehicleType/brands/:brandId/models/:modelId/years/:yearId", isAuthenticated, async (req, res) => {
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

  app.get("/api/fipe/:vehicleType/:fipeCode/years/:yearId/history", isAuthenticated, async (req, res) => {
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

  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingVehicles = await storage.getVehicles();
  if (existingVehicles.length === 0) {
    const owner1 = await storage.createPerson({
      name: "João Silva",
      email: "joao@email.com",
      phone: "(11) 99999-8888",
      type: "Proprietário",
      document: "123.456.789-00"
    });

    const owner2 = await storage.createPerson({
      name: "Maria Oliveira",
      email: "maria@email.com",
      phone: "(11) 98888-7777",
      type: "Proprietário",
      document: "987.654.321-99"
    });

    const owner3 = await storage.createPerson({
      name: "Pedro Costa",
      email: "pedro@email.com",
      phone: "(21) 97777-6666",
      type: "Proprietário",
      document: "111.222.333-44"
    });

    await storage.createPerson({
      name: "Carlos Santos",
      email: "carlos@email.com",
      phone: "(11) 96666-5555",
      type: "Cliente",
      document: "555.666.777-88"
    });

    const parseFipePrice = (fipePrice: string): number => {
      const digits = fipePrice.replace(/[^\d]/g, "");
      return parseInt(digits, 10) || 0;
    };

    const statuses: Array<"Disponível" | "Aguardando Preparação" | "Em Manutenção" | "Reservado"> = ["Disponível", "Disponível", "Disponível", "Aguardando Preparação", "Em Manutenção", "Reservado"];
    const owners = [owner1, owner2, owner3, null];
    const conditions: Array<"Novo" | "Semi-novo" | "Usado"> = ["Semi-novo", "Usado", "Novo"];

    const fipeVehicles = [
      { plate: "BRA2E19", brand: "Fiat" as const, model: "ARGO 1.0 6V Flex", yearFab: 2025, yearModel: 2026, fipeCode: "001509-1", fipePrice: "R$ 76.785,00", color: "Branco", notes: "Carro seminovo, revisões em dia" },
      { plate: "MER4K56", brand: "Fiat" as const, model: "MOBI DRIVE 1.0 Flex 6V 5p", yearFab: 2019, yearModel: 2020, fipeCode: "001480-0", fipePrice: "R$ 43.197,00", color: "Prata", notes: "Econômico, ideal para cidade" },
      { plate: "RIO7H89", brand: "Fiat" as const, model: "PULSE 1.0 Turbo 200 Flex Aut.", yearFab: 2025, yearModel: 2026, fipeCode: "001592-0", fipePrice: "R$ 110.912,00", color: "Vermelho", notes: "SUV compacto turbo, completo" },
      { plate: "SAO1A23", brand: "Fiat" as const, model: "Strada 1.3 mpi Fire 8V 67cv CE", yearFab: 2004, yearModel: 2005, fipeCode: "001184-3", fipePrice: "R$ 28.297,00", color: "Branco", notes: "Pick-up cabine estendida" },
      { plate: "CWB5D67", brand: "Fiat" as const, model: "Toro Blackjack 2.4 16V Flex Aut", yearFab: 2018, yearModel: 2019, fipeCode: "001495-8", fipePrice: "R$ 99.739,00", color: "Preto", notes: "Pick-up média, tração 4x2" },
      { plate: "BHZ3F45", brand: "Fiat" as const, model: "CRONOS 1.0 6V Flex", yearFab: 2022, yearModel: 2023, fipeCode: "001552-0", fipePrice: "R$ 64.039,00", color: "Cinza", notes: "Sedan compacto, bom estado" },
      { plate: "POA8G12", brand: "Chevrolet" as const, model: "ONIX Lollapalooza 1.0 F.Power 5p Mec.", yearFab: 2013, yearModel: 2014, fipeCode: "004451-2", fipePrice: "R$ 43.498,00", color: "Azul", notes: "Edição especial Lollapalooza" },
      { plate: "REC2J34", brand: "Chevrolet" as const, model: "TRACKER 1.0 Turbo 12V Flex Aut.", yearFab: 2025, yearModel: 2026, fipeCode: "004526-8", fipePrice: "R$ 114.659,00", color: "Branco Pérola", notes: "SUV turbo automático, zero bala" },
      { plate: "FOR6L78", brand: "Chevrolet" as const, model: "S10 Blazer DTi 2.8 4x2 Turbo Diesel", yearFab: 2001, yearModel: 2002, fipeCode: "004226-9", fipePrice: "R$ 49.400,00", color: "Prata", notes: "SUV diesel, bom para estrada" },
      { plate: "MAN9N01", brand: "Chevrolet" as const, model: "SPIN 1.8 8V Econo.Flex 5p Aut.", yearFab: 2025, yearModel: 2026, fipeCode: "004564-0", fipePrice: "R$ 105.285,00", color: "Cinza", notes: "Minivan 7 lugares, automático" },
      { plate: "VIT4P23", brand: "Volkswagen" as const, model: "T-Cross 1.0 TSI Flex 12V 5p Mec.", yearFab: 2020, yearModel: 2021, fipeCode: "005511-5", fipePrice: "R$ 91.804,00", color: "Branco", notes: "SUV compacto, câmbio manual" },
      { plate: "NAT7R45", brand: "Volkswagen" as const, model: "VIRTUS 1.6 MSI Flex 16V 4p Aut.", yearFab: 2021, yearModel: 2022, fipeCode: "005500-0", fipePrice: "R$ 84.563,00", color: "Prata", notes: "Sedan automático, completo" },
      { plate: "GOI1T67", brand: "Volkswagen" as const, model: "Saveiro Xtreme 1.6", yearFab: 2002, yearModel: 2003, fipeCode: "005168-3", fipePrice: "R$ 24.700,00", color: "Vermelho", notes: "Pick-up compacta, bom estado" },
      { plate: "FLN3V89", brand: "Toyota" as const, model: "Corolla Altis 1.8 16V Aut. (Híbrido)", yearFab: 2024, yearModel: 2025, fipeCode: "002182-2", fipePrice: "R$ 180.321,00", color: "Grafite", notes: "Sedan híbrido, econômico" },
      { plate: "CPS5X01", brand: "Toyota" as const, model: "YARIS Cross XRE 1.5 16V 5p Aut.", yearFab: 2025, yearModel: 2026, fipeCode: "002223-3", fipePrice: "R$ 154.175,00", color: "Branco Pérola", notes: "SUV compacto, novo modelo" },
      { plate: "JPA8Z23", brand: "Honda" as const, model: "HR-V Advance 1.5 Flex TB 16V 5p Aut.", yearFab: 2025, yearModel: 2026, fipeCode: "014111-9", fipePrice: "R$ 185.886,00", color: "Preto", notes: "SUV turbo, top de linha" },
      { plate: "SLV2B45", brand: "Honda" as const, model: "CITY Hatchback EX 1.5 Flex 16V Aut.", yearFab: 2025, yearModel: 2026, fipeCode: "014115-1", fipePrice: "R$ 129.728,00", color: "Azul", notes: "Hatch automático, completo" },
      { plate: "MAC6D67", brand: "Hyundai" as const, model: "HB20 1.0 Comfort Plus", yearFab: 2023, yearModel: 2024, fipeCode: "015142-4", fipePrice: "R$ 72.500,00", color: "Branco", notes: "Hatch popular, econômico" },
      { plate: "AJU9F89", brand: "Jeep" as const, model: "Renegade 1.8 Flex Aut.", yearFab: 2022, yearModel: 2023, fipeCode: "037006-0", fipePrice: "R$ 98.500,00", color: "Preto", notes: "SUV 4x2, automático" },
      { plate: "TER3H01", brand: "Jeep" as const, model: "Compass 2.0 16V Flex Aut.", yearFab: 2023, yearModel: 2024, fipeCode: "037013-2", fipePrice: "R$ 155.000,00", color: "Grafite", notes: "SUV médio, top da categoria" },
    ];

    for (let i = 0; i < fipeVehicles.length; i++) {
      const v = fipeVehicles[i];
      const fipeCents = parseFipePrice(v.fipePrice);
      const priceVariation = 0.9 + Math.random() * 0.2;
      const askingPrice = Math.round(fipeCents * priceVariation);
      const acquisitionPrice = Math.round(fipeCents * 0.8);
      const owner = owners[i % owners.length];
      const status = statuses[i % statuses.length];
      const condition = conditions[i % conditions.length];

      const vehicle = await storage.createVehicle({
        plate: v.plate,
        brand: v.brand,
        model: v.model,
        color: v.color,
        yearFab: v.yearFab,
        yearModel: v.yearModel,
        condition,
        mileage: Math.floor(Math.random() * 100000),
        acquisitionPrice,
        price: askingPrice,
        status: status,
        ownerId: owner?.id || null,
        notes: v.notes,
        fipeCode: v.fipeCode,
        fipePrice: v.fipePrice,
      });

      if (i < 5) {
        await storage.createExpense({
          vehicleId: vehicle.id,
          description: "Lavagem completa",
          amount: 15000
        });
        await storage.createExpense({
          vehicleId: vehicle.id,
          description: "Polimento e espelhamento",
          amount: 45000
        });
      }
    }
  }
}
