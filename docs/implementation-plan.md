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
4. ~~**Set up shared types package** (`packages/shared`) — `package.json`, `tsconfig.json`, export barrel file. Add `TransactionType` enum as the first shared type~~ ✅
5. ~~**Docker Compose** — PostgreSQL 18 container for local dev (port 5432), volume for data persistence. Optional: pgAdmin container~~ ✅
6. ~~**Prisma setup** (`apps/api/prisma/`) — install Prisma, create initial `schema.prisma` with datasource config, generate client~~ ✅
7. ~~**ESLint + Prettier** — shared config at root, workspace-specific overrides~~ ✅
8. ~~**Husky + lint-staged** — pre-commit hook for linting + formatting~~ ✅
9. ~~**Environment config** — one `.env.example` per app: `apps/api` (DATABASE_URL, JWT settings) and `apps/web` (NEXT_PUBLIC_API_URL)~~ ✅
10. ~~**Turborepo pipelines** — configure `turbo.json` for `build`, `dev`, `lint`, `test` tasks with correct dependency graph~~ ✅

> **Phase A completed** — all 10 steps done and verified. Commits `d902130` through `3d2a049`.

**Verification:**

- `pnpm install` succeeds
- `turbo dev` starts both Next.js (port 3000) and NestJS (port 3001) concurrently
- `docker compose up -d` starts PostgreSQL, NestJS connects to it
- `packages/shared` types are importable from both `apps/web` and `apps/api`
- `turbo lint` passes on all workspaces

**Relevant files:**

- Root: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.prettierrc`, `docker-compose.yml`
- ESLint: a flat `eslint.config.mjs` in each package (architecture.md ADR-5)
- `apps/api/`: `.env.example`, `nest-cli.json`, `tsconfig.json`, `src/main.ts`, `src/app.module.ts`
- `apps/web/`: `.env.example`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `src/app/globals.css` (Tailwind 4 is configured in CSS — no `tailwind.config.ts`), `src/app/layout.tsx`
- `packages/shared/`: `package.json`, `tsconfig.json`, `src/index.ts`

---

## Phase B: Database Schema (Prisma) — _depends on Phase A_

> Translate the DDD domain model (ddd-analysis.md section 5.2) into a Prisma schema. MVP-only tables — don't create Phase 2-4 tables yet.

**Steps:**

1. ~~**Identity & Access models** — `User`, `Household`, `UserHousehold` (junction table for multi-household readiness per HS-2), `Invitation`~~ ✅
   - User: id, email, displayName, passwordHash (nullable — Google users won't have one), googleId (nullable), createdAt
   - Household: id, name, mainCurrency (no default — user must choose during registration), createdAt
   - UserHousehold: userId, householdId, joinedAt (composite PK)
   - Invitation: id, householdId, inviterUserId, inviteeEmail, token (unique), status (PENDING/ACCEPTED/EXPIRED/REVOKED), expiresAt, createdAt

2. ~~**Transaction Management models** — `Account`, `Category`, `Transaction`, `TransactionSplit`~~ ✅
   - Account: id, householdId, name, currency, initialBalance, isActive (soft deactivate), isDefault, createdAt
   - Category: id, householdId, name, icon (nullable), color (nullable), type (EXPENSE/INCOME), sortOrder, createdAt
   - Transaction: id, householdId, accountId, userId, categoryId, type (INCOME/EXPENSE), amount (Decimal), currency, date, comment (nullable), createdAt, updatedAt
   - TransactionSplit: id, transactionId, categoryId, amount (Decimal), createdAt

3. ~~**Indexes and constraints** — householdId on all household-scoped tables (for query performance and row-level scoping), unique constraints (User.email, Invitation.token), cascade deletes where appropriate~~ ✅

4. ~~**Seed script** — `prisma/seed.ts` with the 23 default categories (18 expense + 5 income from HS-1, English names)~~ ✅

5. ~~**Run first migration** — `prisma migrate dev --name init`~~ ✅

> **Phase B completed** — all 5 steps done and verified. Schema defines 8 models, 3 enums, and all indexes/constraints. Migration `20260529121949_init` applied. Seed populates 1 user, 1 household, 1 account, and 23 categories.

**Verification:**

- ~~`pnpm exec prisma migrate dev` runs without errors~~ ✅
- ~~`pnpm exec prisma studio` opens and shows all tables with correct columns and relationships~~ ✅
- ~~`pnpm exec prisma db seed` populates default categories~~ ✅
- ~~Generated Prisma Client types match the domain model from ddd-analysis.md section 5.2~~ ✅

**Relevant files:**

- `apps/api/prisma/schema.prisma` — all model definitions
- `apps/api/prisma/seed.ts` — default categories and dev data
- `apps/api/prisma/migrations/20260529121949_init/` — initial migration SQL
- `apps/api/prisma.config.ts` — Prisma CLI config (schema path, seed command, datasource URL)

**Key decisions baked in:**

- `user_households` junction table from day 1 (HS-2)
- Amount stored as `Decimal` (not Float) for financial precision
- `householdId` on every household-scoped table for explicit scoping
- Invitation expiry: 7 days (HS-4)
- TransactionType as enum (HS-5)
- Category has `type` field (EXPENSE/INCOME) to separate the two lists
- Default category names stored in English; i18n/translation support deferred to a future phase
- `mainCurrency` has no default — user selects currency during household registration

---

## Phase C: Backend — Identity & Access Module — _depends on Phase B_

> Build UC-6 (Register & Login), UC-16 (Invite Member), household creation, default categories/account seeding. This is the auth foundation everything else depends on.

> **Approach** (architecture.md ADR-16): build a minimal login by hand first to learn how auth works, then switch to **Better Auth**. Each step installs only the packages it needs.

**Progress** — Phase C is built in small learning steps:

- **C1** — Configuration: `@nestjs/config` loads `apps/api/.env`; the app refuses to start when a required variable is missing — _next_
- **C2** — Database access: `PrismaModule` + `PrismaService`; the first endpoint, `GET /health`, checks the database connection
- **C3** — Logging and API docs: Pino logging, Swagger UI at `/api/docs`, CORS for `http://localhost:3000`; the scaffold e2e test (still expects `GET /` → "Hello World!") becomes a `GET /health` smoke test
- **C4** — Register _(learning version)_: `POST /auth/register` — DTO validation, Argon2id password hash, duplicate email → 409
- **C5** — Log in _(learning version)_: `POST /auth/login` returns a short-lived JWT
- **C6** — Protected routes _(learning version)_: JWT strategy + guard, `@CurrentUser()`, `GET /users/me`
- **C7** — Switch to Better Auth: replaces C4–C6; sessions in httpOnly cookies, users stay in our PostgreSQL
- **C8** — Household on sign-up: household + default account + default categories in one transaction; `HouseholdGuard`
- **C9** — Household and profile endpoints
- **C10** — Invitations: create, accept, revoke, resend; a daily job expires old ones

