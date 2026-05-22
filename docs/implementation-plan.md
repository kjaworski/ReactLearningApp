# Implementation Plan: Personal & Household Finance Manager — MVP (Phase 1)

## TL;DR

Build the MVP in 7 phases, backend-first (familiar territory as .NET dev), then frontend. Start with monorepo scaffolding → Prisma schema → NestJS modules (identity → transaction → reporting) → Next.js frontend → polish. Each phase is independently verifiable.

---

## Phase A: Project Scaffolding (~foundation for everything)

> Set up the monorepo, tooling, Docker, and basic project structure. Everything depends on this.

**Steps:**

1. ~~**Initialize pnpm monorepo** — create root `package.json`, `pnpm-workspace.yaml`, `turbo.json`. Workspace structure: `apps/web`, `apps/api`, `packages/shared`~~ ✅
2. ~~**Scaffold NestJS backend** (`apps/api`) — `nest new` with TypeScript strict mode, remove boilerplate, set up module structure per tech-stack.md~~ ✅
3. ~~**Scaffold Next.js frontend** (`apps/web`) — `create-next-app` with App Router, TypeScript, Tailwind CSS, ESLint~~ ✅
4. ~~**Set up shared types package** (`packages/shared`) — `package.json`, `tsconfig.json`, export barrel file. Add `TransactionType` enum and basic DTOs as first shared types~~ ✅
5. ~~**Docker Compose** — PostgreSQL 16 container for local dev (port 5432), volume for data persistence. Optional: pgAdmin container~~ ✅
6. ~~**Prisma setup** (`apps/api/prisma/`) — install Prisma, create initial `schema.prisma` with datasource config, generate client~~ ✅
7. ~~**ESLint + Prettier** — shared config at root, workspace-specific overrides~~ ✅
8. ~~**Husky + lint-staged** — pre-commit hook for linting + formatting~~ ✅
9. ~~**Environment config** — `.env.example` with DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET, NEXTAUTH_URL~~ ✅
10. ~~**Turborepo pipelines** — configure `turbo.json` for `build`, `dev`, `lint`, `test` tasks with correct dependency graph~~ ✅

> **Phase A completed** — all 10 steps done and verified. Commits `d902130` through `3d2a049`.

**Verification:**

- `pnpm install` succeeds
- `turbo dev` starts both Next.js (port 3000) and NestJS (port 3001) concurrently
- `docker compose up -d` starts PostgreSQL, NestJS connects to it
- `packages/shared` types are importable from both `apps/web` and `apps/api`
- `turbo lint` passes on all workspaces

**Relevant files:**

- Root: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.eslintrc.js`, `.prettierrc`, `docker-compose.yml`, `.env.example`
- `apps/api/`: `nest-cli.json`, `tsconfig.json`, `src/main.ts`, `src/app.module.ts`
- `apps/web/`: `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `app/layout.tsx`
- `packages/shared/`: `package.json`, `tsconfig.json`, `src/index.ts`

---

## Phase B: Database Schema (Prisma) — _depends on Phase A_

> Translate the DDD domain model (ddd-analysis.md section 5.2) into a Prisma schema. MVP-only tables — don't create Phase 2-4 tables yet.

**Steps:**

