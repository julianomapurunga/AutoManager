# AutoManager - Sistema de Controle de Pátio de Veículos

## Overview
Sistema para controle completo de veículos em pátio de loja, incluindo cadastro de veículos, proprietários, clientes e controle financeiro de despesas. Baseado em planilha física de controle de carros.

## Recent Changes
- 2026-02-13: Version control system: shared/version.ts with APP_VERSION constant and CHANGELOG array
- 2026-02-13: Changelog page (/changelog) with visual history of all versions, accessible to Admin/Gerente
- 2026-02-13: Version displayed in Sidebar footer and Landing Page footer
- 2026-02-13: "Changelog" navigation item added to sidebar (Admin/Gerente only)
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
- 2026-02-06: Replaced Replit Auth with custom session-based auth (bcryptjs + express-session)
- 2026-02-06: Created users table with username, password, phone, cpf, gender, role fields
- 2026-02-06: User roles: Administrador (full access), Vendedor (no settings access)
- 2026-02-06: Permission system: isAdmin middleware, frontend AdminRoute guard, sidebar filtering
- 2026-02-06: Settings page (/settings): user management with CRUD, role assignment, admin-only access
- 2026-02-06: Self-registration defaults to Vendedor role (only admins can assign roles)
- 2026-02-06: Created Login and Register pages with form validation
- 2026-02-06: Added CPF/phone formatting masks on registration form
- 2026-02-06: Vehicle image attachments: upload multiple, gallery view, delete one/all, fullscreen preview
- 2026-02-06: vehicleImages table (id, vehicleId FK cascade, fileName, filePath, createdAt)
- 2026-02-06: Image upload via multer with 10MB limit, jpg/png/gif/webp filter
- 2026-02-06: Vehicle owner (ownerId) made optional - can register vehicles without owner
- 2026-02-06: CPF-based person lookup: type CPF to auto-search, register new person via dialog
- 2026-02-06: VehicleForm and SellVehicleDialog use CPF lookup instead of select dropdowns
- 2026-02-06: Added /api/people/search-by-document endpoint for CPF-based search
- 2026-02-06: Split vehicle year into yearFab (fabricação) and yearModel (modelo) fields
- 2026-02-06: Added R$ currency mask with proper decimal formatting on vehicle price input
- 2026-02-06: Display format: yearFab/yearModel (e.g. 2024/2025) across all pages
- 2026-02-06: FIPE consultation page (/fipe) with cascading selects (type, brand, model, year)
- 2026-02-06: Backend proxy for FIPE API (fipe.parallelum.com.br/api/v2) with vehicleType validation
- 2026-02-06: Added "FIPE" navigation item to sidebar
- 2026-02-06: Added fipeCode and fipePrice fields to vehicles table for FIPE data storage
- 2026-02-06: VehicleForm has collapsible FIPE lookup section with cascading selects that auto-fill brand, model, yearModel, fipeCode, fipePrice
- 2026-02-06: Dashboard vehicle cards show FIPE price discretely when available
- 2026-02-06: VehicleDetails page shows FIPE price and code below asking price
- 2026-02-09: FIPE consultation page shows price history (last 5 years) with line chart, stats cards, and monthly table
- 2026-02-09: Backend proxy endpoint for FIPE history API (/api/fipe/:vehicleType/:fipeCode/years/:yearId/history)
- 2026-02-09: Dashboard cards separated: vehicle expenses (maintenance) and store expenses (operational)
- 2026-02-09: User profile page (/profile) with name editing and profile photo upload
- 2026-02-09: Profile image upload via multer (5MB, jpg/png/gif/webp), stored in uploads/profiles/
- 2026-02-09: Sidebar user section links to profile page, shows profile photo when available

## Project Architecture

### Tech Stack
- **Frontend:** React + TypeScript, Vite, Tailwind CSS, Shadcn/ui, Wouter (routing), TanStack Query
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL (Neon) with Drizzle ORM
- **Auth:** Custom session-based auth (bcryptjs + express-session + connect-pg-simple)

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
  replit_integrations/auth/  # Custom auth module (session-based login/register)

