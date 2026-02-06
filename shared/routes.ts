import { z } from 'zod';
import { insertPersonSchema, insertVehicleSchema, insertExpenseSchema, insertStoreExpenseSchema, people, vehicles, expenses, storeExpenses } from './schema';

export type { Person, Vehicle, Expense, StoreExpense, InsertPerson, InsertVehicle, InsertExpense, InsertStoreExpense, VehicleWithDetails } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
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

// ============================================
// API CONTRACT
// ============================================
export const api = {
  people: {
    list: {
      method: 'GET' as const,
      path: '/api/people',
      input: z.object({
        type: z.string().optional(), // Filter by 'Proprietário' or 'Cliente'
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
