import { db } from "./db";
import {
  people, vehicles, expenses, storeExpenses, vehicleImages, intermediaries, auditLogs,
  type Person, type InsertPerson,
  type Vehicle, type InsertVehicle, type VehicleWithDetails,
  type Expense, type InsertExpense,
  type StoreExpense, type InsertStoreExpense,
  type VehicleImage,
  type Intermediary, type InsertIntermediary,
  type AuditLog
} from "@shared/schema";
import { users, type User } from "@shared/models/auth";
import { eq, desc, and, sql, gte, lt, or, ilike, count } from "drizzle-orm";

/**
 * Contexto do tenant: toda operação de dados é escopada pela organização
 * do usuário autenticado. O userId alimenta o log de auditoria.
 */
export type TenantCtx = {
  organizationId: number;
  userId?: string;
  /**
   * Presente quando um super admin está agindo dentro da loja (impersonation).
   * A auditoria marca a ação como do super admin, não de um usuário da loja.
   */
  impersonatorEmail?: string | null;
};

function getMonthRange(offset: number = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return { start, end };
}

export class DatabaseStorage {
  private async audit(ctx: TenantCtx, action: string, entityType: string, entityId: number | null, details: string) {
    // Durante impersonation, a ação é do super admin: não a atribui a um usuário
    // da loja (userId nulo) e prefixa o detalhe deixando a origem explícita.
    const isImpersonated = !!ctx.impersonatorEmail;
    await db.insert(auditLogs).values({
      organizationId: ctx.organizationId,
      userId: isImpersonated ? null : (ctx.userId ?? null),
      action,
      entityType,
      entityId,
      details: isImpersonated ? `[Super Admin: ${ctx.impersonatorEmail}] ${details}` : details,
    });
  }

  // ─── Pessoas ────────────────────────────────────────────────────────────

  async getPeople(ctx: TenantCtx, type?: string): Promise<Person[]> {
    const conditions = [eq(people.organizationId, ctx.organizationId)];
    if (type) conditions.push(eq(people.type, type));
    return await db.select().from(people).where(and(...conditions));
  }

  async getPerson(ctx: TenantCtx, id: number): Promise<Person | undefined> {
    const [person] = await db.select().from(people)
      .where(and(eq(people.id, id), eq(people.organizationId, ctx.organizationId)));
    return person;
  }

  async getPersonByDocument(ctx: TenantCtx, document: string): Promise<Person | undefined> {
    const cleaned = document.replace(/\D/g, "");
    const [person] = await db.select().from(people).where(
      and(
        eq(people.organizationId, ctx.organizationId),
        sql`REPLACE(REPLACE(REPLACE(${people.document}, '.', ''), '-', ''), '/', '') = ${cleaned}`
      )
    );
    return person;
  }

  async createPerson(ctx: TenantCtx, insertPerson: InsertPerson): Promise<Person> {
    const [person] = await db.insert(people)
      .values({ ...insertPerson, organizationId: ctx.organizationId })
      .returning();
    await this.audit(ctx, "Criar", "Pessoa", person.id, `Pessoa ${person.name} criada`);
    return person;
  }

  async updatePerson(ctx: TenantCtx, id: number, updates: Partial<InsertPerson>): Promise<Person> {
    const [updated] = await db
      .update(people)
      .set(updates)
      .where(and(eq(people.id, id), eq(people.organizationId, ctx.organizationId)))
      .returning();
    if (!updated) throw new Error("Person not found");
    await this.audit(ctx, "Atualizar", "Pessoa", updated.id, `Pessoa ${updated.name} atualizada`);
    return updated;
  }

  /** Verifica se a pessoa está vinculada a algum veículo (dono ou comprador). */
  async personHasVehicles(ctx: TenantCtx, id: number): Promise<boolean> {
    const [row] = await db.select({ id: vehicles.id }).from(vehicles)
      .where(and(
        eq(vehicles.organizationId, ctx.organizationId),
        or(eq(vehicles.ownerId, id), eq(vehicles.buyerId, id))!
      ))
      .limit(1);
    return !!row;
  }