client/src/
  App.tsx             # Main app with auth-gated routing
  pages/
    LoginPage.tsx     # Login page
    RegisterPage.tsx  # Registration page with all user fields
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
- **vehicles:** Vehicle records (plate, brand, model, color, yearFab, yearModel, price, salePrice, saleDate, buyerId, status, ownerId, entryDate, fipeCode, fipePrice)
- **expenses:** Expenses per vehicle (description, amount, vehicleId)
- **storeExpenses:** Store operational expenses (description, category, amount, date)
- **users:** System users (id serial, username, password hash, firstName, lastName, phone, cpf, gender, role)
- **sessions:** Session storage (express-session + connect-pg-simple)

### Key Enums
- Vehicle brands: Toyota, Honda, Ford, Chevrolet, Volkswagen, Fiat, Hyundai, Renault, Nissan, Jeep, Outra
- Vehicle status: Disponível, Vendido, Em Manutenção, Aguardando Preparação, Reservado
- Person types: Proprietário, Cliente
- Store expense categories: Aluguel, Internet, Água, Energia, Produto de Limpeza, Material de Escritório, Telefone, Seguro, Impostos, Salários, Outros
- User roles: Administrador, Vendedor
- Permissions: Administrador (full access), Vendedor (all except /settings)

### API Routes (all require authentication)
- `GET/POST /api/users` - List/Create users (admin only)
- `PUT/DELETE /api/users/:id` - Update/Delete users (admin only)
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
- Login/Register pages shown for unauthenticated users
- Register via `POST /api/register` (username, password, firstName, lastName, phone, cpf, gender, role)
- Login via `POST /api/login` (username + password, bcrypt verification)
- Logout via `POST /api/logout` (session destroy)
- Session stored in PostgreSQL via connect-pg-simple
- User info + role badge displayed in sidebar

## User Preferences
- Language: Portuguese (pt-BR)
- Currency: BRL (R$)

## Fluxo de Release e Versão

### Script de versão e changelog

- O controle de versão da aplicação fica em `shared/version.ts`, com:
  - `APP_VERSION`: versão atual exibida no sidebar e na landing page.
  - `CHANGELOG`: array com o histórico de versões, datas e mudanças.
- Para atualizar esses valores de forma automática existe o script:
  - `scripts/bumpVersion.ts` (TypeScript), exposto via:
    - `npm run release`

### Como criar uma nova versão

1. Certifique-se de que o código está atualizado:
   - `git pull`
2. Rode o script de release em **modo normal** (não dry-run), informando:
   - nova versão (`MAJOR.MINOR.PATCH`),
   - título curto do release,
   - arquivo de notas com bullets das mudanças (opcional, mas recomendado).

   Exemplo:

   ```bash
   npm run release -- 1.1.0 "Melhorias em FIPE e Dashboard" notas-1.1.0.md
   ```

   - O script irá:
     - atualizar `APP_VERSION` para `1.1.0`;
     - inserir um novo objeto no topo do array `CHANGELOG` com:
       - `version`, `date` (data atual), `title`, `changes` (linhas do arquivo de notas).

3. Revise o arquivo `shared/version.ts`:
   - Confira se a `APP_VERSION` está correta.
   - Confira se a nova entrada do `CHANGELOG` está formatada como esperado.
4. Faça o commit das alterações de versão:

   ```bash
   git add shared/version.ts
   git commit -m "chore: bump versão para 1.1.0"
   ```

5. Crie uma tag Git correspondente (opcional, mas recomendado):

   ```bash
   git tag v1.1.0
   git push origin main --tags
   ```

### Modo dry-run (pré-visualização)

- Para testar o script **sem gravar** alterações em disco, use a flag `--dry-run`:

  ```bash
  npm run release -- 1.1.0 "Teste de Release" notas-1.1.0.md --dry-run
  ```

- O script vai mostrar no console:
  - a nova linha de `APP_VERSION`;
  - o início do bloco `CHANGELOG` com a nova entrada;
  - e não irá salvar nada no arquivo.

### Integração com Git (fluxo sugerido)

- Fluxo recomendado (pré-tag):
  1. Rodar `npm run release` para atualizar `shared/version.ts`.
  2. Comitar as alterações de versão.
  3. Criar a tag Git `vX.Y.Z` a partir desse commit.
- Opcionalmente, você pode criar um hook de Git local (por exemplo, `pre-push` ou `pre-tag`) que:
  - verifica se `APP_VERSION` em `shared/version.ts` bate com a versão da tag que está sendo criada;
  - aborta o push/tag se estiver inconsistente.

