import { z } from 'zod';
import { insertPersonSchema, insertVehicleSchema, insertExpenseSchema, insertStoreExpenseSchema, insertIntermediarySchema, people, vehicles, expenses, storeExpenses, intermediaries } from './schema';

export type { Person, Vehicle, Expense, StoreExpense, InsertPerson, InsertVehicle, InsertExpense, InsertStoreExpense, VehicleWithDetails, Intermediary, InsertIntermediary } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  people: {
    list: {
      method: 'GET' as const,
      path: '/api/people',
      input: z.object({
        type: z.string().optional(),
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof people.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/people',
      input: insertPersonSchema,
      responses: {
        201: z.custom<typeof people.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/people/:id',
      responses: {
        200: z.custom<typeof people.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/people/:id',
      input: insertPersonSchema.partial(),
      responses: {
        200: z.custom<typeof people.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/people/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  vehicles: {
    list: {
      method: 'GET' as const,
      path: '/api/vehicles',
      input: z.object({
        status: z.string().optional(),
        ownerId: z.coerce.number().optional(),
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof vehicles.$inferSelect & { owner: typeof people.$inferSelect }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/vehicles/:id',
      responses: {
        200: z.custom<typeof vehicles.$inferSelect & { owner: typeof people.$inferSelect, expenses: typeof expenses.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/vehicles',
      input: insertVehicleSchema,
      responses: {
        201: z.custom<typeof vehicles.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/vehicles/:id',
      input: insertVehicleSchema.partial(),
      responses: {
        200: z.custom<typeof vehicles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/vehicles/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  expenses: {
    listByVehicle: {
      method: 'GET' as const,
      path: '/api/vehicles/:vehicleId/expenses',
      responses: {
        200: z.array(z.custom<typeof expenses.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/expenses',
      input: insertExpenseSchema,
      responses: {
        201: z.custom<typeof expenses.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/expenses/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  dashboard: {
    get: {
      method: 'GET' as const,
      path: '/api/dashboard/stats',
      responses: {
        200: z.object({
          totalVehicles: z.number(),
          totalAvailable: z.number(),
          totalSold: z.number(),
          totalExpenses: z.number(),
          totalVehicleExpenses: z.number(),
          totalStoreExpenses: z.number(),
          currentMonthSales: z.number(),
          currentMonthRevenue: z.number(),
          previousMonthSales: z.number(),
          previousMonthRevenue: z.number(),
          currentMonthExpenses: z.number(),
          previousMonthExpenses: z.number(),
        }),
      },
    },
  },
  sales: {
    markAsSold: {
      method: 'POST' as const,
      path: '/api/vehicles/:id/sell',
      input: z.object({
        salePrice: z.number(),
        buyerId: z.number().nullable().optional(),
        saleDate: z.string().optional(),
        saleMileage: z.number().nullable().optional(),
        tradeInVehicle: z.object({
          plate: z.string(),
          brand: z.string(),
          model: z.string(),
          color: z.string(),
          yearFab: z.number().nullable().optional(),
          yearModel: z.number().nullable().optional(),
          condition: z.string().nullable().optional(),
          mileage: z.number().nullable().optional(),
          acquisitionPrice: z.number().nullable().optional(),
          price: z.number().nullable().optional(),
          fipeCode: z.string().nullable().optional(),
          fipePrice: z.string().nullable().optional(),
          ownerId: z.number().nullable().optional(),
          notes: z.string().nullable().optional(),
        }).nullable().optional(),
        tradeInValue: z.number().nullable().optional(),
        intermediaryId: z.number().nullable().optional(),
        intermediaryCommission: z.number().nullable().optional(),
      }),
      responses: {
        200: z.custom<typeof vehicles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  storeExpenses: {
    list: {
      method: 'GET' as const,
      path: '/api/store-expenses',
      responses: {
        200: z.array(z.custom<typeof storeExpenses.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/store-expenses',
      input: insertStoreExpenseSchema,
      responses: {
        201: z.custom<typeof storeExpenses.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/store-expenses/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  intermediaries: {
    list: {
      method: 'GET' as const,
      path: '/api/intermediaries',
      responses: {
        200: z.array(z.custom<typeof intermediaries.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/intermediaries',
      input: insertIntermediarySchema,
      responses: {
        201: z.custom<typeof intermediaries.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/intermediaries/:id',
      responses: {
        200: z.custom<typeof intermediaries.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/intermediaries/:id',
      input: insertIntermediarySchema.partial(),
      responses: {
        200: z.custom<typeof intermediaries.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/intermediaries/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