1. **Identity & Access models** — `User`, `Household`, `UserHousehold` (junction table for multi-household readiness per HS-2), `Invitation`
   - User: id, email, displayName, passwordHash (nullable — Google users won't have one), googleId (nullable), createdAt
   - Household: id, name, mainCurrency (default "PLN"), createdAt
   - UserHousehold: userId, householdId, joinedAt (composite PK)
   - Invitation: id, householdId, inviterUserId, inviteeEmail, token (unique), status (PENDING/ACCEPTED/EXPIRED/REVOKED), expiresAt, createdAt

2. **Transaction Management models** — `Account`, `Category`, `Transaction`, `TransactionSplit`
   - Account: id, householdId, name, currency, initialBalance, isActive (soft deactivate), isDefault, createdAt
   - Category: id, householdId, name, icon (nullable), color (nullable), type (EXPENSE/INCOME), sortOrder, createdAt
   - Transaction: id, householdId, accountId, userId, categoryId, type (INCOME/EXPENSE), amount (Decimal), currency, date, comment (nullable), createdAt, updatedAt
   - TransactionSplit: id, transactionId, categoryId, amount (Decimal), createdAt

3. **Indexes and constraints** — householdId on all household-scoped tables (for query performance and row-level scoping), unique constraints (User.email, Invitation.token), cascade deletes where appropriate

4. **Seed script** — `prisma/seed.ts` with the 23 default categories (18 expense + 5 income from HS-1)

5. **Run first migration** — `prisma migrate dev --name init`

**Verification:**

- `npx prisma migrate dev` runs without errors
- `npx prisma studio` opens and shows all tables with correct columns and relationships
- `npx prisma db seed` populates default categories
- Generated Prisma Client types match the domain model from ddd-analysis.md section 5.2

**Relevant files:**

- `apps/api/prisma/schema.prisma` — all model definitions
- `apps/api/prisma/seed.ts` — default categories
- `apps/api/prisma/migrations/` — generated migration files

**Key decisions baked in:**

- `user_households` junction table from day 1 (HS-2)
- Amount stored as `Decimal` (not Float) for financial precision
- `householdId` on every household-scoped table for explicit scoping
- Invitation expiry: 7 days (HS-4)
- TransactionType as enum (HS-5)
- Category has `type` field (EXPENSE/INCOME) to separate the two lists

---

## Phase C: Backend — Identity & Access Module — _depends on Phase B_

> Build UC-6 (Register & Login), UC-16 (Invite Member), household creation, default categories/account seeding. This is the auth foundation everything else depends on.

**Steps:**

1. **NestJS common infrastructure** — before any module:
   - `PrismaModule` (global) — wraps PrismaClient, handles connection lifecycle
   - `JwtAuthGuard` — validates JWT, extracts userId + householdId from token claims
   - `@CurrentUser()` decorator — injects authenticated user into controller methods (like .NET's `User.Identity`)
   - `HouseholdGuard` — ensures the requested householdId matches the user's household
   - Global exception filter — maps Prisma errors (not found, unique constraint) to proper HTTP responses
   - Global validation pipe — auto-validates DTOs via class-validator
   - Swagger setup — `@nestjs/swagger` with bearer auth, API groups by module
   - Pino logger setup

2. **Identity module** — `modules/identity/`
   - **Registration flow** (UC-6 steps 1-6):
     - `POST /auth/register` — email + password. Hash password with bcrypt. Create User + Household + UserHousehold + default Account + default Categories
     - `POST /auth/google` — Google OAuth callback. Create or find user, same household logic
     - On household creation: seed 23 default categories + "Gotówka" account (per UC-6, HS-1)
   - **Login flow** (UC-6 step 2-3):
     - `POST /auth/login` — validate credentials, return JWT (access + refresh tokens)
     - JWT payload: `{ userId, householdId, email }`
   - **Invitation flow** (UC-16):
     - `POST /households/:id/invitations` — create invitation, send email (mock email service for now)
     - `POST /invitations/:token/accept` — accept invitation, create user if new, add to household
     - `DELETE /invitations/:id` — revoke invitation
     - `POST /invitations/:id/resend` — invalidate old token, create new one
     - Cron job: expire invitations older than 7 days
   - **Household endpoints**:
     - `GET /households/:id` — get household details + member list
     - `PATCH /households/:id` — update name, main currency
   - **User profile**:
     - `GET /users/me` — current user profile
     - `PATCH /users/me` — update display name

3. **NextAuth.js integration** (frontend side of auth):
   - Configure NextAuth.js in `apps/web` with credentials provider + Google provider
   - NextAuth.js calls NestJS `/auth/login` and `/auth/google` endpoints
   - Store JWT in session, pass to API calls via Authorization header
   - Auth middleware in Next.js to protect routes

**Verification:**

- Register a user via Swagger → user + household + categories + account created in DB
- Login → receive valid JWT → use it to call protected endpoints
- Invite flow: create invitation → accept → new user in household
- `GET /households/:id` returns member list
- Expired invitations are auto-cleaned
- Invalid/expired JWT → 401
- Wrong householdId → 403

**Relevant files:**

- `apps/api/src/modules/identity/` — identity.module.ts, controllers/, commands/, queries/, dto/
- `apps/api/src/common/` — guards/, decorators/, filters/, pipes/
- `apps/api/src/prisma/` — prisma.module.ts, prisma.service.ts
- `apps/web/app/api/auth/[...nextauth]/route.ts` — NextAuth.js config
- `apps/web/middleware.ts` — route protection

---

## Phase D: Backend — Transaction Management Module — _depends on Phase C_

> Build UC-1 (Add Transaction), UC-3 (Split), UC-4 (Filter & Browse), UC-5 (Manage Categories), UC-17 (Manage Accounts). This is the core of the app.

**Steps:**

1. **Category endpoints** (UC-5) — build first because transactions reference categories:
   - `GET /households/:id/categories` — list all (ordered by sortOrder)
   - `POST /households/:id/categories` — create (name, icon, color, type)
   - `PATCH /categories/:id` — rename, update icon/color
   - `DELETE /categories/:id` — reject if transactions exist (HS-34)
   - `PUT /households/:id/categories/reorder` — update sortOrder for all categories

2. **Account endpoints** (UC-17):
   - `GET /households/:id/accounts` — list all active accounts
   - `POST /households/:id/accounts` — add account (name, currency, initialBalance)
   - `PATCH /accounts/:id` — rename
   - `PATCH /accounts/:id/deactivate` — soft deactivate

3. **Transaction endpoints** (UC-1, UC-3):
   - `POST /households/:id/transactions` — record transaction (type, date, amount, accountId, categoryId, userId, comment). CQRS: `RecordTransactionCommand` → `TransactionRecordedEvent`
   - `PATCH /transactions/:id` — update transaction fields
   - `DELETE /transactions/:id` — delete transaction
   - `POST /transactions/:id/split` — split into categories. Validate: sum of splits == total (invariant). `SplitTransactionCommand` → `TransactionSplitEvent`
   - `POST /transactions/:id/unsplit` — remove all splits, assign to single category (HS-8). `UnsplitTransactionCommand` → `TransactionUnsplitEvent`

4. **Transaction query endpoints** (UC-4):
   - `GET /households/:id/transactions` — filtered list with cursor-based pagination. Filters: dateFrom, dateTo (default: current month per HS-9), userId, categoryId, accountId, amountMin, amountMax, type. Returns paginated results
   - `GET /households/:id/transactions/summary` — returns three totals for the filtered set: totalIncome, totalExpenses, net (HS-11)

5. **CQRS event handlers** — `TransactionRecordedEvent` handler updates any read models (for MVP this is a no-op since we calculate on the fly per HS-14, but the event infrastructure should exist)

**Verification:**

- Create categories → list them → reorder → rename → delete (reject if used)
- Create accounts → list → rename → deactivate (still shows in historical txns)
- Record income + expense transactions → appear in list
- Split a transaction → verify split amounts sum to total → verify per-category totals update
- Unsplit → reverts to single category
- Filter by current month (default), by category, by user, by amount range
- Summary endpoint returns correct income/expense/net totals
- Cursor pagination works (next page token)
- All endpoints require auth + correct householdId

**Relevant files:**

- `apps/api/src/modules/transaction/` — full module structure (controllers, commands, queries, events, dto, entities)
- `packages/shared/src/` — TransactionType enum, CreateTransactionDto, FilterTransactionsDto, TransactionSummaryDto

---

## Phase E: Backend — Reporting Module — _depends on Phase D_

> Build UC-11 (Dashboard), UC-7 (Reports), PDF/CSV export. Read-only module that queries transaction data.

**Steps:**

1. **Dashboard endpoint** (UC-11):
   - `GET /households/:id/dashboard?month=2026-05` — returns composite data:
     - `expensesByCategory`: array of { categoryName, total, percentage } for pie chart
     - `totalIncome`, `totalExpenses`, `balance` (income - expenses)
     - `accountSummaries`: array of { accountName, currency, balance }
   - Default month: current month (HS-12). Calculated on the fly (HS-14)

2. **Report endpoints** (UC-7):
   - `GET /households/:id/reports/monthly?month=2026-05` — all transactions grouped by category with totals
   - `GET /households/:id/reports/category-summary?from=2026-01&to=2026-05` — spending per category over period

3. **Export endpoints** (UC-7, HS-15):
   - `GET /households/:id/reports/monthly/export?month=2026-05&format=csv` — CSV download
   - `GET /households/:id/reports/monthly/export?month=2026-05&format=pdf` — PDF download (server-side generation with pdfkit or similar)

**Verification:**

- Dashboard returns correct totals matching manual calculation
- Add a transaction → dashboard totals update (real-time per HS-13 — verify by re-fetching)
- Monthly report groups transactions correctly by category
- CSV export is valid, opens in Excel
- PDF export renders cleanly

**Relevant files:**

- `apps/api/src/modules/reporting/` — reporting.module.ts, controllers/, queries/, services/

---

## Phase F: Frontend — Next.js Pages — _depends on Phases C-E (backend APIs ready)_

> Build all MVP screens. Backend-first approach means you have working APIs to build against.

**Steps:**

1. **Layout & navigation** (_parallel with step 2_):
   - Root layout with sidebar navigation (Dashboard, Transactions, Categories, Accounts, Reports, Settings)
   - Mobile-first responsive: sidebar collapses to bottom tab bar on mobile
   - Dark/light mode toggle in header (Req 13) — use next-themes + Tailwind dark mode
   - shadcn/ui: install base components (Button, Input, Select, Dialog, Sheet, Table, Card, DropdownMenu, Toast)

2. **Auth pages** (_parallel with step 1_):
   - `/login` — email + password form, Google OAuth button
   - `/register` — registration form with default categories selection UI (HS-1: show list, user can toggle off categories they don't want)
   - NextAuth.js session provider wrapping the app
   - TanStack Query provider setup with auth token injection
   - Redirect logic: unauthenticated → /login, authenticated → /dashboard

3. **Dashboard page** (`/dashboard`) — UC-11:
   - Month selector (defaults to current month, any month selectable per HS-12)
   - Pie chart of expenses by category (Recharts `PieChart`)
   - Summary cards: Total Income, Total Expenses, Balance
   - Account balances list
   - Auto-refetch on TanStack Query cache invalidation (HS-13)

4. **Transaction list page** (`/transactions`) — UC-4:
   - Filter bar: date range (default current month per HS-9), category, account, user, type, amount range
   - Transaction table with virtual scroll (TanStack Virtual per HS-10)
   - Sticky summary footer: Total Income | Total Expenses | Net (HS-11)
   - "Add Transaction" button → opens form dialog/sheet
   - Click on transaction → detail view with split/unsplit actions

5. **Add/Edit transaction** (`/transactions` dialog) — UC-1, UC-3:
   - Form: type toggle (Income/Expense), date picker (defaults today, any past date per HS-6), amount input, account select, category select, user select, comment textarea
   - React Hook Form + Zod validation (shared schema from packages/shared)
   - Split UI: "Split" button → add category+amount rows, running total vs transaction total, validation that splits sum equals total
   - Unsplit action: confirm dialog → revert to single category (HS-8)

6. **Category management page** (`/categories`) — UC-5:
   - List of categories grouped by type (Expense | Income)
   - Drag-and-drop reorder (or up/down buttons)
   - Inline rename, color/icon picker
   - Delete with confirmation (shows error if transactions exist per HS-34)
   - "Add Category" button

7. **Account management page** (`/accounts`) — UC-17:
   - List of accounts with currency and balance
   - Add account form (name, currency, initial balance)
   - Rename inline
   - Deactivate with confirmation

8. **Reports page** (`/reports`) — UC-7:
   - Report type selector (Monthly Statement, Category Summary)
   - Period selector
   - Rendered report (table + charts)
   - Export buttons: "Download PDF" and "Download CSV" (HS-15)

9. **Settings page** (`/settings`) — UC-16, household management:
   - Household info (name, main currency)
   - Member list
   - Invite member form (email input, send invitation)
   - Pending invitations list with resend/revoke actions

**Verification:**

- Complete user journey: register → see dashboard → add transactions → view filtered list → split a transaction → view reports → export PDF
- Mobile viewport: all pages are usable on 375px width
- Dark mode: toggle works, all pages render correctly
- Auth: unauthenticated access redirects to login
- Invite flow: invite → accept (in another browser/incognito) → new user sees shared data

**Relevant files:**

- `apps/web/app/(auth)/login/page.tsx`, `register/page.tsx`
- `apps/web/app/(dashboard)/layout.tsx` — authenticated layout with sidebar
- `apps/web/app/(dashboard)/dashboard/page.tsx`
- `apps/web/app/(dashboard)/transactions/page.tsx`
- `apps/web/app/(dashboard)/categories/page.tsx`
- `apps/web/app/(dashboard)/accounts/page.tsx`
- `apps/web/app/(dashboard)/reports/page.tsx`
- `apps/web/app/(dashboard)/settings/page.tsx`
- `apps/web/components/` — reusable components (TransactionForm, FilterBar, PieChart, etc.)
- `apps/web/lib/api.ts` — TanStack Query hooks for API calls

---

## Phase G: Testing & Polish — _depends on Phase F_

> Final quality pass. Tests, responsiveness, edge cases, performance.

**Steps:**

1. **Backend unit tests** (Jest):
   - Transaction invariant: split amounts must equal total
   - Category deletion rejection when transactions exist
   - Invitation expiry logic
   - Filter query builder (date range, cursor pagination)
   - Auth guard (valid/invalid/expired JWT)

2. **Backend integration tests** (Jest + test database):
   - Full registration flow → categories + account created
   - Transaction CRUD → verify database state
   - Invitation accept flow → user joins household

3. **E2E tests** (Playwright):
   - Register → login → add transaction → view in list → view on dashboard
   - Split transaction → verify totals
   - Invite member → accept → both users see shared data
   - Mobile viewport test (375px)
   - Dark mode toggle

4. **Performance check**:
   - Virtual scroll with 500+ transactions renders smoothly
   - Dashboard loads under 1 second with 1000 transactions

5. **Security review**:
   - All endpoints require authentication
   - HouseholdId scoping prevents cross-household data access
   - SQL injection prevented by Prisma parameterized queries
   - XSS prevented by React's default escaping
   - CSRF handled by NextAuth.js

6. **Final polish**:
   - Loading states (skeleton screens) for all data-fetching pages
   - Error states (toast notifications for failures)
   - Empty states ("No transactions yet — add your first one")
   - Form validation error messages (user-friendly, in Polish where appropriate)

**Verification:**

- `turbo test` — all unit + integration tests pass
- `npx playwright test` — all E2E scenarios pass
- Lighthouse score > 90 for performance on dashboard page
- No console errors in browser during full user journey

---

## Decisions & Scope

**In scope (MVP):**

- Registration, login (email + Google), invitations
- Manual transaction entry (Income/Expense), split/unsplit
- Categories (18+5 defaults, CRUD, reorder)
- Accounts (default + manual, rename, deactivate)
- Transaction list with filters, virtual scroll, summary footer
- Dashboard with pie chart + summary cards
- Basic reports (monthly, category) with PDF/CSV export
- Dark/light mode, mobile-first responsive
- Household-scoped data with multi-household-ready data model

**Explicitly excluded from MVP:**

- Budgets (Phase 2)
- Multi-currency accounts + exchange rates (Phase 2)
- Savings graph (Phase 2)
- Extended reports (Phase 2)
- Bank API import (Phase 3)
- Subscriptions (Phase 3)
- Receipts — attach + OCR (Phase 3)
- Promotions (Phase 3)
- Assets/Encumbrances/Net Worth (Phase 4)
- Retirement forecasting (Phase 4)
- AI budget forecasting (Phase 4)
- Mobile app (Phase 4)
- Custom dashboard widgets (Phase 4)
- AWS deployment (post-MVP — develop locally first)

**Key architectural decisions:**

- Backend-first development (familiar for .NET dev, provides working APIs for frontend)
- CQRS infrastructure from day 1 even though MVP calculates on the fly (HS-14) — event handlers are no-ops but the pattern is established
- Multi-household junction table from day 1 (HS-2) — no migration needed later
- Validation: start with Zod in shared + class-validator in backend (decide on unification during implementation per tech-stack.md note)
