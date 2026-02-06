# AutoManager - Sistema de Controle de Pátio de Veículos

## Overview
Sistema para controle completo de veículos em pátio de loja, incluindo cadastro de veículos, proprietários, clientes e controle financeiro de despesas. Baseado em planilha física de controle de carros.

## Recent Changes
- 2026-02-06: Initial system creation with vehicles, people, expenses CRUD
- 2026-02-06: Added Replit Auth integration for user authentication
- 2026-02-06: Created landing page for unauthenticated users
- 2026-02-06: Protected all API routes with isAuthenticated middleware
- 2026-02-06: Added salePrice, saleDate, buyerId to vehicles schema for sales tracking
- 2026-02-06: Created mark-as-sold workflow (SellVehicleDialog with price, date, buyer)
- 2026-02-06: Redesigned Dashboard with available vehicle cards, monthly stats, financial summary
- 2026-02-06: Created Financial Report page (/financial) with monthly revenue/expense/profit
- 2026-02-06: Added vehicle search (plate, model, brand, color) via ilike backend filtering
- 2026-02-06: Added POST /api/vehicles/:id/sell endpoint for marking vehicles as sold
- 2026-02-06: Vehicle status workflow: new vehicles default to "Aguardando Preparação", status changeable via dropdown
- 2026-02-06: Backend enforcement: "Vendido" status only settable via sell endpoint (PUT rejects status=Vendido)
- 2026-02-06: Store expenses system: storeExpenses table with 11 categories (Aluguel, Internet, Água, etc.)
- 2026-02-06: Store expenses page (/store-expenses) with CRUD, category filtering, search
- 2026-02-06: Store expenses integrated into dashboard stats and financial reports
- 2026-02-06: Added "Despesas da Loja" navigation item to sidebar

## Project Architecture

### Tech Stack
- **Frontend:** React + TypeScript, Vite, Tailwind CSS, Shadcn/ui, Wouter (routing), TanStack Query
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL (Neon) with Drizzle ORM
- **Auth:** Replit Auth (OpenID Connect)

### Directory Structure
```
shared/
  schema.ts          # Drizzle table definitions + types (people, vehicles, expenses)
  routes.ts          # API contract with Zod schemas
  models/auth.ts     # Auth-related tables (users, sessions)

server/
  index.ts           # Express app setup
  routes.ts          # API route handlers + seed data
  storage.ts         # DatabaseStorage class (CRUD operations)
  db.ts              # Database connection pool
  replit_integrations/auth/  # Replit Auth module (do not modify)

client/src/
  App.tsx             # Main app with auth-gated routing
  pages/
    LandingPage.tsx   # Public landing page
    Dashboard.tsx     # Stats overview
    Vehicles.tsx      # Vehicle list
    VehicleDetails.tsx # Vehicle details + expenses
    People.tsx        # People management (owners + clients)
    StoreExpenses.tsx # Store operational expenses
    Financial.tsx     # Financial reports (revenue, expenses, profit)
  components/
    layout/Sidebar.tsx   # Navigation sidebar with user info
    forms/               # PersonForm, VehicleForm, SellVehicleDialog
    ui/                  # Shadcn components
  hooks/
    use-auth.ts          # Auth state hook
    use-vehicles.ts      # Vehicle CRUD hooks
    use-people.ts        # People CRUD hooks
    use-expenses.ts      # Expense CRUD hooks
    use-store-expenses.ts # Store expense CRUD hooks
    use-dashboard.ts     # Dashboard stats hook
```

### Database Tables
- **people:** Owners and clients (name, phone, email, document, type)
- **vehicles:** Vehicle records (plate, brand, model, color, year, price, salePrice, saleDate, buyerId, status, ownerId, entryDate)
- **expenses:** Expenses per vehicle (description, amount, vehicleId)
- **storeExpenses:** Store operational expenses (description, category, amount, date)
- **users:** Auth users (managed by Replit Auth)
- **sessions:** Session storage (managed by Replit Auth)

### Key Enums
- Vehicle brands: Toyota, Honda, Ford, Chevrolet, Volkswagen, Fiat, Hyundai, Renault, Nissan, Jeep, Outra
- Vehicle status: Disponível, Vendido, Em Manutenção, Aguardando Preparação, Reservado
- Person types: Proprietário, Cliente
- Store expense categories: Aluguel, Internet, Água, Energia, Produto de Limpeza, Material de Escritório, Telefone, Seguro, Impostos, Salários, Outros

### API Routes (all require authentication)
- `GET/POST /api/people` - List/Create people
- `GET/PUT/DELETE /api/people/:id` - Get/Update/Delete person
- `GET /api/vehicles` - List vehicles (query: ?status=&search=&ownerId=)
- `POST /api/vehicles` - Create vehicle
- `GET/PUT/DELETE /api/vehicles/:id` - Get/Update/Delete vehicle (PUT rejects status=Vendido)
- `POST /api/vehicles/:id/sell` - Mark vehicle as sold (body: salePrice, buyerId, saleDate)
- `GET /api/vehicles/:vehicleId/expenses` - List expenses for vehicle
- `POST /api/expenses` - Create expense
- `DELETE /api/expenses/:id` - Delete expense
- `GET/POST /api/store-expenses` - List/Create store expenses
- `DELETE /api/store-expenses/:id` - Delete store expense
- `GET /api/dashboard/stats` - Dashboard statistics (monthly breakdowns, includes store expenses)

### Money Values
All monetary values stored in cents (integer). Divide by 100 for display, format as BRL (R$).

### Auth Flow
- Landing page shown for unauthenticated users
- Login via `/api/login` (Replit Auth OIDC)
- Logout via `/api/logout`
- User info displayed in sidebar

## User Preferences
- Language: Portuguese (pt-BR)
- Currency: BRL (R$)
