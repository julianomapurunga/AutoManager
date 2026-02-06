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

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await setupAuth(app);
  registerAuthRoutes(app);

  // === PEOPLE ROUTES ===
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

  // === VEHICLE ROUTES ===
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

  // === EXPENSE ROUTES ===
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

  // === MARK AS SOLD ===
  app.post("/api/vehicles/:id/sell", isAuthenticated, async (req, res) => {
    try {
      const input = api.sales.markAsSold.input.parse(req.body);
      const vehicle = await storage.getVehicle(Number(req.params.id));
      if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
      
      const updated = await storage.markVehicleAsSold(
        Number(req.params.id),
        input.salePrice,
        input.buyerId ?? null,
        input.saleDate ? new Date(input.saleDate) : new Date()
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

  // === STORE EXPENSE ROUTES ===
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

  // === VEHICLE IMAGES ROUTES ===
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

  // === DASHBOARD ROUTES ===
  app.get(api.dashboard.get.path, isAuthenticated, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  // === SEED DATA ===
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingPeople = await storage.getPeople();
  if (existingPeople.length === 0) {
    const owner1 = await storage.createPerson({
      name: "João Silva",
      email: "joao@email.com",
      phone: "11999998888",
      type: "Proprietário",
      document: "123.456.789-00"
    });

    const owner2 = await storage.createPerson({
      name: "Maria Oliveira",
      email: "maria@email.com",
      phone: "11988887777",
      type: "Proprietário",
      document: "987.654.321-99"
    });

    await storage.createPerson({
      name: "Carlos Santos",
      email: "carlos@email.com",
      phone: "11977776666",
      type: "Cliente",
      document: "111.222.333-44"
    });

    const vehicle1 = await storage.createVehicle({
      plate: "ABC-1234",
      brand: "Honda",
      model: "Civic EX",
      color: "Prata",
      yearFab: 2020,
      yearModel: 2020,
      price: 8500000,
      status: "Disponível",
      ownerId: owner1.id,
      notes: "Carro em ótimo estado, único dono."
    });

    await storage.createVehicle({
      plate: "XYZ-9876",
      brand: "Toyota",
      model: "Corolla XEi",
      color: "Preto",
      yearFab: 2021,
      yearModel: 2021,
      price: 11000000,
      status: "Aguardando Preparação",
      ownerId: owner2.id,
      notes: "Precisa de polimento."
    });

    await storage.createExpense({
      vehicleId: vehicle1.id,
      description: "Lavagem completa",
      amount: 15000
    });

    await storage.createExpense({
      vehicleId: vehicle1.id,
      description: "Troca de óleo",
      amount: 35000
    });
  }
}
