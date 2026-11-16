# Architecture Decisions — Phase A

Technical decisions made during project scaffolding (Phase A). Each entry captures _what_ was decided, _why_, and relevant alternatives considered.

---

## ADR-1: Monorepo with pnpm + Turborepo

**Decision:** Use pnpm workspaces for package management and Turborepo for build orchestration.

**Why:**

- pnpm's `workspace:*` protocol enables type-safe cross-package imports without publishing
- Turborepo caches build outputs and runs tasks in dependency order (`^build` syntax)
- Single `pnpm dev` starts both frontend and backend concurrently
- Single lockfile; pnpm's strict `node_modules` layout prevents phantom dependencies (importing a package you never declared)

**Alternatives considered:**

- npm workspaces — no built-in task orchestration, slower installs
- Nx — more powerful but heavier; overkill for 3 packages
- Separate repos — loses type sharing and atomic commits

---

## ADR-2: TypeScript 6.0 (not 7.0)

**Decision:** Use TypeScript ^6.0.3 in every package.

**Why:**

- TypeScript 7.0 (the native Go port) ships without the compiler API until 7.1 — typescript-eslint, the Nest CLI build, and Next.js type-checking all depend on it
- NestJS 12 requires TypeScript 6 (peer dependency of `@nestjs/schematics`)
- NestJS decorators (`experimentalDecorators` + `emitDecoratorMetadata`) are fully supported

**TS 6 defaults that need explicit config:**

- `types` defaults to `[]` (no automatic `@types/*` discovery) — `apps/api/tsconfig.json` lists `["vitest/globals", "node"]`
- `rootDir` defaults to the folder containing the tsconfig — `apps/api/tsconfig.build.json` sets `rootDir: "./src"` and `include: ["src"]`, so the build emits `dist/main.js`

**Revisit when:** TypeScript 7.1+ is stable and typescript-eslint, NestJS, and Next.js support it.

---

## ADR-3: Prisma 7 ESM-first approach

**Decision:** Use Prisma 7's new `prisma-client` generator with `prisma.config.ts` configuration file.

**Why:**

- Prisma 7 introduced a new ESM-native generator (`prisma-client` instead of `prisma-client-js`)
- Configuration moved from `schema.prisma` to `prisma.config.ts` for type-safe config
- Client output directed to `src/generated/prisma` (gitignored) — keeps generated code out of source control
- `dotenv/config` imported in `prisma.config.ts` for environment variable loading

**Key config:**

- Schema: `apps/api/prisma/schema.prisma`
- Generator: `prisma-client` with `moduleFormat = "esm"` (matches the ESM backend — ADR-10)
- Generated client: `apps/api/src/generated/prisma/`
- Config: `apps/api/prisma.config.ts`
- Versions: Prisma 7.10 (8.0 is still a release candidate); `prisma`, `@prisma/client`, and `@prisma/adapter-pg` must always be on the same version

---

## ADR-4: Node.js 26 + pnpm 12, pinned per project

**Decision:**

- Node.js **26.13.1** (current LTS), pinned with Volta in the root `package.json`; every workspace package inherits it with `"volta": { "extends": "../../package.json" }`
- pnpm **12.21.0**, pinned with the `packageManager` field in the root `package.json`

**Why:**

- Volta pins the exact Node version per project (like `.nvmrc`, but cross-platform) and switches to it automatically inside the repo
- Volta reads only the **nearest** `package.json` — without `extends`, scripts running inside `apps/*` and `packages/*` would use Volta's default Node instead of the pinned one
- pnpm switches itself to the `packageManager` version and records it in `pnpm-lock.yaml` (`packageManagerDependencies`); no Corepack needed (it is no longer bundled with Node.js)
- On Windows, a global pnpm 11 older than 11.28.4 can't switch to pnpm 12 ([pnpm#16594](https://github.com/pnpm/pnpm/issues/16594)) — update it first

