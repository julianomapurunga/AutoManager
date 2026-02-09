import { db } from "./db";
import {
  people, vehicles, expenses, storeExpenses, vehicleImages,
  type Person, type InsertPerson,
  type Vehicle, type InsertVehicle, type VehicleWithDetails,
  type Expense, type InsertExpense,
  type StoreExpense, type InsertStoreExpense,
  type VehicleImage
} from "@shared/schema";
import { eq, desc, and, sql, gte, lt, or, ilike } from "drizzle-orm";

export interface IStorage {
  getPeople(type?: string): Promise<Person[]>;
  getPerson(id: number): Promise<Person | undefined>;
  getPersonByDocument(document: string): Promise<Person | undefined>;
  createPerson(person: InsertPerson): Promise<Person>;
  updatePerson(id: number, person: Partial<InsertPerson>): Promise<Person>;
  deletePerson(id: number): Promise<void>;

  getVehicles(filters?: { status?: string, ownerId?: number, search?: string }): Promise<(Vehicle & { owner: Person | null })[]>;
  getVehicle(id: number): Promise<VehicleWithDetails | undefined>;
  getVehicleByPlate(plate: string): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle>;
  deleteVehicle(id: number): Promise<void>;
  markVehicleAsSold(id: number, salePrice: number, buyerId: number | null, saleDate?: Date): Promise<Vehicle>;

  getExpensesByVehicle(vehicleId: number): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  deleteExpense(id: number): Promise<void>;

  getStoreExpenses(): Promise<StoreExpense[]>;
  createStoreExpense(expense: InsertStoreExpense): Promise<StoreExpense>;
  deleteStoreExpense(id: number): Promise<void>;

  getVehicleImages(vehicleId: number): Promise<VehicleImage[]>;
  createVehicleImage(vehicleId: number, fileName: string, filePath: string): Promise<VehicleImage>;
  deleteVehicleImage(id: number): Promise<VehicleImage | undefined>;
  deleteAllVehicleImages(vehicleId: number): Promise<VehicleImage[]>;

  getDashboardStats(): Promise<{
    totalVehicles: number;
    totalAvailable: number;
    totalSold: number;
    totalExpenses: number;
    totalVehicleExpenses: number;
    totalStoreExpenses: number;
    currentMonthSales: number;
    currentMonthRevenue: number;
    previousMonthSales: number;
    previousMonthRevenue: number;
    currentMonthExpenses: number;
    previousMonthExpenses: number;
  }>;
}

function getMonthRange(offset: number = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return { start, end };
}

export class DatabaseStorage implements IStorage {
  async getPeople(type?: string): Promise<Person[]> {
    if (type) {
      return await db.select().from(people).where(eq(people.type, type));
    }
    return await db.select().from(people);
  }

  async getPerson(id: number): Promise<Person | undefined> {
    const [person] = await db.select().from(people).where(eq(people.id, id));
    return person;
  }

  async getPersonByDocument(document: string): Promise<Person | undefined> {
    const cleaned = document.replace(/\D/g, "");
    const [person] = await db.select().from(people).where(
      sql`REPLACE(REPLACE(REPLACE(${people.document}, '.', ''), '-', ''), '/', '') = ${cleaned}`
    );
    return person;
  }

  async createPerson(insertPerson: InsertPerson): Promise<Person> {
    const [person] = await db.insert(people).values(insertPerson).returning();
    return person;
  }

  async updatePerson(id: number, updates: Partial<InsertPerson>): Promise<Person> {
    const [updated] = await db
      .update(people)
      .set(updates)
      .where(eq(people.id, id))
      .returning();
    return updated;
  }

  async deletePerson(id: number): Promise<void> {
    await db.delete(people).where(eq(people.id, id));
  }

