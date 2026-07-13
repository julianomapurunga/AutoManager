import { pgTable, text, serial, integer, timestamp, varchar, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";
import { organizations } from "./models/tenancy";

export * from "./models/tenancy";

export const VEHICLE_BRANDS = [
  "Toyota", "Honda", "Ford", "Chevrolet", "Volkswagen",
  "Fiat", "Hyundai", "Renault", "Nissan", "Jeep", "Outra"
] as const;

export const VEHICLE_STATUS = [
  "Disponível",
  "Vendido",
  "Em Manutenção",
  "Aguardando Preparação",
  "Reservado"
] as const;

export const VEHICLE_CONDITIONS = ["Novo", "Semi-novo", "Usado"] as const;

export const PERSON_TYPES = ["Proprietário", "Cliente"] as const;

export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  document: text("document"),
  type: text("type", { enum: PERSON_TYPES }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("people_org_idx").on(table.organizationId)]);

export const intermediaries = pgTable("intermediaries", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  cpf: text("cpf").notNull(),
  birthDate: timestamp("birth_date"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("intermediaries_org_idx").on(table.organizationId)]);

export const vehicles = pgTable(
  "vehicles",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    plate: text("plate").notNull(),
    brand: text("brand", { enum: VEHICLE_BRANDS }).notNull(),
    model: text("model").notNull(),
    color: text("color").notNull(),
    yearFab: integer("year_fab"),
    yearModel: integer("year_model"),
    condition: text("condition", { enum: VEHICLE_CONDITIONS }),
    mileage: integer("mileage"),
    acquisitionPrice: integer("acquisition_price"),
    price: integer("price"),
    salePrice: integer("sale_price"),
    saleDate: timestamp("sale_date"),
    saleMileage: integer("sale_mileage"),
    buyerId: integer("buyer_id").references(() => people.id),
    status: text("status", { enum: VEHICLE_STATUS }).default("Aguardando Preparação").notNull(),
    ownerId: integer("owner_id").references(() => people.id),
    entryDate: timestamp("entry_date").defaultNow(),
    notes: text("notes"),
    fipeCode: text("fipe_code"),
    fipePrice: text("fipe_price"),
    tradeInVehicleId: integer("trade_in_vehicle_id"),
    tradeInValue: integer("trade_in_value"),
    intermediaryId: integer("intermediary_id").references(() => intermediaries.id),
    intermediaryCommission: integer("intermediary_commission"),
  },
  (table) => [
    uniqueIndex("vehicles_org_plate_unique").on(table.organizationId, table.plate),
    index("vehicles_org_status_idx").on(table.organizationId, table.status),
  ],
);

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
  date: timestamp("date").defaultNow(),
}, (table) => [
  index("expenses_org_idx").on(table.organizationId),
  index("expenses_vehicle_idx").on(table.vehicleId),
]);

export const STORE_EXPENSE_CATEGORIES = [
  "Aluguel",
  "Internet",
  "Água",
  "Energia",
  "Produto de Limpeza",
  "Material de Escritório",
  "Telefone",
  "Seguro",
  "Impostos",
  "Salários",
  "Outros",
] as const;

export const vehicleImages = pgTable("vehicle_images", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }).notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("vehicle_images_vehicle_idx").on(table.vehicleId)]);

export const storeExpenses = pgTable("store_expenses", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  description: text("description").notNull(),
  category: text("category", { enum: STORE_EXPENSE_CATEGORIES }).notNull(),
  amount: integer("amount").notNull(),
  date: timestamp("date").defaultNow(),
}, (table) => [index("store_expenses_org_date_idx").on(table.organizationId, table.date)]);

export const peopleRelations = relations(people, ({ many }) => ({
  vehicles: many(vehicles),
}));

export const intermediariesRelations = relations(intermediaries, ({ many }) => ({
  vehicles: many(vehicles),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  owner: one(people, {
    fields: [vehicles.ownerId],
    references: [people.id],
  }),
  buyer: one(people, {
    fields: [vehicles.buyerId],
    references: [people.id],
  }),
  intermediary: one(intermediaries, {
    fields: [vehicles.intermediaryId],
    references: [intermediaries.id],
  }),
  expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [expenses.vehicleId],
    references: [vehicles.id],
  }),
}));

export const vehicleImagesRelations = relations(vehicleImages, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleImages.vehicleId],
    references: [vehicles.id],
  }),
}));

// Os schemas de inserção omitem organizationId: ele nunca vem do cliente,
// é sempre injetado pelo servidor a partir do usuário autenticado.
export const insertPersonSchema = createInsertSchema(people).omit({ id: true, createdAt: true, organizationId: true });
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, entryDate: true, saleDate: true, organizationId: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, date: true, organizationId: true });
export const insertStoreExpenseSchema = createInsertSchema(storeExpenses).omit({ id: true, date: true, organizationId: true });
export const insertVehicleImageSchema = createInsertSchema(vehicleImages).omit({ id: true, createdAt: true, organizationId: true });
export const insertIntermediarySchema = createInsertSchema(intermediaries).omit({ id: true, createdAt: true, organizationId: true });

export type Person = typeof people.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type StoreExpense = typeof storeExpenses.$inferSelect;
export type VehicleImage = typeof vehicleImages.$inferSelect;
export type Intermediary = typeof intermediaries.$inferSelect;

export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertStoreExpense = z.infer<typeof insertStoreExpenseSchema>;
export type InsertIntermediary = z.infer<typeof insertIntermediarySchema>;

export type VehicleWithDetails = Vehicle & {
  owner: Person | null;
  buyer: Person | null;
  expenses: Expense[];
  intermediary?: Intermediary | null;
};

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("audit_logs_org_created_idx").on(table.organizationId, table.createdAt)]);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
