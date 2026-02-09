import type { Express } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authStorage } from "./storage";
import { isAuthenticated, isAdmin } from "./replitAuth";
import { updateUserSchema, registerSchema } from "@shared/models/auth";
import { z } from "zod";

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

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.put("/api/auth/profile", isAuthenticated, profileUpload.single("profileImage"), async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const updateData: Record<string, unknown> = {};

      if (req.body.firstName) {
        updateData.firstName = req.body.firstName;
      }
      if (req.body.lastName !== undefined) {
        updateData.lastName = req.body.lastName || null;
      }

      const oldImageUrl = user.profileImageUrl;

      if (req.file) {
        updateData.profileImageUrl = `/uploads/profiles/${req.file.filename}`;
      }

      if (Object.keys(updateData).length === 0) {
        const { password: _, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      }

      const updated = await authStorage.updateUser(userId, updateData as any);

      if (req.file && oldImageUrl) {
        const oldFilename = oldImageUrl.replace("/uploads/profiles/", "");
        const oldPath = path.join(profileUploadsDir, oldFilename);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      const { password: _, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (err) {
      console.error("Error updating profile:", err);
      res.status(500).json({ message: "Erro ao atualizar perfil" });
    }
  });

  app.delete("/api/auth/profile-image", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      if (user.profileImageUrl) {
        const filename = user.profileImageUrl.replace("/uploads/profiles/", "");
        const filePath = path.join(profileUploadsDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      const updated = await authStorage.updateUser(userId, { profileImageUrl: null } as any);
      const { password: _, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (err) {
      console.error("Error removing profile image:", err);
      res.status(500).json({ message: "Erro ao remover foto de perfil" });
    }
  });

  app.get("/api/users", isAdmin, async (_req, res) => {
    try {
      const allUsers = await authStorage.getAllUsers();
      const usersWithoutPasswords = allUsers.map(({ password: _, ...u }) => u);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error listing users:", error);
      res.status(500).json({ message: "Erro ao listar usuários" });
    }
  });

  app.post("/api/users", isAdmin, async (req, res) => {
    try {
      const input = registerSchema.parse(req.body);

      const existingUsername = await authStorage.getUserByUsername(input.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Nome de usuário já existe", field: "username" });
      }

      const existingCpf = await authStorage.getUserByCpf(input.cpf);
      if (existingCpf) {
        return res.status(400).json({ message: "CPF já cadastrado", field: "cpf" });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const user = await authStorage.createUser({ ...input, password: hashedPassword });
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      console.error("Error creating user:", err);
      res.status(500).json({ message: "Erro ao criar usuário" });
    }
  });

  app.put("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const input = updateUserSchema.parse(req.body);

      const existingUser = await authStorage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      if (input.cpf && input.cpf !== existingUser.cpf) {
        const existingCpf = await authStorage.getUserByCpf(input.cpf);
        if (existingCpf) {
          return res.status(400).json({ message: "CPF já cadastrado", field: "cpf" });
        }
      }

      const updateData: Record<string, unknown> = { ...input };
      if (input.password) {
        updateData.password = await bcrypt.hash(input.password, 10);
      } else {
        delete updateData.password;
      }

      const updated = await authStorage.updateUser(userId, updateData as any);
      const { password: _, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      console.error("Error updating user:", err);
      res.status(500).json({ message: "Erro ao atualizar usuário" });
    }
  });

  app.delete("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const currentUserId = req.session.userId!;

      if (userId === currentUserId) {
        return res.status(400).json({ message: "Você não pode excluir sua própria conta" });
      }

      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      await authStorage.deleteUser(userId);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Erro ao excluir usuário" });
    }
  });
}
