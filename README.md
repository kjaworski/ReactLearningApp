# Personal & Household Finance Manager

A full-stack web application for tracking personal and household finances, built with a modern TypeScript monorepo architecture.

## Tech Stack

| Layer    | Technology                                                   |
| -------- | ------------------------------------------------------------ |
| Frontend | Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4 |
| Backend  | NestJS 11, Prisma 7                                          |
| Database | PostgreSQL 16                                                |
| Shared   | TypeScript 5.7, shared types package                         |
| Monorepo | pnpm 11, Turborepo 2.9                                       |
| Quality  | ESLint 9/10, Prettier 3.8, Husky 9 + lint-staged 17          |

## Prerequisites

- **Node.js 24** — pinned via [Volta](https://volta.sh/) (`volta install node@24`)
- **pnpm 11** — `corepack enable && corepack prepare pnpm@11.1.3 --activate`
- **Docker** — for PostgreSQL

## Getting Started

```bash
# 1. Clone and install
git clone <repo-url>
cd ReactLearningApp
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your values (DATABASE_URL is pre-configured for Docker)

# 3. Start PostgreSQL
docker compose up -d

# 4. Run both apps in dev mode
pnpm dev
```

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:3001

## Project Structure

```
ReactLearningApp/
├── apps/
│   ├── api/                  # NestJS backend (port 3001)
│   │   ├── prisma/           # Prisma schema & migrations
│   │   ├── src/
│   │   │   ├── generated/    # Prisma client (gitignored)
│   │   │   ├── modules/      # DDD-aligned modules
│   │   │   │   ├── identity/
│   │   │   │   ├── transaction/
│   │   │   │   └── reporting/
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   └── prisma.config.ts  # Prisma ESM config
│   │
│   └── web/                  # Next.js frontend (port 3000)
│       └── src/app/          # App Router pages
│
├── packages/
│   └── shared/               # Shared types & enums
│       └── src/index.ts      # TransactionType enum, DTOs
│
├── docs/                     # Design & planning documents
│   ├── requirements.md
│   ├── ddd-analysis.md
│   ├── event-storming.md
│   ├── tech-stack.md
│   └── implementation-plan.md
│
├── docker-compose.yml        # PostgreSQL 16 for local dev
├── turbo.json                # Turborepo task pipelines
├── pnpm-workspace.yaml       # Workspace package definitions
└── .env.example              # Environment variable template
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

See [.env.example](.env.example) for all required variables. Key groups:

- **Database** — `DATABASE_URL` (PostgreSQL connection string)
- **JWT** — `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- **Google OAuth** — `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **NextAuth** — `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- **API** — `NEXT_PUBLIC_API_URL` (frontend → backend URL)

## Docker

```bash
docker compose up -d    # Start PostgreSQL
docker compose down     # Stop PostgreSQL
docker compose down -v  # Stop and delete data volume
```

PostgreSQL runs on port 5432 with credentials from `.env.example`.
