import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === ENUMS ===
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

export const PERSON_TYPES = ["Proprietário", "Cliente"] as const;

// === TABLE DEFINITIONS ===

export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  document: text("document"), // CPF/CNPJ
  type: text("type", { enum: PERSON_TYPES }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  plate: text("plate").notNull().unique(),
  brand: text("brand", { enum: VEHICLE_BRANDS }).notNull(),
  model: text("model").notNull(),
  color: text("color").notNull(),
  year: integer("year"),
  price: integer("price"), // Asking price stored in cents
  salePrice: integer("sale_price"), // Actual sale price in cents (set when sold)
  saleDate: timestamp("sale_date"), // Date when vehicle was sold
  buyerId: integer("buyer_id").references(() => people.id), // Client who bought the vehicle
  status: text("status", { enum: VEHICLE_STATUS }).default("Aguardando Preparação").notNull(),
  ownerId: integer("owner_id").references(() => people.id),
  entryDate: timestamp("entry_date").defaultNow(),
  notes: text("notes"),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  description: text("description").notNull(),
  amount: integer("amount").notNull(), // Stored in cents
  date: timestamp("date").defaultNow(),
});

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
  vehicleId: integer("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }).notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const storeExpenses = pgTable("store_expenses", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  category: text("category", { enum: STORE_EXPENSE_CATEGORIES }).notNull(),
  amount: integer("amount").notNull(),
  date: timestamp("date").defaultNow(),
});

// === RELATIONS ===

export const peopleRelations = relations(people, ({ many }) => ({
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

// === BASE SCHEMAS ===

export const insertPersonSchema = createInsertSchema(people).omit({ id: true, createdAt: true });
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, entryDate: true, saleDate: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, date: true });
export const insertStoreExpenseSchema = createInsertSchema(storeExpenses).omit({ id: true, date: true });
export const insertVehicleImageSchema = createInsertSchema(vehicleImages).omit({ id: true, createdAt: true });

// === EXPLICIT API CONTRACT TYPES ===

export type Person = typeof people.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type StoreExpense = typeof storeExpenses.$inferSelect;
export type VehicleImage = typeof vehicleImages.$inferSelect;

export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertStoreExpense = z.infer<typeof insertStoreExpenseSchema>;

// With Relations
export type VehicleWithDetails = Vehicle & {
  owner: Person | null;
  buyer: Person | null;
  expenses: Expense[];
};

export * from "./models/auth";
