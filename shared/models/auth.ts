import { sql } from "drizzle-orm";
import { index, pgTable, timestamp, varchar, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { jsonb } from "drizzle-orm/pg-core";

export const USER_ROLES = ["Administrador", "Gerente", "Vendedor", "Financeiro"] as const;
export const USER_GENDERS = ["Masculino", "Feminino", "Outro"] as const;

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }),
  phone: varchar("phone", { length: 20 }).notNull(),
  cpf: varchar("cpf", { length: 14 }).notNull().unique(),
  gender: varchar("gender", { length: 20, enum: USER_GENDERS }).notNull(),
  role: varchar("role", { length: 30, enum: USER_ROLES }).notNull(),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  profileImageUrl: true,
});

export const loginSchema = z.object({
  username: z.string().min(3, "Usuário deve ter no mínimo 3 caracteres"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export const registerSchema = insertUserSchema.extend({
  username: z.string().min(3, "Usuário deve ter no mínimo 3 caracteres"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  firstName: z.string().min(2, "Nome é obrigatório"),
  phone: z.string().min(10, "Telefone inválido"),
  cpf: z.string().min(11, "CPF inválido"),
  gender: z.enum(USER_GENDERS, { required_error: "Sexo é obrigatório" }),
  role: z.enum(USER_ROLES, { required_error: "Cargo é obrigatório" }),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(2, "Nome é obrigatório").optional(),
  lastName: z.string().optional().nullable(),
  phone: z.string().min(10, "Telefone inválido").optional(),
  cpf: z.string().min(11, "CPF inválido").optional(),
  gender: z.enum(USER_GENDERS).optional(),
  role: z.enum(USER_ROLES).optional(),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").optional(),
});

export const adminCreateUserSchema = registerSchema;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type UpdateUser = z.infer<typeof updateUserSchema>;
