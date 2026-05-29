# @finance/api — NestJS Backend

The REST API backend for the Personal & Household Finance Manager, built with NestJS 11 and Prisma 7.

## Prerequisites

- Node.js 24 (via Volta)
- pnpm 11
- Docker (for PostgreSQL)

## Setup

```bash
# From repository root
docker compose up -d          # Start PostgreSQL
cd apps/api
pnpm install                  # Install dependencies (usually done from root)
pnpm exec prisma generate     # Generate Prisma client
pnpm exec prisma migrate dev  # Apply migrations
pnpm exec prisma db seed      # Seed dev data
```

## Development

```bash
pnpm dev          # Start in watch mode (port 3001)
pnpm build        # Production build
pnpm test         # Run unit tests
pnpm test:e2e     # Run E2E tests
```

## Database

| Command                                      | Description                             |
| -------------------------------------------- | --------------------------------------- |
| `pnpm exec prisma migrate dev --name <name>` | Create a new migration                  |
| `pnpm exec prisma migrate dev`               | Apply pending migrations                |
| `pnpm exec prisma generate`                  | Regenerate Prisma client                |
| `pnpm exec prisma db seed`                   | Run seed script                         |
| `pnpm exec prisma studio`                    | Open database browser (GUI)             |
| `pnpm exec prisma migrate reset`             | Reset database (drop + recreate + seed) |

## Project Structure

```
apps/api/
├── prisma/
│   ├── schema.prisma         # Database schema (8 models, 3 enums)
│   ├── seed.ts               # Dev seed data (user, household, 23 categories)
│   └── migrations/           # SQL migration files
├── prisma.config.ts          # Prisma CLI config (schema, seed, datasource)
├── src/
│   ├── generated/prisma/     # Generated Prisma client (gitignored)
│   ├── modules/
│   │   ├── identity/         # User, Household, Invitation, Auth
│   │   ├── transaction/      # Transaction, Category, Account
│   │   └── reporting/        # Dashboard, Reports, Export
│   ├── common/               # Guards, decorators, filters, pipes
│   ├── prisma/               # PrismaModule (global)
│   ├── app.module.ts
│   └── main.ts
└── test/                     # E2E tests
```

## Tech Stack

- **NestJS 11** — modular backend framework (DI, guards, CQRS)
- **Prisma 7** — type-safe ORM with driver adapter (`@prisma/adapter-pg`)
- **PostgreSQL 16** — relational database (via Docker)
- **TypeScript 5.7** — strict mode, `nodenext` module resolution
- **Jest** — unit and integration testing
