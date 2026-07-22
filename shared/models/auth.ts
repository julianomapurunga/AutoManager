import { pgTable, timestamp, varchar, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations } from "./tenancy";
import { isValidCpf } from "../cpf";

const cpfField = z.string().min(11, "CPF inválido").refine(isValidCpf, "CPF inválido: confira os dígitos");

/**
 * Senha ao DEFINIR uma nova (cadastro, criação de equipe, troca de senha).
 * Mínimo 8 caracteres. Não usar no login: lá aceitamos senhas já existentes,
 * que podem ser mais curtas, para não travar quem se cadastrou antes.
 */
const newPasswordField = z.string().min(8, "Senha deve ter no mínimo 8 caracteres");

export const USER_ROLES = ["Administrador", "Gerente", "Vendedor", "Financeiro"] as const;
export const USER_GENDERS = ["Masculino", "Feminino", "Outro"] as const;

/**
 * Perfil do usuário dentro do SaaS.
 * A autenticação (email/senha) fica no Supabase Auth; o `id` aqui é o UUID
 * do usuário em `auth.users` do Supabase.
 */
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey(), // UUID do Supabase Auth
    organizationId: integer("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }),
    phone: varchar("phone", { length: 20 }).notNull(),
    cpf: varchar("cpf", { length: 14 }).notNull(),
    gender: varchar("gender", { length: 20, enum: USER_GENDERS }).notNull(),
    role: varchar("role", { length: 30, enum: USER_ROLES }).notNull(),
    profileImageUrl: varchar("profile_image_url"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [uniqueIndex("users_org_cpf_unique").on(table.organizationId, table.cpf)],
).enableRLS();

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
  profileImageUrl: true,
});

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

/** Cadastro de nova loja (organização) + primeiro usuário administrador. */
export const signupSchema = z.object({
  organizationName: z.string().min(2, "Nome da loja é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: newPasswordField,
  firstName: z.string().min(2, "Nome é obrigatório"),
  lastName: z.string().optional().nullable(),
  phone: z.string().min(10, "Telefone inválido"),
  cpf: cpfField,
  gender: z.enum(USER_GENDERS, { required_error: "Sexo é obrigatório" }),
});

/** Criação de usuário da equipe (feita por um administrador). */
export const createUserSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: newPasswordField,
  firstName: z.string().min(2, "Nome é obrigatório"),
  lastName: z.string().optional().nullable(),
  phone: z.string().min(10, "Telefone inválido"),
  cpf: cpfField,
  gender: z.enum(USER_GENDERS, { required_error: "Sexo é obrigatório" }),
  role: z.enum(USER_ROLES, { required_error: "Cargo é obrigatório" }),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(2, "Nome é obrigatório").optional(),
  lastName: z.string().optional().nullable(),
  phone: z.string().min(10, "Telefone inválido").optional(),
  cpf: cpfField.optional(),
  gender: z.enum(USER_GENDERS).optional(),
  role: z.enum(USER_ROLES).optional(),
  password: newPasswordField.optional(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type UpdateUser = z.infer<typeof updateUserSchema>;
/**
 * Conclusão de cadastro para quem entrou via Google (login social).
 * O e-mail e a senha ficam a cargo do Supabase/Google, então aqui só
 * coletamos os dados de negócio que o Google não fornece (loja, CPF, etc.).
 */
export const completeProfileSchema = z.object({
  organizationName: z.string().min(2, "Nome da loja é obrigatório"),
  firstName: z.string().min(2, "Nome é obrigatório"),
  lastName: z.string().optional().nullable(),
  phone: z.string().min(10, "Telefone inválido"),
  cpf: cpfField,
  gender: z.enum(USER_GENDERS, { required_error: "Sexo é obrigatório" }),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
