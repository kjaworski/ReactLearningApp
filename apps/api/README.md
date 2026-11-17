# @finance/api — NestJS Backend

The REST API backend for the Personal & Household Finance Manager, built with NestJS 12 (native ESM) and Prisma 7.

## Prerequisites

- Node.js 26 and pnpm 12 — installed by `mise install` (root `mise.toml` and `packageManager`)
- Docker (for PostgreSQL 18)

## Setup

```bash
# From repository root
docker compose up -d          # Start PostgreSQL
cd apps/api
cp .env.example .env          # Then set JWT_SECRET and SEED_DEV_DATA="true"
pnpm install                  # Install dependencies (usually done from root)
pnpm exec prisma generate     # Generate Prisma client
pnpm exec prisma migrate dev  # Apply migrations
pnpm exec prisma db seed      # Seed dev data
```

## Development

```bash
pnpm dev          # Start in watch mode (port 3001)
pnpm build        # Production build
pnpm test         # Run unit tests (Vitest)
pnpm test:e2e     # Run E2E tests (Vitest + Supertest) — the scaffold test fails until C3 replaces it
pnpm lint         # Check with ESLint (changes nothing — CI will run the same)
pnpm lint:fix     # Fix what ESLint can fix
```

## Database

| Command                                      | Description                                                                      |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm exec prisma migrate dev --name <name>` | Create a new migration                                                           |
| `pnpm exec prisma migrate dev`               | Apply pending migrations                                                         |
| `pnpm exec prisma migrate deploy`            | Apply migrations only (fresh DB, CI)                                             |
| `pnpm exec prisma generate`                  | Regenerate Prisma client                                                         |
| `pnpm exec prisma db seed`                   | Run seed script                                                                  |
| `pnpm exec prisma studio`                    | Open database browser (GUI)                                                      |
| `pnpm exec prisma migrate reset`             | Reset database (drop + recreate; Prisma 7 no longer seeds — run `db seed` after) |

## Project Structure

```
apps/api/
├── .env.example              # Settings template (DATABASE_URL, JWT_*, SEED_DEV_DATA) — copy to .env
├── prisma/
│   ├── schema.prisma         # Database schema (8 models, 3 enums)
│   ├── seed.ts               # Dev seed data (user, household, account, 23 categories)
│   └── migrations/           # SQL migration files
├── prisma.config.ts          # Prisma CLI config (schema, seed, datasource)
├── vitest.config.ts          # Unit tests (*.spec.ts)
├── vitest.config.e2e.ts      # E2E tests (*.e2e-spec.ts)
├── src/
│   ├── generated/prisma/     # Generated Prisma client (gitignored)
│   ├── modules/              # Built in Phases C–E:
│   │   ├── identity/         #   User, Household, Invitation, Auth
│   │   ├── transaction/      #   Transaction, Category, Account
│   │   └── reporting/        #   Dashboard, Reports, Export
│   ├── common/               # Guards, decorators, filters — from Phase C
│   ├── prisma/               # PrismaModule + PrismaService — from C2
│   ├── app.module.ts
│   └── main.ts
└── test/                     # E2E tests
```

## Tech Stack

- **NestJS 12** — modular backend framework (DI, guards, CQRS)
- **Prisma 7** — type-safe ORM with driver adapter (`@prisma/adapter-pg`)
- **PostgreSQL 18** — relational database (via Docker)
- **TypeScript 6.0** — strict mode, native ESM (`"type": "module"` + `nodenext`): relative imports end in `.js`, e.g. `import { AppModule } from './app.module.js'`
- **Vitest 5** — unit and E2E testing (Jest-compatible API)