  async deletePerson(ctx: TenantCtx, id: number): Promise<void> {
    // Auditoria só depois da exclusão bem-sucedida
    await db.delete(people)
      .where(and(eq(people.id, id), eq(people.organizationId, ctx.organizationId)));
    await this.audit(ctx, "Excluir", "Pessoa", id, `Pessoa ID ${id} excluída`);
  }

  // ─── Veículos ───────────────────────────────────────────────────────────

  async countVehicles(ctx: TenantCtx): Promise<number> {
    const [row] = await db.select({ value: count() }).from(vehicles)
      .where(eq(vehicles.organizationId, ctx.organizationId));
    return Number(row?.value ?? 0);
  }

  async getVehicles(ctx: TenantCtx, filters?: { status?: string, ownerId?: number, search?: string }): Promise<(Vehicle & { owner: Person | null })[]> {
    const conditions = [eq(vehicles.organizationId, ctx.organizationId)];
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
    .where(and(...conditions))
    .orderBy(desc(vehicles.entryDate));

    return result.map(({ vehicle, owner }) => ({ ...vehicle, owner }));
  }

  async getVehicle(ctx: TenantCtx, id: number): Promise<VehicleWithDetails | undefined> {
    const [result] = await db.select({
      vehicle: vehicles,
      owner: people,
    })
    .from(vehicles)
    .leftJoin(people, eq(vehicles.ownerId, people.id))
    .where(and(eq(vehicles.id, id), eq(vehicles.organizationId, ctx.organizationId)));

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

    let intermediary: Intermediary | null = null;
    if (result.vehicle.intermediaryId) {
      const [intResult] = await db.select().from(intermediaries).where(eq(intermediaries.id, result.vehicle.intermediaryId));
      intermediary = intResult || null;
    }

    return {
      ...result.vehicle,
      owner: result.owner,
      buyer,
      expenses: vehicleExpenses,
      intermediary,
    };
  }