**Revisit:** Volta is no longer maintained and recommends [mise](https://mise.jdx.dev/) — one `mise.toml` at the root would cover every package without `extends`.

---

## ADR-5: ESLint flat config with type-checked rules

**Decision:** Use ESLint 10 everywhere, with flat config (`eslint.config.mjs` in each package) and `typescript-eslint` type-checked rules.

**Why:**

- Flat config is the only format ESLint 10 supports (legacy `.eslintrc` is gone; ESLint 9 is end-of-life)
- Type-checked rules catch real bugs (unused variables, floating promises, unsafe `any`)
- Prettier integration via `eslint-plugin-prettier` to report formatting as lint errors
- Per-package configs allow workspace-specific rules (e.g., NestJS decorators in API, React rules in web)
- ESLint 10 looks up the config from each linted file's folder, so the root ESLint (used by lint-staged) applies each package's own config

**Config structure:**

- Root: ESLint 10 (devDependency for lint-staged, no config of its own)
- `apps/api`: `typescript-eslint` type-checked rules + Prettier
- `apps/web`: `eslint-config-next` + Prettier, wrapped with `fixupConfigRules` from `@eslint/compat` — `eslint-plugin-react` (inside `eslint-config-next`) still calls context methods that ESLint 10 removed. Both arrays are wrapped in one call (`...fixupConfigRules([...nextVitals, ...nextTs])`) so shared plugins keep a single identity ("Cannot redefine plugin" otherwise)
- `packages/shared`: `typescript-eslint` recommended rules + Prettier
- Every package sets `languageOptions.parserOptions.tsconfigRootDir: import.meta.dirname` — needed when one ESLint run lints files from several packages (e.g. a commit touching several packages); `apps/web` also sets `settings.next.rootDir: import.meta.dirname` so the `@next/next` rules don't look for `pages/` in the repo root

**Revisit when:** `eslint-plugin-react` supports ESLint 10 natively — then remove `@eslint/compat`.

---

## ADR-6: Prettier at root only

**Decision:** Single `.prettierrc` at the repository root, no per-package overrides.

**Why:**

- Consistent formatting across all packages
- Less config to maintain
- Husky/lint-staged runs Prettier from root, so root config is always picked up

**Settings:** `singleQuote: true`, `trailingComma: "all"`, `semi: true`, `printWidth: 80`, `tabWidth: 2`, `endOfLine: "auto"`

---

## ADR-7: Husky + lint-staged for pre-commit quality

**Decision:** Husky 9 runs lint-staged on every commit; lint-staged runs ESLint --fix and Prettier --write on staged files.

**Why:**

- Catches lint/format issues before they enter the repo
- Only processes staged files (fast, even in a large monorepo)
- `.husky/pre-commit` runs `pnpm exec lint-staged`

**Pipeline:** `*.{ts,tsx}` → ESLint --fix, `*.{ts,tsx,json,md}` → Prettier --write

---

## ADR-8: Turborepo task pipelines

**Decision:** Four tasks configured: `build`, `dev`, `lint`, `test`.

**Why:**

- `build` depends on `^build` (builds dependencies first: shared → api/web), caches `dist/**` and `.next/**`
- `build` also hashes each app's `.env*` files (`inputs`), so a changed value can't restore a stale cached build
- `dev` is `persistent: true`, `cache: false` (long-running dev servers, always fresh)
- `lint` depends on `^build` (type-checked ESLint rules need compiled types)
- `test` depends on `^build` (tests may import from built packages)

**Environment files:** each app keeps its own `.env` (gitignored) next to a committed `.env.example`; there is no root `.env`. This is Turborepo's recommendation — every app gets only the variables it needs, like its runtime environment in production.

---

## ADR-9: PostgreSQL 18 via Docker Compose

**Decision:** Run PostgreSQL 18 (`postgres:18` image) locally via Docker Compose, with a named volume for data persistence.

**Why:**

- No need to install PostgreSQL locally
- Consistent environment across machines
- `restart: unless-stopped` keeps it running across Docker restarts
- Named volume `pgdata` survives `docker compose down` (only `down -v` deletes it)
- PostgreSQL 18 is the latest stable major (19 is still a release candidate) and is supported by AWS RDS, the planned production database

**Key config:** the volume is mounted at `/var/lib/postgresql`, not `/var/lib/postgresql/data` — since version 18 the image stores data in a version-specific subfolder (`/var/lib/postgresql/18/docker`), which makes future major upgrades with `pg_upgrade` easier.

**Connection:** `postgresql://finance:finance_dev@localhost:5432/finance_db`

---

## ADR-10: Native ESM for `apps/api`

**Decision:** `apps/api` runs as native ES modules: `"type": "module"` in its `package.json`, with `module: "nodenext"` in `tsconfig.json` (under `nodenext`, that `"type"` field is what makes TypeScript emit ES modules instead of CommonJS).

**Why:**

- New NestJS 12 projects are ESM by default, and the NestJS 12 packages are ESM-only
- Prisma 7's generated client is ESM-first (ADR-3)
- One module system for the app, the seed script, and the tests

**Consequences:**

- Every relative import ends in `.js` — e.g. `import { AppModule } from './app.module.js'`. Node.js loads the compiled `.js` file; TypeScript maps the name back to `app.module.ts`
- Use `import.meta.dirname` instead of `__dirname`; top-level `await` is allowed

**Alternatives considered:**

- CommonJS — would need Prisma's `moduleFormat = "cjs"` and goes against the NestJS 12 and Prisma 7 defaults

---

## ADR-11: Vitest for backend tests

**Decision:** `apps/api` runs its unit and e2e tests on Vitest 5; HTTP e2e tests use Supertest. Browser E2E tests are planned with Playwright (Phase G).

**Why:**

- Default test runner of new NestJS 12 projects
- Runs TypeScript and ESM natively — no ts-jest or transform setup
- Jest-compatible API (`describe`, `it`, `expect`); mocks use `vi.fn()` instead of `jest.fn()`
- Vite 8 (Oxc) emits decorator metadata for constructor parameters, so Nest dependency injection works in tests without an SWC plugin

**Key config:**

- `vitest.config.ts` — unit tests `**/*.spec.ts` (`pnpm test`, `pnpm test:watch`, `pnpm test:cov`)
- `vitest.config.e2e.ts` — e2e tests `**/*.e2e-spec.ts` (`pnpm test:e2e`)
- `globals: true`, plus `vitest/globals` in the tsconfig `types` and `globals.vitest` in ESLint

**Alternatives considered:**

- Jest — CommonJS-first; an ESM codebase needs ts-jest plus Node's experimental VM-modules flag

**Gotcha:** the Prisma 7 client constructor returns a Proxy, so `prisma instanceof PrismaService` is `false`. In tests, compare instances (e.g. with `moduleRef.get(PrismaService)`) instead of using `toBeInstanceOf`.

---

# Architecture Decisions — Phase B

Technical decisions made during database schema implementation (Phase B).

---

## ADR-12: Prisma 7 driver adapter (required)

**Decision:** Use `@prisma/adapter-pg` with the `pg` library for all Prisma database connections.

**Why:**

- Prisma 7 removed the built-in query engine; a driver adapter is now **mandatory**
- `PrismaClient` requires an `adapter` option: `new PrismaClient({ adapter })`
- The adapter wraps a `pg.Pool` instance, giving direct control over connection pooling
- This applies to both application code (`PrismaModule`) and the seed script

**Dependencies added:** `@prisma/adapter-pg`, `pg`, `@types/pg`

**Pattern:**

```typescript
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

---

## ADR-13: Prisma seed via tsx

**Decision:** Run the seed script (`prisma/seed.ts`) with `tsx`.

**Why:**

- The seed lives outside `src/`, so it isn't part of the Nest build — `tsx` runs the TypeScript file directly (ESM imports included, ADR-10) without a compile step
- The seed command is configured in `prisma.config.ts` under `migrations.seed`
- The seed is idempotent: it skips when categories already exist

**Seed execution:** `pnpm exec prisma db seed` → runs `tsx prisma/seed.ts`

---

## ADR-14: Decimal(19,4) for financial amounts

**Decision:** Use `Decimal @db.Decimal(19,4)` for all monetary fields (`initialBalance`, `amount` in Transaction and TransactionSplit).

**Why:**

- `Float` (IEEE 754) causes rounding errors with financial calculations (e.g., `0.1 + 0.2 ≠ 0.3`)
- `Decimal(19,4)` stores exact values — 19 total digits, 4 decimal places
- Supports amounts up to ~999,999,999,999,999.9999 (sufficient for household finance)
- PostgreSQL's `numeric` type handles this natively with no precision loss
- Prisma maps `Decimal` to JavaScript's `Decimal.js` instances

---

## ADR-15: Table naming convention (snake_case via @@map)

**Decision:** Use `@@map("snake_case_name")` on all models to map PascalCase Prisma model names to snake_case PostgreSQL table names.

**Why:**

- PostgreSQL convention is snake_case for table names
- Prisma convention is PascalCase for model names
- `@@map` keeps both worlds happy: `model UserHousehold` → table `user_households`
- Column names remain camelCase (Prisma default, quoted in PostgreSQL) — consistent with TypeScript property naming