_Later:_ Google sign-in (a Better Auth provider) comes with the frontend in Phase F; CQRS starts in Phase D.

**Steps:**

1. **Foundation** (C1–C3):
   - `ConfigModule` (global) — loads `apps/api/.env`, validates required variables at startup
   - `PrismaModule` (global) — wraps the Prisma client, handles the connection lifecycle; `GET /health`
   - Pino logger, Swagger UI (`@nestjs/swagger`, API groups by module), CORS

2. **Learning version of auth** (C4–C6) — built by hand to see how login works:
   - `POST /auth/register` — email + password; validated DTO (global `ValidationPipe`); password hashed with Argon2id; an exception filter maps a duplicate email (Prisma unique constraint) to 409 Conflict
   - `POST /auth/login` — checks the password, returns a short-lived JWT with payload `{ sub: userId, email }` (`sub` = the standard JWT "subject" claim)
   - JWT strategy + `JwtAuthGuard` (like .NET's `[Authorize]`) and a `@CurrentUser()` decorator (like `User.Identity`); `GET /users/me` is the first protected route

3. **Switch to Better Auth** (C7):
   - Better Auth runs inside the API (NestJS integration) and keeps users and sessions in PostgreSQL through Prisma
   - The session lives in an httpOnly cookie; the guard checks the session instead of a JWT
   - The `User` model is adjusted to Better Auth's tables; the hand-built register/login code is removed

4. **Identity module** (C8–C10) — `modules/identity/`
   - **Household on sign-up** (UC-6 steps 4-6): create Household + UserHousehold + default "Cash" account + default categories in one transaction (HS-1); `HouseholdGuard` — the requested householdId must belong to the user
   - **Household endpoints**:
     - `GET /households/:id` — get household details + member list
     - `PATCH /households/:id` — update name, main currency
   - **User profile**:
     - `GET /users/me` — current user profile
     - `PATCH /users/me` — update display name
   - **Invitation flow** (UC-16):
     - `POST /households/:id/invitations` — create invitation, send email (mock email service for now)
     - `POST /invitations/:token/accept` — accept invitation, create user if new, add to household
     - `DELETE /invitations/:id` — revoke invitation
     - `POST /invitations/:id/resend` — invalidate old token, create new one
     - Cron job: expire invitations older than 7 days

**Verification:**

- The API refuses to start without `DATABASE_URL`; `GET /health` reports the database connection
- Swagger UI opens at `/api/docs`
- Learning version: register → log in → call `GET /users/me` with the JWT
- After the switch: sign up → session cookie → `GET /users/me`
- Sign-up creates the household, the "Cash" account, and the default categories
- Invite flow: create invitation → accept → new user in household
- `GET /households/:id` returns member list
- Expired invitations are auto-cleaned
- Not signed in → 401
- Wrong householdId → 403

**Relevant files:**

- `apps/api/src/prisma/` — prisma.module.ts, prisma.service.ts
- `apps/api/src/common/` — guards/, decorators/, filters/
- `apps/api/src/modules/identity/` — identity.module.ts, controllers/, services/, dto/
- `apps/api/src/auth.ts` — Better Auth configuration (C7)

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
   - `GET /households/:id/accounts` — list accounts with their `isActive` / `isDefault` flags (the transaction form offers only active ones)
   - `POST /households/:id/accounts` — add account (name, currency, initialBalance)
   - `PATCH /accounts/:id` — rename, or make it the default account
   - `PATCH /accounts/:id/deactivate` — soft deactivate; rejected for the default account and for the last active account (HS-35)

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
- Create accounts → list → rename → make default → deactivate (still shows in historical txns; the default and the last active account can't be deactivated)
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

3. **Export endpoints** (UC-7, HS-15) — files are generated on the server and streamed as downloads (`Content-Disposition: attachment`):
   - `GET /households/:id/reports/monthly/export?month=2026-05&format=csv` — CSV download (`csv-stringify`). Escape text cells that start with `=`, `+`, `-` or `@` (CSV injection — comments and category names are user input)
   - `GET /households/:id/reports/monthly/export?month=2026-05&format=pdf` — PDF download (`pdfmake`). Embed a Unicode font (e.g. Noto Sans) — the built-in PDF fonts can't show Polish letters such as ł, ą, ę

**Verification:**

- Dashboard returns correct totals matching manual calculation
- Add a transaction → dashboard totals update (real-time per HS-13 — verify by re-fetching)
- Monthly report groups transactions correctly by category
- CSV export is valid, opens in Excel; a comment that starts with `=` shows as text, not as a formula
- PDF export renders cleanly, including Polish characters

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
   - `/login` — email + password form, "Sign in with Google" button (Google provider configured in Better Auth)
   - `/register` — registration form with default categories selection UI (HS-1: show list, user can toggle off categories they don't want)
   - Better Auth client (`better-auth/react`) for sign-in, sign-out, and the current session
   - TanStack Query provider setup; API calls include the session cookie (`credentials: 'include'`)
   - Redirect logic in `src/proxy.ts`: unauthenticated → /login, authenticated → /dashboard

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
   - Rename inline, make default
   - Deactivate with confirmation (not offered for the default account or the last active one)

8. **Reports page** (`/reports`) — UC-7:
   - Report type selector (Monthly Statement, Category Summary)
   - Period selector
   - Rendered report (table + charts)
   - Export buttons: "Download PDF" and "Download CSV" (HS-15) — download from the export endpoints (the session cookie authenticates the request)

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

- `apps/web/src/app/(auth)/login/page.tsx`, `register/page.tsx`
- `apps/web/src/app/(dashboard)/layout.tsx` — authenticated layout with sidebar
- `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- `apps/web/src/app/(dashboard)/transactions/page.tsx`
- `apps/web/src/app/(dashboard)/categories/page.tsx`
- `apps/web/src/app/(dashboard)/accounts/page.tsx`
- `apps/web/src/app/(dashboard)/reports/page.tsx`
- `apps/web/src/app/(dashboard)/settings/page.tsx`
- `apps/web/src/components/` — reusable components (TransactionForm, FilterBar, PieChart, etc.)
- `apps/web/src/lib/api.ts` — TanStack Query hooks for API calls
- `apps/web/src/lib/auth-client.ts` — Better Auth client
- `apps/web/src/proxy.ts` — redirects to /login when there is no session

---

## Phase G: Testing & Polish — _depends on Phase F_

> Final quality pass. Tests, responsiveness, edge cases, performance.

**Steps:**

1. **Backend unit tests** (Vitest):
   - Transaction invariant: split amounts must equal total
   - Category deletion rejection when transactions exist
   - Invitation expiry logic
   - Filter query builder (date range, cursor pagination)
   - Auth guard (no session / invalid / expired session)

2. **Backend integration tests** (Vitest + Supertest + test database):
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
   - CSRF: SameSite session cookies + Better Auth's trusted-origins check

6. **Final polish**:
   - Loading states (skeleton screens) for all data-fetching pages
   - Error states (toast notifications for failures)
   - Empty states ("No transactions yet — add your first one")
   - Form validation error messages (user-friendly, in Polish where appropriate)

**Verification:**

- `turbo test` — all unit + integration tests pass
- `pnpm exec playwright test` — all E2E scenarios pass
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
- i18n / translation support for category names and UI (post-MVP — English-only at launch, default category names stored in English)

**Key architectural decisions:**

- Backend-first development (familiar for .NET dev, provides working APIs for frontend)
- Auth: a hand-built learning version first, then Better Auth (architecture.md ADR-16)
- CQRS infrastructure from day 1 even though MVP calculates on the fly (HS-14) — event handlers are no-ops but the pattern is established
- Multi-household junction table from day 1 (HS-2) — no migration needed later
- Validation: start with Zod in shared + class-validator in backend (decide on unification during implementation per tech-stack.md note)
- Default category names in English — i18n/translation deferred to post-MVP. When implemented, consider storing a translation key on Category and resolving display names at the UI layer based on user locale
- No default value for `mainCurrency` on Household — user explicitly selects currency during registration to support multiple countries
