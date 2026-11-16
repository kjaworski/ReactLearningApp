# Tech Stack – Personal & Household Finance Manager

> **Decision date:** May 2026
> **Context:** Solo developer (.NET backend senior, frontend junior), building a DDD-based household finance app for learning + portfolio. Goal: full-stack job readiness.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        MONOREPO (pnpm + Turborepo)              │
│                                                                 │
│  apps/                                                          │
│  ├── web/          Next.js 16 (App Router)     ← Frontend       │
│  └── api/          NestJS 12 (latest stable)   ← Backend API    │
│                                                                 │
│  packages/                                                      │
│  └── shared/       Shared TypeScript types     ← DTOs, enums    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌───────────────┐         ┌──────────────────┐      ┌────────────┐
│   Next.js     │ session │    NestJS        │      │ PostgreSQL │
│   (Frontend)  │────────►│    (Backend API) │─────►│   (via     │
│               │  HTTP   │                  │      │   Prisma)  │
│  Better Auth  │         │  9 DDD modules   │      └────────────┘
│  TanStack Q.  │         │  CQRS            │
│  shadcn/ui    │         │  Better Auth     │
│  Tailwind CSS │         │  Guards          │
└───────────────┘         └──────────────────┘
```

---

## Stack Decisions

### Frontend — `apps/web/`

| Category            | Choice                              | Why                                                                                                                                                 |
| ------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**       | **Next.js 16** (App Router)         | Industry standard for full-stack React. SSR, Server Components, file-based routing. Highest job market value.                                       |
| **Language**        | **TypeScript**                      | Type safety, shared types with backend via `packages/shared/`                                                                                       |
| **Styling**         | **Tailwind CSS**                    | Utility-first, fast iteration, built-in dark mode, mobile-first responsive                                                                          |
| **UI Components**   | **shadcn/ui** (Radix UI primitives) | Copy-paste components (you own the code), accessible, Tailwind-based, dark mode built-in. Not an npm dependency — components live in your codebase. |
| **Server state**    | **TanStack Query v5**               | Caching, auto-refetch, mutations, optimistic updates. The standard for calling external APIs from React.                                            |
| **Client state**    | **Zustand** (if needed)             | Lightweight store for UI-only state (theme, open modals, active filters). Start without it — add only if React state/context isn't enough.          |
| **Auth (frontend)** | **Better Auth** (client)            | Sign-in forms call the Better Auth endpoints in the API; the session lives in an httpOnly cookie (no tokens in JavaScript).                         |
| **Forms**           | **React Hook Form + Zod**           | Performant forms (no re-renders) + schema validation shared with backend                                                                            |
| **Virtual scroll**  | **TanStack Virtual**                | Windowed rendering for the transaction list (HS-10 resolution)                                                                                      |
| **Charts**          | **Recharts**                        | Charting built for React (pie charts for dashboard, line charts for savings graph)                                                                  |
| **Report export**   | Server-side (API)                   | Download buttons call the API's export endpoints; PDF and CSV files are generated on the server (see Backend, HS-15)                                |

### Backend — `apps/api/`

| Category           | Choice                                                | Why                                                                                                                                                                                                                                                                                                            |
| ------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**      | **NestJS 12** (latest stable)                         | Modular architecture maps 1:1 to bounded contexts. Built-in DI, CQRS module, guards (like .NET `[Authorize]`), pipes (like .NET model validation). Feels like ASP.NET Core.                                                                                                                                    |
| **Language**       | **TypeScript**                                        | Shared types with frontend                                                                                                                                                                                                                                                                                     |
| **Database**       | **PostgreSQL 18**                                     | Relational integrity for financial data. JSONB for semi-structured data (OCR results, bank imports, promotion rules). Industry standard for fintech.                                                                                                                                                           |
| **ORM**            | **Prisma 7**                                          | Type-safe auto-generated client, declarative schema, easy migrations, great DX. Most popular TypeScript ORM. V7 requires a driver adapter (`@prisma/adapter-pg`).                                                                                                                                              |
| **Auth (backend)** | **Better Auth** (after a hand-built learning version) | Phase C first builds register/login by hand (Passport, `@nestjs/jwt`, Argon2id) to learn how auth works, then switches to Better Auth: sessions in httpOnly cookies, Google sign-in, rate limiting, users in our PostgreSQL via Prisma (architecture.md ADR-16).                                               |
| **Validation**     | **class-validator + class-transformer**               | Decorator-based DTO validation (like .NET `[Required]`, `[MaxLength]`). NestJS pipes auto-validate.                                                                                                                                                                                                            |
| **CQRS**           | **@nestjs/cqrs**                                      | Separate command/query handlers per bounded context. Events bus for cross-context communication. **Note:** the event bus is in-memory — works for a single instance. For multi-instance deployment (ECS Fargate with multiple tasks), add an external event bus (e.g., Redis pub/sub or Amazon SNS/SQS) later. |
| **API style**      | **REST**                                              | Standard for job market. OpenAPI/Swagger via `@nestjs/swagger` for auto-generated docs.                                                                                                                                                                                                                        |
| **Report export**  | **pdfmake** (PDF) + **csv-stringify** (CSV)           | Reports are generated on the server and streamed as file downloads: one source of truth for the numbers, household scoping enforced by the API, works for long date ranges, and reusable later for e-mailed reports. pdfmake builds paginated tables without a headless browser.                               |
| **Logging**        | **Pino** (via `nestjs-pino`)                          | Structured JSON logging, fast, production-ready                                                                                                                                                                                                                                                                |

### Shared — `packages/shared/`

| Category               | Choice                      | Why                                                                           |
| ---------------------- | --------------------------- | ----------------------------------------------------------------------------- |
| **Shared types**       | TypeScript interfaces/enums | DTOs, TransactionType, BudgetStatus, etc. — used by both frontend and backend |
| **Validation schemas** | **Zod**                     | Shared validation schemas (frontend forms + backend API validation)           |

> ⚠️ **Validation note:** Backend uses `class-validator` decorators on NestJS DTOs while `packages/shared/` uses Zod schemas for frontend forms. This means validation rules are defined in two systems. To mitigate: define canonical Zod schemas in `shared/`, and either (a) use `nestjs-zod` on the backend to replace class-validator, or (b) auto-generate one from the other. Decide during implementation.

### Infrastructure & Tooling

| Category             | Choice                                             | Why                                                                                                                              |
| -------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Monorepo**         | **pnpm + Turborepo**                               | pnpm = fast, strict, saves disk space. Turborepo = smart build caching, parallel tasks. Industry standard for Next.js monorepos. |
| **Testing**          | **Vitest** (unit/API tests) + **Playwright** (E2E) | Vitest is the NestJS 12 default (native TS + ESM, Jest-like API). Playwright is modern E2E (cross-browser, auto-waiting).        |
| **Linting**          | **ESLint + Prettier**                              | Code quality + consistent formatting                                                                                             |
| **Git hooks**        | **Husky + lint-staged**                            | Pre-commit linting/formatting                                                                                                    |
| **API docs**         | **Swagger (OpenAPI)** via `@nestjs/swagger`        | Auto-generated API documentation from decorators                                                                                 |
| **Containerization** | **Docker + Docker Compose**                        | Local PostgreSQL via Docker Compose; container images for deployment (post-MVP)                                                  |

### Deployment — AWS

| Component            | AWS Service                                    | Why                                                                                                                        |
| -------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Next.js frontend** | **AWS Amplify Hosting**                        | Native Next.js SSR support, auto-deploys from git, built-in CDN, preview environments                                      |
| **NestJS backend**   | **AWS ECS Fargate** (or Lambda via Serverless) | Containerized deployment, auto-scaling, no server management. Fargate for long-running processes (bank import schedulers). |
| **Database**         | **AWS RDS PostgreSQL**                         | Managed PostgreSQL, automated backups, Multi-AZ for production                                                             |
| **File storage**     | **AWS S3**                                     | Receipt photos/scans — private bucket, upload/download via presigned URLs (HS-26)                                          |
| **Secrets**          | **AWS Secrets Manager**                        | API keys, database credentials, OAuth secrets                                                                              |
| **Scheduling**       | **AWS EventBridge**                            | Cron triggers for daily exchange rate sync, subscription reminders                                                         |
| **Email**            | **AWS SES**                                    | Invitation emails, alerts, reminders                                                                                       |

---

## Module Structure — NestJS Bounded Contexts

Each bounded context from the DDD analysis maps to a NestJS module:

```
apps/api/src/
├── modules/
│   ├── identity/              ← Identity & Access (User, Household, Invitation)
│   ├── transaction/           ← Transaction Management (Transaction, Category, Account, Receipt)
│   ├── budgeting/             ← Budgeting (Budget, BudgetAlert, Forecast)
│   ├── reporting/             ← Reporting & Analytics (Dashboard, Reports, Export)
│   ├── subscription/          ← Subscription Management (Subscription, Reminders)
│   ├── bank-integration/      ← Bank Integration (BankConnection, ImportBatch)
│   ├── wealth/                ← Wealth Management (Asset, Encumbrance, NetWorth)
│   ├── currency/              ← Currency Exchange (ExchangeRate sync)
│   └── promotion/             ← Promotion Tracking (Promotion, Compliance)
├── common/                    ← Shared guards, pipes, decorators, filters
├── prisma/                    ← PrismaModule + PrismaService (schema and migrations live in apps/api/prisma/)
└── main.ts
```

Each module contains:

```
modules/transaction/
├── transaction.module.ts      ← NestJS module definition
├── commands/                  ← CQRS command handlers (RecordTransaction, SplitTransaction, etc.)
├── queries/                   ← CQRS query handlers (GetFilteredTransactions, etc.)
├── events/                    ← Domain event handlers (TransactionRecorded, etc.)
├── controllers/               ← REST endpoints
├── dto/                       ← Request/response DTOs with class-validator decorators
├── entities/                  ← Domain entities (rich models, business rules)
└── services/                  ← Domain services (if needed)
```

---

## MVP Phase 1 — What to Build First

Only these modules are needed for MVP:

| Module        | MVP scope                                                                                                             |
| ------------- | --------------------------------------------------------------------------------------------------------------------- |
| `identity`    | Register, login (Google + password), create household, seed default categories, create default account, invite member |
| `transaction` | Record transaction (Income/Expense), split, unsplit, manage categories, manage accounts (add, rename, deactivate)     |
| `reporting`   | Dashboard (current month, selectable), basic reports (monthly, category), PDF/CSV export                              |

Modules added in later phases:

- Phase 2: `budgeting`, `currency` (multi-currency accounts), extended `reporting`
- Phase 3: `bank-integration`, `subscription`, receipt import in `transaction`, `promotion`
- Phase 4: `wealth`, AI forecasting in `budgeting`

---

## .NET → TypeScript/NestJS Translation Guide

> Quick reference for mapping your existing .NET knowledge to the new stack.

| .NET Concept                        | NestJS Equivalent                                 |
| ----------------------------------- | ------------------------------------------------- |
| `[ApiController]`                   | `@Controller()`                                   |
| `[HttpGet]`, `[HttpPost]`           | `@Get()`, `@Post()`                               |
| `[Authorize]`                       | Auth guard (`@UseGuards(...)`)                    |
| `[AllowAnonymous]`                  | `@AllowAnonymous()` (Better Auth integration)     |
| `[FromBody]`                        | `@Body()`                                         |
| `[FromQuery]`                       | `@Query()`                                        |
| `[FromRoute]`                       | `@Param()`                                        |
| `[Required]`, `[MaxLength]`         | `@IsNotEmpty()`, `@MaxLength()` (class-validator) |
| `IServiceCollection.AddScoped<T>()` | `@Injectable()` + module `providers: []`          |
| `IConfiguration`                    | `@nestjs/config` ConfigService                    |
| Middleware                          | `@Injectable() implements NestMiddleware`         |
| Action Filters                      | Interceptors (`@UseInterceptors()`)               |
| Exception Filters                   | Exception Filters (`@Catch()`)                    |
| `DbContext` (EF Core)               | `PrismaService` (injected)                        |
| `.AddDbContext<T>()`                | `PrismaModule` (global)                           |
| `.Include()` (eager loading)        | Prisma `include: {}`                              |
| MediatR `IRequest<T>`               | `@nestjs/cqrs` Command/Query                      |
| MediatR `IRequestHandler<T>`        | `@CommandHandler()` / `@QueryHandler()`           |
| MediatR `INotification`             | `@nestjs/cqrs` Event                              |
| `IHostedService`                    | `@Cron()` via `@nestjs/schedule`                  |
| `.sln` + `.csproj`                  | pnpm workspaces + `package.json`                  |
| `dotnet build`                      | `turbo build`                                     |
| NuGet packages                      | npm packages                                      |

---

## Key Dependencies (npm packages)

### Frontend (`apps/web/package.json`)

```
next, react, react-dom
better-auth                    ← Auth client (better-auth/react)
@tanstack/react-query          ← Server state
tailwindcss, @tailwindcss/postcss ← Styling (PostCSS plugin for Next.js; @tailwindcss/vite is for Vite-only projects)
zod, react-hook-form, @hookform/resolvers ← Forms
@tanstack/react-virtual        ← Virtual scroll
recharts                       ← Charts
```

### Backend (`apps/api/package.json`)

```
@nestjs/core, @nestjs/platform-express
@nestjs/cqrs                   ← CQRS
better-auth, @thallesp/nestjs-better-auth ← Auth (sessions, Google sign-in)
@nestjs/passport, @nestjs/jwt, passport-jwt, @node-rs/argon2 ← Hand-built learning version of auth (removed after the switch)
@nestjs/swagger                ← API docs
@nestjs/config                 ← Environment config
@nestjs/schedule               ← Cron jobs
@prisma/client, prisma         ← ORM (Prisma 7 + @prisma/adapter-pg driver adapter)
class-validator, class-transformer ← DTO validation
nestjs-pino, pino, pino-http   ← Logging (pino-http is a required peer of nestjs-pino 5)
pdfmake, csv-stringify         ← Report export (PDF, CSV)
```
