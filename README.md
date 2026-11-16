# Personal & Household Finance Manager

A full-stack web application for tracking personal and household finances, built with a modern TypeScript monorepo architecture.

## Tech Stack

| Layer    | Technology                                                   |
| -------- | ------------------------------------------------------------ |
| Frontend | Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4 |
| Backend  | NestJS 12 (native ESM), Prisma 7, Vitest 5                   |
| Database | PostgreSQL 18                                                |
| Shared   | TypeScript 6.0, shared types package                         |
| Monorepo | pnpm 12, Turborepo 2.11                                      |
| Quality  | ESLint 10, Prettier 3.10, Husky 9 + lint-staged 17           |

Why each tool was chosen, the module structure, CI, infrastructure as code, and the deployment options on AWS, Azure, and AKS: [docs/tech-stack.md](docs/tech-stack.md). Architecture decisions: [docs/architecture.md](docs/architecture.md).

## Prerequisites

- **Node.js 26** (LTS) — pinned to 26.13.1 with [Volta](https://volta.sh/), which switches to it automatically inside the repo
- **pnpm 12** — pinned to 12.21.0 via `packageManager`; a globally installed pnpm switches to it automatically (on Windows, a global pnpm 11 must be ≥ 11.28.4 — see ADR-4 in [docs/architecture.md](docs/architecture.md))
- **Docker** — for PostgreSQL

## Getting Started

```bash
# 1. Clone and install
git clone <repo-url>
cd ReactLearningApp
pnpm install

# 2. Configure environment (one .env per app)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Set JWT_SECRET in apps/api/.env (DATABASE_URL already matches docker-compose.yml)

# 3. Start PostgreSQL
docker compose up -d

# 4. Run database migrations and seed (from apps/api/)
cd apps/api
pnpm exec prisma generate
pnpm exec prisma migrate dev
pnpm exec prisma db seed
cd ../..

# 5. Run both apps in dev mode
pnpm dev
```

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:3001

## Project Structure

```
ReactLearningApp/
├── apps/
│   ├── api/                  # NestJS backend (port 3001)
│   │   ├── .env.example      # Settings template (copy to .env)
│   │   ├── prisma/           # Prisma schema & migrations
│   │   ├── src/
│   │   │   ├── generated/    # Prisma client (gitignored)
│   │   │   ├── modules/      # DDD modules (built in Phases C–E)
│   │   │   │   ├── identity/
│   │   │   │   ├── transaction/
│   │   │   │   └── reporting/
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   └── prisma.config.ts  # Prisma CLI config (schema, seed, datasource)
│   │
│   └── web/                  # Next.js frontend (port 3000)
│       ├── .env.example      # Settings template (copy to .env)
│       └── src/app/          # App Router pages
│
├── packages/
│   └── shared/               # Shared types & enums
│       └── src/index.ts      # Shared types (TransactionType enum)
│
├── docs/                     # Design & planning documents
│   ├── requirements.md
│   ├── ddd-analysis.md
│   ├── event-storming.md
│   ├── tech-stack.md
│   ├── architecture.md       # Architecture decision records (ADRs)
│   └── implementation-plan.md
│
├── docker-compose.yml        # PostgreSQL 18 for local dev
├── turbo.json                # Turborepo task pipelines
└── pnpm-workspace.yaml       # Workspace package definitions
```

## Scripts

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `pnpm dev`          | Start all apps in development mode |
| `pnpm build`        | Build all packages and apps        |
| `pnpm lint`         | Lint all workspaces                |
| `pnpm test`         | Run tests across all workspaces    |
| `pnpm format`       | Format all files with Prettier     |
| `pnpm format:check` | Check formatting without writing   |

## Workspaces

| Package           | Name              | Description                       |
| ----------------- | ----------------- | --------------------------------- |
| `apps/api`        | `@finance/api`    | NestJS REST API                   |
| `apps/web`        | `@finance/web`    | Next.js frontend                  |
| `packages/shared` | `@finance/shared` | Shared TypeScript types and enums |

Shared types are consumed via `workspace:*` protocol — import from `@finance/shared` in either app.

## Environment Variables

Each app has its own `.env` (gitignored) next to a committed `.env.example` template — there is no root `.env`:

- **`apps/api/.env`** — `DATABASE_URL` (PostgreSQL connection string), `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- **`apps/web/.env`** — `NEXT_PUBLIC_API_URL` (frontend → backend URL)

Sign-in provider settings (e.g. Google) are added together with the sign-in feature.

## Docker

```bash
docker compose up -d    # Start PostgreSQL
docker compose down     # Stop PostgreSQL
docker compose down -v  # Stop and delete data volume
```

PostgreSQL 18 runs on port 5432; the credentials in `docker-compose.yml` match `DATABASE_URL` in `apps/api/.env.example`.
