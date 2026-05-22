# Architecture Decisions — Phase A

Technical decisions made during project scaffolding (Phase A). Each entry captures _what_ was decided, _why_, and relevant alternatives considered.

---

## ADR-1: Monorepo with pnpm + Turborepo

**Decision:** Use pnpm workspaces for package management and Turborepo for build orchestration.

**Why:**

- pnpm's `workspace:*` protocol enables type-safe cross-package imports without publishing
- Turborepo caches build outputs and runs tasks in dependency order (`^build` syntax)
- Single `pnpm dev` starts both frontend and backend concurrently
- Single lockfile, single `node_modules` root (strict hoisting prevents phantom deps)

**Alternatives considered:**

- npm workspaces — no built-in task orchestration, slower installs
- Nx — more powerful but heavier; overkill for 3 packages
- Separate repos — loses type sharing and atomic commits

---

## ADR-2: TypeScript 5.7 (not 6.0)

**Decision:** Pin all packages to TypeScript ^5.7.3.

**Why:**

- TS 6.0 removed auto-discovery of `@types/*` packages (requires explicit `types: []` in tsconfig)
- TS 6.0 deprecated `experimentalDecorators`, which NestJS relies on heavily
- Prisma confirmed TS 6.0 compatibility issues ([prisma#29449](https://github.com/prisma/prisma/issues/29449))
- TS 5.7.3 is stable and fully supported by all dependencies

**Revisit when:** NestJS and Prisma officially support TS 6.x.

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
- Generated client: `apps/api/src/generated/prisma/`
- Config: `apps/api/prisma.config.ts`

---

## ADR-4: Node.js 24 via Volta

**Decision:** Pin Node.js 24 (LTS "Krypton") using Volta in `package.json`.

**Why:**

- Volta pins the exact Node version per-project (like `.nvmrc` but cross-platform)
- Automatically switches Node version when entering the project directory
- Node 24 is the current LTS with the latest ESM and performance improvements
- Pin declared in root `package.json` under `"volta": { "node": "24.16.0" }`

---

## ADR-5: ESLint flat config with type-checked rules

**Decision:** Use ESLint flat config (array exports in `eslint.config.mjs`) with `typescript-eslint` recommended type-checked rules.

**Why:**

- ESLint flat config is the current standard (legacy `.eslintrc` deprecated)
- Type-checked rules catch real bugs (unused variables, floating promises, unsafe `any`)
- Prettier integration via `eslint-plugin-prettier` to report formatting as lint errors
- Per-package configs allow workspace-specific rules (e.g., NestJS decorators in API, React rules in web)

**Config structure:**

- Root: ESLint 10 (devDependency for lint-staged)
- `apps/api`: ESLint 9 + `@typescript-eslint` + Prettier
- `apps/web`: ESLint 9 + `eslint-config-next` + Prettier
- `packages/shared`: ESLint 10 + `typescript-eslint` + Prettier

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
- `dev` is `persistent: true`, `cache: false` (long-running dev servers, always fresh)
- `lint` depends on `^build` (type-checked ESLint rules need compiled types)
- `test` depends on `^build` (tests may import from built packages)

---

## ADR-9: Docker Compose for local database

**Decision:** PostgreSQL 16 via Docker Compose with a named volume for data persistence.

**Why:**

- No need to install PostgreSQL locally
- Consistent environment across machines
- `restart: unless-stopped` keeps it running across Docker restarts
- Named volume `pgdata` survives `docker compose down` (only `down -v` deletes it)

**Connection:** `postgresql://finance:finance_dev@localhost:5432/finance_db`
