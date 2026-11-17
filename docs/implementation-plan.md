# Implementation Plan: Personal & Household Finance Manager — MVP (Phase 1)

## TL;DR

Build the MVP in 7 phases, backend-first (familiar territory as .NET dev), then frontend. Start with monorepo scaffolding → Prisma schema → NestJS modules (identity → transaction → reporting) → Next.js frontend → polish. Each phase is independently verifiable. A GitHub Actions workflow will check every push; it isn't set up yet — CI-1 is the next step. Each phase also has a learning focus on architecture and security; AI comes with the Phase 3–4 features (Learning focus, below).

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
7. ~~**ESLint + Prettier** — one Prettier config at the root, a flat ESLint config in each package~~ ✅
8. ~~**Husky + lint-staged** — pre-commit hook for linting + formatting~~ ✅
9. ~~**Environment config** — one `.env.example` per app: `apps/api` (DATABASE_URL, JWT settings) and `apps/web` (API_URL)~~ ✅
10. ~~**Turborepo pipelines** — configure `turbo.json` for `build`, `dev`, `lint`, `test` tasks with correct dependency graph~~ ✅

> **Phase A completed** — all 10 steps done and verified. Commits `d902130` through `3d2a049`.

**Verification:**

- `pnpm install` succeeds
- `turbo dev` starts both Next.js (port 3000) and NestJS (port 3001) concurrently
- `docker compose up -d` starts PostgreSQL (the API connects to it from C2 on)
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

**Follow-up — data integrity (B6–B8)** — _planned; any time before C8, the first step that writes these tables_

> A review found rules that today only application code would enforce. The database enforces them as well, so a bug in one service can't break them.

- **B6** — References stay inside one household: `Account`, `Category`, and `Transaction` get `@@unique([householdId, id])`; a transaction references its account and its category through composite foreign keys (`[householdId, accountId]`, `[householdId, categoryId]`); `TransactionSplit` gets `householdId` and composite foreign keys to its transaction and its category. A transaction can then never point to another household's account or category
- **B7** — Value rules: `CHECK ("amount" > 0)` on transactions and splits — Prisma can't express CHECK constraints, so they're added by hand to a migration created with `prisma migrate dev --create-only`; at most one default account per household — a partial unique index, `@@unique([householdId], where: { isDefault: true })` (preview feature `partialIndexes`)
- **B8** — Seed: one database transaction (a failed run leaves nothing behind), skipped when the dev user already exists, refused when `NODE_ENV` is `production`

Left to the application on purpose (Phase D): that `Transaction.userId` is a member of the household — a foreign key to `user_households` would block removing a member who has transactions; that the category's type matches the transaction's type; that splits add up to the total. Before B6, draft ADR-21: how household isolation is enforced — application checks only, composite foreign keys, or PostgreSQL row-level security.

**Verification:** `pnpm exec prisma validate`; read the generated SQL before it's applied; in psql, a transaction with another household's account, `amount = 0`, and a second default account are all rejected; `pnpm exec prisma db seed` succeeds twice in a row

---

## Continuous Integration: GitHub Actions — _alongside all phases_

> A workflow in `.github/workflows/` runs the checks a developer runs before pushing, on every push and pull request. It starts small and grows with the app (architecture.md ADR-17).

**Steps:**

- **CI-1** — First workflow, `.github/workflows/ci.yml`: on every push to `main` and every pull request, install dependencies, then run `pnpm format:check`, `pnpm lint`, `pnpm build`, `pnpm test` — _next_
- **CI-2** — Keep the repository and the workflow safe: turn on GitHub's free security features for public repositories (Dependabot alerts and security updates, CodeQL code scanning with the default setup, secret scanning with push protection); Dependabot version updates for GitHub Actions; actions locked to exact commits (`gh actions-lock`, or full-length SHAs); optionally a ruleset on `main` that requires the CI check (changes then go through pull requests)
- **CI-3** — With C3: the e2e smoke test against a PostgreSQL 18 service container, after `prisma migrate deploy`. The job calls the API package directly (`pnpm --filter @finance/api test:e2e`): through Turborepo, `DATABASE_URL` would be filtered out unless `turbo.json` declares it (strict environment mode). Locally, e2e tests that write data (from C4 on) use a separate test database, never the development one
- **CI-4** — With the Docker step (post-MVP): build the API and web images
- **CD** — With each cloud (post-MVP): deploy workflows that sign in with OIDC; infrastructure previews (`terraform plan`, Bicep `what-if`) on pull requests, applied on `main` after approval in a GitHub environment

