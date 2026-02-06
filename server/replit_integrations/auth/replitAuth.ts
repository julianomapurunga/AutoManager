import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { authStorage } from "./storage";
import { registerSchema, loginSchema } from "@shared/models/auth";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/register", async (req, res) => {
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

      const user = await authStorage.createUser({
        ...input,
        role: "Vendedor",
        password: hashedPassword,
      });

      const { password: _, ...userWithoutPassword } = user;
      req.session.userId = user.id;
      res.status(201).json(userWithoutPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      console.error("Register error:", err);
      res.status(500).json({ message: "Erro ao criar usuário" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const input = loginSchema.parse(req.body);

      const user = await authStorage.getUserByUsername(input.username);
      if (!user) {
        return res.status(401).json({ message: "Usuário ou senha inválidos" });
      }

      const validPassword = await bcrypt.compare(input.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Usuário ou senha inválidos" });
      }

      const { password: _, ...userWithoutPassword } = user;
      req.session.userId = user.id;
      res.json(userWithoutPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      console.error("Login error:", err);
      res.status(500).json({ message: "Erro ao fazer login" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logout realizado com sucesso" });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export const isAdmin: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = await authStorage.getUser(req.session.userId);
  if (!user || user.role !== "Administrador") {
    return res.status(403).json({ message: "Acesso negado. Apenas administradores." });
  }
  next();
};