  async getVehicles(filters?: { status?: string, ownerId?: number, search?: string }): Promise<(Vehicle & { owner: Person | null })[]> {
    const conditions = [];
    if (filters?.status) conditions.push(eq(vehicles.status, filters.status));
    if (filters?.ownerId) conditions.push(eq(vehicles.ownerId, filters.ownerId));
    if (filters?.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(vehicles.plate, term),
          ilike(vehicles.model, term),
          ilike(vehicles.brand, term),
          ilike(vehicles.color, term),
        )!
      );
    }

    const result = await db.select({
      vehicle: vehicles,
      owner: people,
    })
    .from(vehicles)
    .leftJoin(people, eq(vehicles.ownerId, people.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(vehicles.entryDate));

    return result.map(({ vehicle, owner }) => ({ ...vehicle, owner }));
  }

  async getVehicle(id: number): Promise<VehicleWithDetails | undefined> {
    const [result] = await db.select({
      vehicle: vehicles,
      owner: people,
    })
    .from(vehicles)
    .leftJoin(people, eq(vehicles.ownerId, people.id))
    .where(eq(vehicles.id, id));

    if (!result) return undefined;

    const vehicleExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.vehicleId, id))
      .orderBy(desc(expenses.date));

    let buyer: Person | null = null;
    if (result.vehicle.buyerId) {
      const [buyerResult] = await db.select().from(people).where(eq(people.id, result.vehicle.buyerId));
      buyer = buyerResult || null;
    }

    return {
      ...result.vehicle,
      owner: result.owner,
      buyer,
      expenses: vehicleExpenses,
    };
  }

  async getVehicleByPlate(plate: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.plate, plate));
    return vehicle;
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await db.insert(vehicles).values(insertVehicle).returning();
    return vehicle;
  }

  async updateVehicle(id: number, updates: Partial<InsertVehicle>): Promise<Vehicle> {
    const [updated] = await db
      .update(vehicles)
      .set(updates)
      .where(eq(vehicles.id, id))
      .returning();
    return updated;
  }

  async deleteVehicle(id: number): Promise<void> {
    await db.delete(vehicles).where(eq(vehicles.id, id));
  }

  async markVehicleAsSold(id: number, salePrice: number, buyerId: number | null, saleDate?: Date): Promise<Vehicle> {
    const [updated] = await db
      .update(vehicles)
      .set({
        status: "Vendido",
        salePrice,
        saleDate: saleDate ?? new Date(),
        buyerId,
      })
      .where(eq(vehicles.id, id))
      .returning();
    return updated;
  }

  async getExpensesByVehicle(vehicleId: number): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.vehicleId, vehicleId));
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(insertExpense).returning();
    return expense;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  async getStoreExpenses(): Promise<StoreExpense[]> {
    return await db.select().from(storeExpenses).orderBy(desc(storeExpenses.date));
  }

  async createStoreExpense(insertStoreExpense: InsertStoreExpense): Promise<StoreExpense> {
    const [expense] = await db.insert(storeExpenses).values(insertStoreExpense).returning();
    return expense;
  }

  async deleteStoreExpense(id: number): Promise<void> {
    await db.delete(storeExpenses).where(eq(storeExpenses.id, id));
  }

  async getVehicleImages(vehicleId: number): Promise<VehicleImage[]> {
    return await db.select().from(vehicleImages)
      .where(eq(vehicleImages.vehicleId, vehicleId))
      .orderBy(desc(vehicleImages.createdAt));
  }

  async createVehicleImage(vehicleId: number, fileName: string, filePath: string): Promise<VehicleImage> {
    const [image] = await db.insert(vehicleImages).values({ vehicleId, fileName, filePath }).returning();
    return image;
  }

  async deleteVehicleImage(id: number): Promise<VehicleImage | undefined> {
    const [deleted] = await db.delete(vehicleImages).where(eq(vehicleImages.id, id)).returning();
    return deleted;
  }

  async deleteAllVehicleImages(vehicleId: number): Promise<VehicleImage[]> {
    return await db.delete(vehicleImages).where(eq(vehicleImages.vehicleId, vehicleId)).returning();
  }

  async getDashboardStats() {
    const [counts] = await db.select({
      total: sql<number>`count(*)`,
      available: sql<number>`count(case when ${vehicles.status} = 'Disponível' then 1 end)`,
      sold: sql<number>`count(case when ${vehicles.status} = 'Vendido' then 1 end)`,
    }).from(vehicles);

    const [vehicleExpenseSum] = await db.select({
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`
    }).from(expenses);

    const [storeExpenseSum] = await db.select({
      total: sql<number>`coalesce(sum(${storeExpenses.amount}), 0)`
    }).from(storeExpenses);

    const currentMonth = getMonthRange(0);
    const previousMonth = getMonthRange(-1);

    const [currentMonthData] = await db.select({
      salesCount: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(${vehicles.salePrice}), 0)`,
    }).from(vehicles).where(
      and(
        eq(vehicles.status, "Vendido"),
        gte(vehicles.saleDate, currentMonth.start),
        lt(vehicles.saleDate, currentMonth.end)
      )
    );

    const [previousMonthData] = await db.select({
      salesCount: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(${vehicles.salePrice}), 0)`,
    }).from(vehicles).where(
      and(
        eq(vehicles.status, "Vendido"),
        gte(vehicles.saleDate, previousMonth.start),
        lt(vehicles.saleDate, previousMonth.end)
      )
    );

    const [currentMonthVehicleExp] = await db.select({
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`
    }).from(expenses).where(
      and(
        gte(expenses.date, currentMonth.start),
        lt(expenses.date, currentMonth.end)
      )
    );

    const [previousMonthVehicleExp] = await db.select({
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`
    }).from(expenses).where(
      and(
        gte(expenses.date, previousMonth.start),
        lt(expenses.date, previousMonth.end)
      )
    );

    const [currentMonthStoreExp] = await db.select({
      total: sql<number>`coalesce(sum(${storeExpenses.amount}), 0)`
    }).from(storeExpenses).where(
      and(
        gte(storeExpenses.date, currentMonth.start),
        lt(storeExpenses.date, currentMonth.end)
      )
    );

    const [previousMonthStoreExp] = await db.select({
      total: sql<number>`coalesce(sum(${storeExpenses.amount}), 0)`
    }).from(storeExpenses).where(
      and(
        gte(storeExpenses.date, previousMonth.start),
        lt(storeExpenses.date, previousMonth.end)
      )
    );

    const totalVehicleExpenses = Number(vehicleExpenseSum?.total || 0);
    const totalStoreExpenses = Number(storeExpenseSum?.total || 0);
    const totalExpenses = totalVehicleExpenses + totalStoreExpenses;
    const currentMonthExpenses = Number(currentMonthVehicleExp?.total || 0) + Number(currentMonthStoreExp?.total || 0);
    const previousMonthExpenses = Number(previousMonthVehicleExp?.total || 0) + Number(previousMonthStoreExp?.total || 0);

    return {
      totalVehicles: Number(counts?.total || 0),
      totalAvailable: Number(counts?.available || 0),
      totalSold: Number(counts?.sold || 0),
      totalExpenses,
      totalVehicleExpenses,
      totalStoreExpenses,
      currentMonthSales: Number(currentMonthData?.salesCount || 0),
      currentMonthRevenue: Number(currentMonthData?.revenue || 0),
      previousMonthSales: Number(previousMonthData?.salesCount || 0),
      previousMonthRevenue: Number(previousMonthData?.revenue || 0),
      currentMonthExpenses,
      previousMonthExpenses,
    };
  }
}

export const storage = new DatabaseStorage();
