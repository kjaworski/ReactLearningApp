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

## ADR-4: Node.js 26 + pnpm 12, pinned per project with mise

**Decision:**

- Node.js **26.13.1** (current LTS), pinned in `mise.toml` at the repository root
- pnpm **12.21.0**, pinned with the `packageManager` field in the root `package.json`; `mise.toml` tells mise to read it from there (`idiomatic_version_file_enable_tools = ["pnpm"]`)

**Why:**

- [mise](https://mise.jdx.dev/) installs the pinned versions (`mise install`) and switches to them automatically inside the repo, on Windows, macOS, and Linux
- mise reads its configuration from the current folder upwards, so one `mise.toml` at the root covers every package
- Each version is written once: Node.js in `mise.toml`, pnpm in `packageManager` — which pnpm, Turborepo, and CI read as well
- pnpm also switches itself to the `packageManager` version and records it in `pnpm-lock.yaml` (`packageManagerDependencies`); no Corepack needed (it is no longer bundled with Node.js)
- The same file can pin the tools of later phases (Terraform, kubectl, Helm)

**Alternatives considered:**

- Volta — unmaintained; its README recommends mise. It also reads only the nearest `package.json`, so every package would need `"volta": { "extends": "../../package.json" }`
- pnpm installing Node.js itself (`devEngines.runtime`) — one tool fewer, but it covers only Node.js
- nvm-windows or fnm — Node.js only

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
- PostgreSQL 18 is the latest stable major (19 is still a release candidate) and is supported by the managed PostgreSQL services of both planned clouds (Amazon RDS, Azure Database for PostgreSQL flexible server)

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
- Today it skips when categories already exist, which can't repair a run that stopped halfway: the dev user is left behind, and the next run fails on its unique e-mail. B8 makes the seed idempotent and non-destructive (stable ids, upserts that only create missing rows, one transaction) and fail-closed (it runs only when `SEED_DEV_DATA` is exactly `true`, never in production)

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
- The column isn't the validation rule: four places hold every currency's minor units, but how many an amount may use comes from ISO 4217's minor units for its currency (JPY 0, PLN 2, BHD 3); `Intl.NumberFormat` only formats for display (ddd-analysis.md, Money precision). The MVP offers only two-decimal currencies; multi-currency (Phase 2) takes the precision from each currency instead of assuming 2

---

## ADR-15: Table naming convention (snake_case via @@map)

**Decision:** Use `@@map("snake_case_name")` on all models to map PascalCase Prisma model names to snake_case PostgreSQL table names.

**Why:**

- PostgreSQL convention is snake_case for table names
- Prisma convention is PascalCase for model names
- `@@map` keeps both worlds happy: `model UserHousehold` → table `user_households`
- Column names remain camelCase (Prisma default, quoted in PostgreSQL) — consistent with TypeScript property naming

---

# Architecture Decisions — Phase C

Technical decisions made while building the Identity & Access module (Phase C).

---

## ADR-16: Authentication — hand-built first, then Better Auth

**Decision:** Build a minimal register/login by hand first (Passport, `@nestjs/jwt`, Argon2id) as a learning exercise, then replace it with **Better Auth** running inside the NestJS API. NextAuth.js (Auth.js) is not used.

**Why:**

- Authentication is a _generic subdomain_ (DDD): every app needs it, it isn't what makes this app special, and mistakes are expensive — so production code uses a proven solution, and custom code goes into the core domain (finance)
- Building a small version first shows what an auth library does under the hood: password hashing, signed tokens, guards
- Better Auth is what the former NextAuth.js team recommends for new TypeScript projects; Auth.js (now maintained by Better Auth) only receives security fixes
- Better Auth keeps users and sessions in our own PostgreSQL (through Prisma): no external service, no per-user pricing
- Passwords are hashed with **Argon2id**, OWASP's first choice (bcrypt is recommended only for legacy systems)

**Consequences:**

- Better Auth needs four tables — user, session, account, verification. `user` is our `users` table, extended in place so every id stays, and new ids are UUIDs like the existing ones; `account` would collide with our financial `Account`, so it gets another name, such as `AuthAccount` (C7, schema compatibility checkpoint)
- Better Auth hashes passwords with scrypt by default; Argon2id is kept through its `emailAndPassword.password` option
- The NestJS integration (`@thallesp/nestjs-better-auth`) is community-maintained; the Better Auth core is not
- Sessions live in httpOnly cookies; the Next.js app uses the Better Auth client

**Alternatives considered:**

- Hand-built auth only — teaches the most, but every security-sensitive feature (Google sign-in, password reset, rate limiting) would be ours to get right
- NextAuth.js (Auth.js) — in maintenance mode
- Hosted identity providers (Auth0/Okta, Microsoft Entra ID, AWS Cognito, Clerk, self-hosted Keycloak) — the enterprise standard (the API validates their tokens with public keys from a JWKS endpoint), but an external dependency with per-user pricing beyond the free tiers

---

# Architecture Decisions — CI/CD and Infrastructure

Cross-cutting decisions about how the app is checked, built, and deployed. CI starts with Phase C; cloud deployment and infrastructure as code come post-MVP (tech-stack.md, Deployment).

---

## ADR-17: CI/CD on GitHub Actions

**Decision:** GitHub Actions checks every push to `main` and every pull request — format, lint, build, tests. Planned: the first workflow is step CI-1. Post-MVP, deployments run on GitHub Actions too and sign in to AWS and Azure with OpenID Connect (OIDC).

**Why:**

- The repository is on GitHub, so the results appear on commits and pull requests without a second system
- The repository is public: standard GitHub-hosted runners are free
- With OIDC, every workflow run gets a short-lived token that AWS (an IAM role) and Azure (a user-assigned managed identity with a federated credential) exchange for temporary access — no long-lived cloud keys are stored in GitHub
- Official actions exist for both clouds and both IaC tools: `aws-actions/configure-aws-credentials`, `azure/login`, `azure/bicep-deploy`, `hashicorp/setup-terraform`
- Azure Pipelines concepts map almost one to one (table in tech-stack.md)

**Key config:**

- CI only verifies: it runs check-only commands (`prettier --check`, ESLint without `--fix`) and reports the result; fixing happens locally (editor, pre-commit hook). It never commits — its read-only token couldn't push anyway
- The `GITHUB_TOKEN` gets `permissions: contents: read` by default; only deploy jobs add `id-token: write`, which OIDC needs
- Tool versions come from the repository, not from the workflow: `pnpm/action-setup` reads `packageManager`, and `actions/setup-node` reads Node.js from `mise.toml` (`node-version-file: mise.toml`, supported since setup-node v7.1.0)
- pnpm installs with a frozen lockfile automatically when it detects CI
- Third-party actions are locked to exact commits — a workflow dependency lockfile (`gh actions-lock`) or full-length commit SHAs — and Dependabot keeps them current
- Deployment secrets and approvals belong to GitHub environments, not to repository-wide secrets

**Security note:** the repository is public, so anyone can open a pull request. Workflows triggered by pull requests from forks get a read-only token and no secrets; `pull_request_target` must never be combined with checking out the pull request's code.

**Alternatives considered:**

- Azure Pipelines — known from work, but a second system next to GitHub; learning GitHub Actions is part of the goal
- AWS CodePipeline / CodeBuild — would tie the pipeline to one cloud while the app targets two

---

## ADR-18: Infrastructure as code — Terraform for AWS and AKS, Bicep for Azure

**Decision:** Every cloud environment is created from code (post-MVP):

- AWS → **Terraform**
- Azure managed services (Container Apps, PostgreSQL, Blob Storage, Key Vault, …) → **Bicep**, deployed as a deployment stack
- AKS → **Terraform** (`azurerm` and `azapi` providers) creates the cluster; the workloads are Kubernetes manifests that the pipeline applies

**Why:**

- Both tools are learning goals; each is used where it is strongest
- Bicep only targets Azure, so AWS needs Terraform — or a third tool (CloudFormation / CDK)
- Bicep on Azure: new resource types and API versions are available on day one, there is no state file (Azure Resource Manager knows what is deployed), `what-if` previews changes, and a deployment stack can delete resources that were removed from the template
- Terraform on AKS: the AKS step reuses a tool already learned on AWS, so its new material is Kubernetes — and Terraform shows how one tool spans two clouds
- The AKS environment needs some of the same Azure resources as the Bicep environment (PostgreSQL, Key Vault, container registry), so both tools are compared on identical resources

**Consequences:**

- Terraform keeps a state file that can contain secrets in plain text, so state lives only in a private remote backend — S3 for AWS, Azure Blob Storage for AKS (settings in tech-stack.md, Infrastructure as code) — created once by hand, before the first `terraform init`
- Bicep has no state to protect; the template stays the source of truth — changes made in the portal can be overwritten by the next deployment
- The cluster and its workloads are separate: Terraform's Kubernetes provider warns against creating a cluster and its Kubernetes resources in the same configuration
- `azapi`, a thin layer over the Azure REST API like Bicep, covers AKS features that `azurerm` doesn't support yet
- Pull requests show `terraform plan` / Bicep `what-if`; merges to `main` apply after approval in a GitHub environment
- Every environment can be destroyed and recreated from code, so it runs only while being worked on

**Alternatives considered:**

- Terraform for everything — one tool, but no Bicep
- Bicep for AKS as well — one tool per cloud, but Terraform would be used only once, and the comparison on the same cloud is lost
- AWS CloudFormation / CDK — AWS's own IaC, the counterpart of Bicep; a third tool to learn
- Pulumi — IaC written in TypeScript, the project's language; less widespread than Terraform
- OpenTofu — the open-source (MPL-2.0) fork of Terraform under the Linux Foundation, a drop-in replacement. Terraform's Business Source License doesn't restrict managing your own infrastructure, and switching later is cheap

---

## ADR-19: One image per app, one origin, routed by path

**Decision:** The web app and the API each ship as one container image, built once and run unchanged in every environment. The browser talks to a single origin; the platform in front routes `/api/*` to the API and everything else to the web app:

- AWS: ECS on Fargate for both containers, behind an Application Load Balancer with a path rule
- Azure: Container Apps for both containers, with rule-based routing in the Container Apps environment
- AKS: a Gateway API `HTTPRoute`
- Locally: a development-only rewrite in `next.config.ts` sends `/api/*` to the API

The API serves every route under the `/api` prefix (C2). The browser calls relative URLs (`/api/...`); server-side Next.js code reaches the API through `API_URL`, read at request time.

**Why:**

- `NEXT_PUBLIC_*` variables are baked in at build time: an API URL baked into the web image would tie it to one environment. With relative URLs, the image that was tested is the image that runs ("build once, deploy many")
- One origin means first-party session cookies and no CORS; Better Auth's default base path, `/api/auth`, already fits the prefix
- AWS Amplify Hosting supports Next.js only up to version 15, and it builds from source instead of running our image
- AWS and Azure are compared on identical artifacts — only the infrastructure differs

**Consequences:**

- The web app runs as a container on AWS and Azure (ECS, Container Apps); Next.js builds with `output: 'standalone'` for a small image
- The Application Load Balancer costs a fixed hourly fee, one more reason to destroy environments when they aren't used (ADR-18)
- `BETTER_AUTH_URL` is the public origin of each environment (locally `http://localhost:3000`), set at runtime on the API. Because it's fixed, Better Auth never builds URLs from forwarded `Host` or protocol headers (`advanced.trustedProxyHeaders` stays off). No extra trusted origins are needed; Google's redirect URI is `<origin>/api/auth/callback/google`
- Session cookies stay host-only (no `Domain` attribute; `crossSubDomainCookies` stays off) and `httpOnly`; Better Auth makes them `Secure` in production (`NODE_ENV=production` in the API image)
- Only the router is public: on AWS, security groups let the containers accept traffic only from the load balancer; on Azure, both apps use internal ingress and only the environment's route configuration is public. A route can expose any app in its environment and needs only a permission on the environment (`httpRouteConfigs/write`, part of Contributor), so only the deployment identity gets that role
- The Azure route for `/api` comes before the catch-all and has no `prefixRewrite` — the API expects the prefix
- Behind a load balancer the client IP arrives in `X-Forwarded-For`, which load balancers append to: rate limiting must trust only the entries added by our own proxies (Better Auth `trustedProxies`) — safe only because nobody can reach the containers around the router. With more than one API container, rate-limit counters move from memory to the database (`rateLimit.storage`)
- Health checks: the ALB target group (ECS also replaces tasks that fail it) and the Container Apps liveness probe use a path that doesn't query the database, so a database outage doesn't restart every API container; `GET /api/health`, which checks the database, is the readiness check — the same split as on Kubernetes
- Server-side code that reads `API_URL` must render dynamically (for example `await connection()`), or Next.js would freeze the value at build time

**Alternatives considered:**

- One web build per environment (`NEXT_PUBLIC_API_URL`) — a different artifact per cloud; what was tested isn't what runs
- A separate API origin (`api.example.com`) — needs CORS with credentials and cross-subdomain cookie settings
- Next.js forwarding every API call (rewrites or route handlers in production) — an extra hop and more code for every request
- Amplify Hosting (AWS) and App Service (Azure) for the frontend — Amplify doesn't support Next.js 16; App Service would need Azure Front Door or Application Gateway in front to share one origin with the API