**Notes for CI-1:**

- CI only checks and reports — it never fixes or commits anything. Fixing stays local: the editor (Prettier is the workspace's default formatter), the pre-commit hook (lint-staged), `pnpm format`, and a `lint:fix` script. `permissions: contents: read` enforces this: the workflow's token can't push
- `lint` is check-only in every package; `apps/api` also has `lint:fix` for local use. CI runs `pnpm lint`
- Warnings don't fail ESLint: `apps/api` sets `no-floating-promises` and `no-unsafe-argument` to `warn`, so CI would list them and stay green. To fail on them, raise them to `error` or add `--max-warnings 0` to `lint`
- Feedback: a failed check on the commit or pull request, the log of the failing step, and a GitHub notification (Settings → Notifications → Actions — can be limited to failed runs). `actions/setup-node` also registers problem matchers that turn ESLint and TypeScript errors into annotations on the file and line
- A `concurrency` group cancels a run when a newer commit arrives on the same branch
- Versions come from the repository, not from the workflow: `pnpm/action-setup` reads `packageManager`; `actions/setup-node` with `node-version-file: mise.toml` reads the Node.js pin — v7.1.0 or later, the first version that understands `mise.toml`. `cache: pnpm` caches the pnpm store
- In CI, `pnpm install` refuses to change the lockfile (frozen lockfile is automatic)
- From C2 on, the API imports the generated Prisma client, which is gitignored: CI then has to run `prisma generate` before lint, build, and test — for example as a Turborepo task they depend on
- Later, when builds get slow: cache Turborepo's `.turbo` folder with `actions/cache`
- When it's green: a status badge and a CI row in the README

**Verification:**

- A push to `main` shows a green check on the commit; the Actions tab shows the log of each step
- A pull request with a formatting or lint error fails the check, and the run leaves the code unchanged
- A lint error appears as an annotation on the file and line — if not, check whether Turborepo's `package:task:` prefix in front of each log line is the reason (`--log-prefix=none`)
- The workflow file contains no Node.js or pnpm version

**Relevant files:** `.github/workflows/ci.yml`, `.github/dependabot.yml`, `README.md` (badge)

---

## Learning focus — architecture, security, AI (_alongside all phases_)

> The app is the exercise. Each phase adds architecture and security topics on top of its features: the developer drafts first (ADRs, threat models, diagrams), then Copilot reviews. Baselines are in tech-stack.md: Architecture style, Security baseline, AI features.

| Phase        | Architecture                                                                                                                                                                                                        | Security                                                                                                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CI**       | Pipelines as code; least-privilege tokens                                                                                                                                                                           | Supply chain: what each CI-2 feature catches (vulnerable dependencies, leaked secrets, unsafe code patterns)                                                                                                                        |
| **C**        | ADR-20: the architecture style (modular monolith, DDD modules, CQRS), so far only described in tech-stack.md; dependency injection and module boundaries; fail-fast configuration; the first end-to-end slice (C3a) | Threat model of sign-up and sign-in (STRIDE); password hashing; JWT vs session cookies; CSRF, and why one origin needs no CORS (ADR-19); broken object-level authorization — a test proves that another household's ids are refused |
| **D**        | Aggregates and invariants (splits add up to the total); commands vs queries; transaction boundaries                                                                                                                 | Mass assignment (unknown fields are rejected); an authorization test for every endpoint                                                                                                                                             |
| **E**        | Read models calculated on the fly vs precomputed (HS-14) — measure before optimizing                                                                                                                                | CSV injection; file downloads (`Content-Disposition`, content types)                                                                                                                                                                |
| **F**        | Server vs client components; where state lives                                                                                                                                                                      | XSS (React escaping, no `dangerouslySetInnerHTML` with user data); Content Security Policy                                                                                                                                          |
| **G**        | The performance targets (step 4)                                                                                                                                                                                    | OWASP ASVS 5.0 Level 1 review (step 5); dependency audit                                                                                                                                                                            |
| **Post-MVP** | C4 diagrams; AWS and Azure Well-Architected reviews; an outbox table once events leave the process                                                                                                                  | Cloud IAM least privilege, private networking, container image scanning, security logging                                                                                                                                           |

**AI:** the AI features come in Phases 3–4 (tech-stack.md, AI features); each is built without AI first and then compared with an AI version. Until then, the AI topic is AI-assisted development: every generated change is read, understood, and checked against official documentation before it's committed.

---

## Phase C: Backend — Identity & Access Module — _depends on Phase B_

> Build UC-6 (Register & Login), UC-16 (Invite Member), household creation, default categories/account seeding. This is the auth foundation everything else depends on.

> **Approach** (architecture.md ADR-16): build a minimal login by hand first to learn how auth works, then switch to **Better Auth**. Each step installs only the packages it needs.

**Progress** — Phase C is built in small learning steps:

- **C1** — Configuration: `@nestjs/config` loads `apps/api/.env`; the app refuses to start when a required variable is missing — _after CI-1_
- **C2** — Database access: `PrismaModule` + `PrismaService`; the first endpoint, `GET /api/health`, checks the database connection. Every route gets the `/api` prefix (`app.setGlobalPrefix('api')`), so each environment can route by path (architecture.md ADR-19); the endpoint paths below leave it out
- **C3** — Logging, API docs, and HTTP hardening: Pino logging, Swagger UI at `/api/docs`, security headers (Helmet); the scaffold e2e test (still expects `GET /` → "Hello World!") becomes a `GET /api/health` smoke test
- **C3a** — Vertical checkpoint: the Next.js home page shows the result of `GET /api/health` twice — fetched on the server through `API_URL` (read at request time) and in the browser through `/api` (a development-only rewrite in `next.config.ts`). The first end-to-end path: browser → Next.js → NestJS → PostgreSQL
- **C4** — Register _(learning version)_: `POST /auth/register` — DTO validation, Argon2id password hash, duplicate email → 409
- **C5** — Log in _(learning version)_: `POST /auth/login` returns a short-lived JWT
- **C6** — Protected routes _(learning version)_: JWT strategy + guard, `@CurrentUser()`, `GET /users/me`
- **C7** — Switch to Better Auth: replaces C4–C6; sessions in httpOnly cookies, users stay in our PostgreSQL; `BETTER_AUTH_URL` is the public origin (locally `http://localhost:3000`)
- **C8** — Household on sign-up: household + default account + default categories in one transaction; `HouseholdGuard`
- **C9** — Household and profile endpoints
- **C10** — Invitations: create, accept, revoke, resend; a daily job expires old ones. The token is a bearer credential, so only its hash is stored (`token` becomes `tokenHash`): 32 random bytes from `crypto.randomBytes`, carried by the e-mail link after `#` (`/invite#<token>`) — browsers don't send that part to servers, so it stays out of access logs. SHA-256 is enough for random tokens; slow hashes like Argon2 exist for guessable passwords. Accepting hashes the incoming token and, in one conditional update, requires `PENDING` and an unexpired `expiresAt` — a token works once, and never after it expires, even before the daily job runs. Unknown, used, expired, and revoked tokens all get the same error

_Later:_ Google sign-in (a Better Auth provider) comes with the frontend in Phase F; CQRS starts in Phase D.

**Steps:**

1. **Foundation** (C1–C3a):
   - `ConfigModule` (global) — loads `apps/api/.env`, validates required variables at startup
   - `PrismaModule` (global) — wraps the Prisma client, handles the connection lifecycle; `GET /api/health`
   - Pino logger, Swagger UI (`@nestjs/swagger`, API groups by module), security headers (Helmet)
   - Checkpoint: the web home page calls the API — on the server and in the browser

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
     - `POST /invitations/accept` — the token travels in the request body (a URL path would put it in request logs); accept invitation, create user if new, add to household
     - `DELETE /invitations/:id` — revoke invitation
     - `POST /invitations/:id/resend` — invalidate old token, create new one
     - Cron job: expire invitations older than 7 days

**Verification:**

- The API refuses to start without `DATABASE_URL`; `GET /api/health` reports the database connection
- Swagger UI opens at `/api/docs`
- Checkpoint: the web home page shows the API status, fetched on the server and in the browser
- Learning version: register → log in → call `GET /users/me` with the JWT
- After the switch: sign up → session cookie → `GET /users/me`
- Sign-up creates the household, the "Cash" account, and the default categories
- Invite flow: create invitation → accept → new user in household
- A token works once; used, expired, revoked, and unknown tokens get the same error; the `invitations` table holds only hashes
- `GET /households/:id` returns member list
- Expired invitations are auto-cleaned
- Not signed in → 401
- Wrong householdId → 403

**Relevant files:**

- `apps/api/src/prisma/` — prisma.module.ts, prisma.service.ts
- `apps/api/src/common/` — guards/, decorators/, filters/
- `apps/api/src/modules/identity/` — identity.module.ts, controllers/, services/, dto/
- `apps/api/src/auth.ts` — Better Auth configuration (C7)
- `apps/web/src/app/page.tsx`, `apps/web/next.config.ts` — checkpoint C3a

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
   - Rules the aggregate checks on every change — the database also enforces the first one (B6) and positive amounts (B7):
     - the account and the category belong to the household
     - amounts are positive, with at most 2 decimal places; they travel as strings in JSON and are calculated with `Prisma.Decimal`, never as JavaScript numbers, so nothing gets rounded
     - the category's type matches the transaction's type, for splits too
     - `userId` is a member of the household
     - a change that breaks the split invariant is rejected — for example a new amount without new splits

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
- An account, category, or member from another household → the same error as an unknown id; the database rejects such a row too (B6)
- Amount 0, negative, or with 3 decimal places → 400; an income category on an expense → 400

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
   - TanStack Query provider setup; API calls go to `/api` on the same origin, so the browser sends the session cookie by itself (architecture.md ADR-19)
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

5. **Security review** — OWASP ASVS 5.0 Level 1 as the checklist:
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
- Cloud deployment and infrastructure as code — AWS (Terraform) first, then Azure (Bicep), later Kubernetes on AKS (Terraform) (post-MVP — develop locally first; learning path in tech-stack.md, architecture.md ADR-18)
- i18n / translation support for category names and UI (post-MVP — English-only at launch, default category names stored in English)

**Key architectural decisions:**

- Backend-first development (familiar for .NET dev, provides working APIs for frontend)
- Auth: a hand-built learning version first, then Better Auth (architecture.md ADR-16)
- CI on GitHub Actions from Phase C on; deployments later sign in to the clouds with OIDC (architecture.md ADR-17)
- CQRS infrastructure from day 1 even though MVP calculates on the fly (HS-14) — event handlers are no-ops but the pattern is established
- Multi-household junction table from day 1 (HS-2) — no migration needed later
- Validation: start with Zod in shared + class-validator in backend (decide on unification during implementation per tech-stack.md note)
- Default category names in English — i18n/translation deferred to post-MVP. When implemented, consider storing a translation key on Category and resolving display names at the UI layer based on user locale
- No default value for `mainCurrency` on Household — user explicitly selects currency during registration to support multiple countries