  async getVehicleByPlate(ctx: TenantCtx, plate: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles)
      .where(and(eq(vehicles.plate, plate), eq(vehicles.organizationId, ctx.organizationId)));
    return vehicle;
  }

  async createVehicle(ctx: TenantCtx, insertVehicle: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await db.insert(vehicles)
      .values({ ...insertVehicle, organizationId: ctx.organizationId })
      .returning();
    await this.audit(ctx, "Criar", "Veículo", vehicle.id, `Veículo ${vehicle.brand} ${vehicle.model} (${vehicle.plate}) criado`);
    return vehicle;
  }

  async updateVehicle(ctx: TenantCtx, id: number, updates: Partial<InsertVehicle>): Promise<Vehicle> {
    const [updated] = await db
      .update(vehicles)
      .set(updates)
      .where(and(eq(vehicles.id, id), eq(vehicles.organizationId, ctx.organizationId)))
      .returning();
    if (!updated) throw new Error("Vehicle not found");
    await this.audit(ctx, "Atualizar", "Veículo", updated.id, `Veículo ${updated.brand} ${updated.model} (${updated.plate}) atualizado`);
    return updated;
  }

  async deleteVehicle(ctx: TenantCtx, id: number): Promise<void> {
    // Transação: remove despesas do veículo junto (FK sem cascade) e depois o veículo
    await db.transaction(async (tx) => {
      await tx.delete(expenses)
        .where(and(eq(expenses.vehicleId, id), eq(expenses.organizationId, ctx.organizationId)));
      await tx.delete(vehicles)
        .where(and(eq(vehicles.id, id), eq(vehicles.organizationId, ctx.organizationId)));
    });
    // Auditoria só depois da exclusão bem-sucedida
    await this.audit(ctx, "Excluir", "Veículo", id, `Veículo ID ${id} excluído`);
  }

  async markVehicleAsSold(ctx: TenantCtx, id: number, data: {
    salePrice: number;
    buyerId: number | null;
    saleDate?: Date;
    saleMileage?: number | null;
    tradeInVehicleId?: number | null;
    tradeInValue?: number | null;
    intermediaryId?: number | null;
    intermediaryCommission?: number | null;
  }): Promise<Vehicle> {
    const [updated] = await db
      .update(vehicles)
      .set({
        status: "Vendido",
        salePrice: data.salePrice,
        saleDate: data.saleDate ?? new Date(),
        buyerId: data.buyerId,
        saleMileage: data.saleMileage ?? null,
        tradeInVehicleId: data.tradeInVehicleId ?? null,
        tradeInValue: data.tradeInValue ?? null,
        intermediaryId: data.intermediaryId ?? null,
        intermediaryCommission: data.intermediaryCommission ?? null,
      })
      .where(and(eq(vehicles.id, id), eq(vehicles.organizationId, ctx.organizationId)))
      .returning();
    if (!updated) throw new Error("Vehicle not found");

    await this.audit(ctx, "Venda", "Veículo", updated.id,
      `Veículo ${updated.brand} ${updated.model} (${updated.plate}) marcado como vendido por R$ ${(data.salePrice / 100).toFixed(2)}`);

    return updated;
  }

  // ─── Despesas de veículo ────────────────────────────────────────────────

  async getExpensesByVehicle(ctx: TenantCtx, vehicleId: number): Promise<Expense[]> {
    return await db.select().from(expenses)
      .where(and(eq(expenses.vehicleId, vehicleId), eq(expenses.organizationId, ctx.organizationId)));
  }

  async createExpense(ctx: TenantCtx, insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses)
      .values({ ...insertExpense, organizationId: ctx.organizationId })
      .returning();
    return expense;
  }

  async deleteExpense(ctx: TenantCtx, id: number): Promise<void> {
    await db.delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.organizationId, ctx.organizationId)));
  }

  // ─── Despesas da loja ───────────────────────────────────────────────────

  async getStoreExpenses(ctx: TenantCtx): Promise<StoreExpense[]> {
    return await db.select().from(storeExpenses)
      .where(eq(storeExpenses.organizationId, ctx.organizationId))
      .orderBy(desc(storeExpenses.date));
  }

  async createStoreExpense(ctx: TenantCtx, insertStoreExpense: InsertStoreExpense): Promise<StoreExpense> {
    const [expense] = await db.insert(storeExpenses)
      .values({ ...insertStoreExpense, organizationId: ctx.organizationId })
      .returning();
    return expense;
  }

  async deleteStoreExpense(ctx: TenantCtx, id: number): Promise<void> {
    await db.delete(storeExpenses)
      .where(and(eq(storeExpenses.id, id), eq(storeExpenses.organizationId, ctx.organizationId)));
  }

  // ─── Imagens de veículos ────────────────────────────────────────────────

  async getVehicleImages(ctx: TenantCtx, vehicleId: number): Promise<VehicleImage[]> {
    return await db.select().from(vehicleImages)
      .where(and(eq(vehicleImages.vehicleId, vehicleId), eq(vehicleImages.organizationId, ctx.organizationId)))
      .orderBy(desc(vehicleImages.createdAt));
  }

  async createVehicleImage(ctx: TenantCtx, vehicleId: number, fileName: string, filePath: string): Promise<VehicleImage> {
    const [image] = await db.insert(vehicleImages)
      .values({ vehicleId, fileName, filePath, organizationId: ctx.organizationId })
      .returning();
    return image;
  }

  async deleteVehicleImage(ctx: TenantCtx, id: number): Promise<VehicleImage | undefined> {
    const [deleted] = await db.delete(vehicleImages)
      .where(and(eq(vehicleImages.id, id), eq(vehicleImages.organizationId, ctx.organizationId)))
      .returning();
    return deleted;
  }

  async deleteAllVehicleImages(ctx: TenantCtx, vehicleId: number): Promise<VehicleImage[]> {
    return await db.delete(vehicleImages)
      .where(and(eq(vehicleImages.vehicleId, vehicleId), eq(vehicleImages.organizationId, ctx.organizationId)))
      .returning();
  }

  // ─── Intermediários ─────────────────────────────────────────────────────

  async getIntermediaries(ctx: TenantCtx): Promise<Intermediary[]> {
    return await db.select().from(intermediaries)
      .where(eq(intermediaries.organizationId, ctx.organizationId))
      .orderBy(desc(intermediaries.createdAt));
  }

  async getIntermediary(ctx: TenantCtx, id: number): Promise<Intermediary | undefined> {
    const [result] = await db.select().from(intermediaries)
      .where(and(eq(intermediaries.id, id), eq(intermediaries.organizationId, ctx.organizationId)));
    return result;
  }

  async createIntermediary(ctx: TenantCtx, data: InsertIntermediary): Promise<Intermediary> {
    const [result] = await db.insert(intermediaries)
      .values({ ...data, organizationId: ctx.organizationId })
      .returning();
    return result;
  }

  async updateIntermediary(ctx: TenantCtx, id: number, data: Partial<InsertIntermediary>): Promise<Intermediary> {
    const [result] = await db.update(intermediaries).set(data)
      .where(and(eq(intermediaries.id, id), eq(intermediaries.organizationId, ctx.organizationId)))
      .returning();
    if (!result) throw new Error("Intermediary not found");
    return result;
  }

  /** Verifica se o intermediário está vinculado a alguma venda. */
  async intermediaryHasVehicles(ctx: TenantCtx, id: number): Promise<boolean> {
    const [row] = await db.select({ id: vehicles.id }).from(vehicles)
      .where(and(eq(vehicles.organizationId, ctx.organizationId), eq(vehicles.intermediaryId, id)))
      .limit(1);
    return !!row;
  }

  async deleteIntermediary(ctx: TenantCtx, id: number): Promise<void> {
    await db.delete(intermediaries)
      .where(and(eq(intermediaries.id, id), eq(intermediaries.organizationId, ctx.organizationId)));
  }

  // ─── Auditoria ──────────────────────────────────────────────────────────

  async getAuditLogs(ctx: TenantCtx): Promise<(AuditLog & { user: User | null })[]> {
    const result = await db.select({
      log: auditLogs,
      user: users,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(eq(auditLogs.organizationId, ctx.organizationId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(200);

    return result.map(({ log, user }) => ({ ...log, user }));
  }

  // ─── Dashboard ──────────────────────────────────────────────────────────

  async getDashboardStats(ctx: TenantCtx) {
    const orgVehicles = eq(vehicles.organizationId, ctx.organizationId);
    const orgExpenses = eq(expenses.organizationId, ctx.organizationId);
    const orgStoreExpenses = eq(storeExpenses.organizationId, ctx.organizationId);

    const currentMonth = getMonthRange(0);
    const previousMonth = getMonthRange(-1);

    // Vendas (receita, custo de aquisição e comissões) em um intervalo
    const soldAgg = (range?: { start: Date; end: Date }) =>
      db.select({
        salesCount: sql<number>`count(*)`,
        revenue: sql<number>`coalesce(sum(${vehicles.salePrice}), 0)`,
        acquisitionCost: sql<number>`coalesce(sum(${vehicles.acquisitionPrice}), 0)`,
        commissions: sql<number>`coalesce(sum(${vehicles.intermediaryCommission}), 0)`,
      }).from(vehicles).where(
        and(
          orgVehicles,
          eq(vehicles.status, "Vendido"),
          ...(range ? [gte(vehicles.saleDate, range.start), lt(vehicles.saleDate, range.end)] : [])
        )
      );

    const expenseAgg = (range?: { start: Date; end: Date }) =>
      db.select({
        total: sql<number>`coalesce(sum(${expenses.amount}), 0)`
      }).from(expenses).where(
        and(orgExpenses, ...(range ? [gte(expenses.date, range.start), lt(expenses.date, range.end)] : []))
      );

    const storeExpenseAgg = (range?: { start: Date; end: Date }) =>
      db.select({
        total: sql<number>`coalesce(sum(${storeExpenses.amount}), 0)`
      }).from(storeExpenses).where(
        and(orgStoreExpenses, ...(range ? [gte(storeExpenses.date, range.start), lt(storeExpenses.date, range.end)] : []))
      );

    // Todas as agregações em paralelo (antes eram 9 queries sequenciais)
    const [
      [counts],
      [allTimeSold],
      [currentMonthData],
      [previousMonthData],
      [vehicleExpenseSum],
      [storeExpenseSum],
      [currentMonthVehicleExp],
      [previousMonthVehicleExp],
      [currentMonthStoreExp],
      [previousMonthStoreExp],
    ] = await Promise.all([
      db.select({
        total: sql<number>`count(*)`,
        available: sql<number>`count(case when ${vehicles.status} = 'Disponível' then 1 end)`,
        sold: sql<number>`count(case when ${vehicles.status} = 'Vendido' then 1 end)`,
      }).from(vehicles).where(orgVehicles),
      soldAgg(),
      soldAgg(currentMonth),
      soldAgg(previousMonth),
      expenseAgg(),
      storeExpenseAgg(),
      expenseAgg(currentMonth),
      expenseAgg(previousMonth),
      storeExpenseAgg(currentMonth),
      storeExpenseAgg(previousMonth),
    ]);

    const totalVehicleExpenses = Number(vehicleExpenseSum?.total || 0);
    const totalStoreExpenses = Number(storeExpenseSum?.total || 0);
    const totalCommissions = Number(allTimeSold?.commissions || 0);
    const currentMonthCommissions = Number(currentMonthData?.commissions || 0);
    const previousMonthCommissions = Number(previousMonthData?.commissions || 0);

    // Lucro das vendas (margem bruta): valor de venda menos valor de compra
    const allTimeRevenue = Number(allTimeSold?.revenue || 0);
    const allTimeAcquisitionCost = Number(allTimeSold?.acquisitionCost || 0);
    const allTimeGrossProfit = allTimeRevenue - allTimeAcquisitionCost;
    const currentMonthAcquisitionCost = Number(currentMonthData?.acquisitionCost || 0);
    const currentMonthGrossProfit = Number(currentMonthData?.revenue || 0) - currentMonthAcquisitionCost;
    const previousMonthAcquisitionCost = Number(previousMonthData?.acquisitionCost || 0);
    const previousMonthGrossProfit = Number(previousMonthData?.revenue || 0) - previousMonthAcquisitionCost;

    // Comissões são custo de venda: entram nas despesas para o lucro ficar correto
    const totalExpenses = totalVehicleExpenses + totalStoreExpenses + totalCommissions;
    const currentMonthExpenses =
      Number(currentMonthVehicleExp?.total || 0) + Number(currentMonthStoreExp?.total || 0) + currentMonthCommissions;
    const previousMonthExpenses =
      Number(previousMonthVehicleExp?.total || 0) + Number(previousMonthStoreExp?.total || 0) + previousMonthCommissions;

    return {
      totalVehicles: Number(counts?.total || 0),
      totalAvailable: Number(counts?.available || 0),
      totalSold: Number(counts?.sold || 0),
      allTimeRevenue,
      allTimeAcquisitionCost,
      allTimeGrossProfit,
      totalExpenses,
      totalVehicleExpenses,
      totalStoreExpenses,
      totalCommissions,
      currentMonthSales: Number(currentMonthData?.salesCount || 0),
      currentMonthRevenue: Number(currentMonthData?.revenue || 0),
      previousMonthSales: Number(previousMonthData?.salesCount || 0),
      previousMonthRevenue: Number(previousMonthData?.revenue || 0),
      currentMonthExpenses,
      previousMonthExpenses,
      currentMonthCommissions,
      previousMonthCommissions,
      currentMonthAcquisitionCost,
      currentMonthGrossProfit,
      previousMonthAcquisitionCost,
      previousMonthGrossProfit,
    };
  }
}

export const storage = new DatabaseStorage();
