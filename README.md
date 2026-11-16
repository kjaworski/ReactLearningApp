# Personal & Household Finance Manager

A full-stack web application for tracking personal and household finances, built with a modern TypeScript monorepo architecture.

It is also a learning project: full-stack development, cloud (AWS, Azure, Kubernetes), software architecture, security, and AI — learned by building this app ([implementation plan](docs/implementation-plan.md)).

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

- **[mise](https://mise.jdx.dev/)** — installs the pinned Node.js 26.13.1 (`mise.toml`) and pnpm 12.21.0 (`packageManager` in `package.json`) and switches to them inside the repo. On Windows: `irm https://mise.run/powershell | iex`, then [activate it in PowerShell](https://mise.jdx.dev/shell-setup.html#powershell)
- **Docker** — for PostgreSQL

## Getting Started

```bash
# 1. Clone, then install the toolchain and the dependencies
git clone <repo-url>
cd ReactLearningApp
mise trust     # first time only: allow this repo's mise.toml
mise install   # Node.js and pnpm in the pinned versions
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

- **`apps/api/.env`** — `DATABASE_URL` (PostgreSQL connection string), `JWT_SECRET`, `JWT_EXPIRES_IN`
- **`apps/web/.env`** — `API_URL` (where the Next.js server reaches the API; read at runtime, so one image works in every environment — the browser itself calls `/api` on the same origin)

Sign-in provider settings (e.g. Google) are added together with the sign-in feature.

## Docker

```bash
docker compose up -d    # Start PostgreSQL
docker compose down     # Stop PostgreSQL
docker compose down -v  # Stop and delete data volume
```

PostgreSQL 18 runs on port 5432; the credentials in `docker-compose.yml` match `DATABASE_URL` in `apps/api/.env.example`.
