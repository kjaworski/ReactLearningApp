# Tech Stack – Personal & Household Finance Manager

> **Decision date:** May 2026
> **Context:** Solo developer (.NET backend senior, frontend junior), building a DDD-based household finance app for learning + portfolio. Goal: full-stack job readiness, including cloud, software architecture, security, and AI.

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

**Architecture style:**

- **Modular monolith** — one API, deployed as a unit; each bounded context is a NestJS module (Module Structure below), all sharing one PostgreSQL database
- **Domain-Driven Design** — aggregates enforce the business rules, e.g. splits must add up to the transaction total (ddd-analysis.md)
- **CQRS** — separate command and query handlers in each module (`@nestjs/cqrs`); MVP queries calculate totals on the fly (HS-14)
- **Domain events** — modules react to each other's events on an in-memory event bus. That works for one API instance; several instances need an external broker, for example fed from an outbox table so no event is lost
- **Ports and adapters** — cloud-specific code (file storage, e-mail) sits behind small interfaces with one adapter per cloud (HS-26)

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

| Category           | Choice                                                | Why                                                                                                                                                                                                                                                                                                                       |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**      | **NestJS 12** (latest stable)                         | Modular architecture maps 1:1 to bounded contexts. Built-in DI, CQRS module, guards (like .NET `[Authorize]`), pipes (like .NET model validation). Feels like ASP.NET Core.                                                                                                                                               |
| **Language**       | **TypeScript**                                        | Shared types with frontend                                                                                                                                                                                                                                                                                                |
| **Database**       | **PostgreSQL 18**                                     | Relational integrity for financial data. JSONB for semi-structured data (OCR results, bank imports, promotion rules). Industry standard for fintech.                                                                                                                                                                      |
| **ORM**            | **Prisma 7**                                          | Type-safe auto-generated client, declarative schema, easy migrations, great DX. Most popular TypeScript ORM. V7 requires a driver adapter (`@prisma/adapter-pg`).                                                                                                                                                         |
| **Auth (backend)** | **Better Auth** (after a hand-built learning version) | Phase C first builds register/login by hand (Passport, `@nestjs/jwt`, Argon2id) to learn how auth works, then switches to Better Auth: sessions in httpOnly cookies, Google sign-in, rate limiting, users in our PostgreSQL via Prisma (architecture.md ADR-16).                                                          |
| **Validation**     | **class-validator + class-transformer**               | Decorator-based DTO validation (like .NET `[Required]`, `[MaxLength]`). NestJS pipes auto-validate.                                                                                                                                                                                                                       |
| **CQRS**           | **@nestjs/cqrs**                                      | Separate command/query handlers per bounded context. Events bus for cross-context communication. **Note:** the event bus is in-memory — works for a single instance. For multi-instance deployment (several API containers), add an external event bus later (e.g., Redis pub/sub, Amazon SNS/SQS, or Azure Service Bus). |
| **API style**      | **REST**                                              | Standard for job market. OpenAPI/Swagger via `@nestjs/swagger` for auto-generated docs.                                                                                                                                                                                                                                   |
| **Report export**  | **pdfmake** (PDF) + **csv-stringify** (CSV)           | Reports are generated on the server and streamed as file downloads: one source of truth for the numbers, household scoping enforced by the API, works for long date ranges, and reusable later for e-mailed reports. pdfmake builds paginated tables without a headless browser.                                          |
| **Logging**        | **Pino** (via `nestjs-pino`)                          | Structured JSON logging, fast, production-ready                                                                                                                                                                                                                                                                           |

### Shared — `packages/shared/`

| Category               | Choice                      | Why                                                                           |
| ---------------------- | --------------------------- | ----------------------------------------------------------------------------- |
| **Shared types**       | TypeScript interfaces/enums | DTOs, TransactionType, BudgetStatus, etc. — used by both frontend and backend |
| **Validation schemas** | **Zod**                     | Shared validation schemas (frontend forms + backend API validation)           |

> ⚠️ **Validation note:** Backend uses `class-validator` decorators on NestJS DTOs while `packages/shared/` uses Zod schemas for frontend forms. This means validation rules are defined in two systems. To mitigate: define canonical Zod schemas in `shared/`, and either (a) use `nestjs-zod` on the backend to replace class-validator, or (b) auto-generate one from the other. Decide during implementation.

### Infrastructure & Tooling

| Category                   | Choice                                             | Why                                                                                                                                            |
| -------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Monorepo**               | **pnpm + Turborepo**                               | pnpm = fast, strict, saves disk space. Turborepo = smart build caching, parallel tasks. Industry standard for Next.js monorepos.               |
| **Testing**                | **Vitest** (unit/API tests) + **Playwright** (E2E) | Vitest is the NestJS 12 default (native TS + ESM, Jest-like API). Playwright is modern E2E (cross-browser, auto-waiting).                      |
| **Linting**                | **ESLint + Prettier**                              | Code quality + consistent formatting                                                                                                           |
| **Git hooks**              | **Husky + lint-staged**                            | Pre-commit linting/formatting                                                                                                                  |
| **API docs**               | **Swagger (OpenAPI)** via `@nestjs/swagger`        | Auto-generated API documentation from decorators                                                                                               |
| **Containerization**       | **Docker + Docker Compose**                        | Local PostgreSQL via Docker Compose; container images for deployment (post-MVP)                                                                |
| **CI/CD**                  | **GitHub Actions**                                 | Checks every push and pull request; later deploys to AWS and Azure, signing in with OIDC instead of stored cloud keys (architecture.md ADR-17) |
| **Infrastructure as code** | **Terraform** (AWS, AKS) + **Bicep** (Azure)       | Every cloud environment is created from code — post-MVP (Infrastructure as code below, architecture.md ADR-18)                                 |

### Continuous integration — GitHub Actions

GitHub Actions runs the checks a developer runs before pushing — `pnpm format:check`, `pnpm lint`, `pnpm build`, `pnpm test` — on every push to `main` and on every pull request. It only checks and reports; fixing happens locally (editor, pre-commit hook). The workflow grows with the app: e2e tests against a PostgreSQL service container, Docker image builds, then deployments (implementation-plan.md, Continuous Integration).

**Azure Pipelines → GitHub Actions** (quick reference):

| Azure Pipelines                                   | GitHub Actions                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| `azure-pipelines.yml`                             | `.github/workflows/*.yml` — one file per workflow                              |
| `trigger` / `pr`                                  | `on: push` / `on: pull_request`                                                |
| `pool: vmImage`                                   | `runs-on`                                                                      |
| Stage                                             | Job chained with `needs` (often with an `environment`), or a separate workflow |
| `dependsOn` / `condition`                         | `needs` / `if`                                                                 |
| Task (`task: UseNode@1`)                          | Action (`uses: actions/setup-node`)                                            |
| `script`, `bash`, `pwsh`                          | `run`, with `shell`                                                            |
| Variable groups (Library)                         | Repository or environment variables and secrets                                |
| Service connection (workload identity federation) | OIDC sign-in with `azure/login` or `aws-actions/configure-aws-credentials`     |
| Environment with approvals and checks             | Environment with protection rules (required reviewers)                         |
| Templates                                         | Reusable workflows, composite actions                                          |
| `System.AccessToken`                              | `GITHUB_TOKEN`, limited with `permissions`                                     |

### Security baseline

> What every phase builds on. OWASP ASVS 5.0 is the checklist for the Phase G review; the security topics of each phase are in implementation-plan.md (Learning focus).

| Area                 | Choice                                                                                                                                                                 | Why                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Passwords**        | Argon2id in the learning version, then Better Auth                                                                                                                     | OWASP's first choice for password hashing (architecture.md ADR-16)                                                                        |
| **Sessions**         | httpOnly, Secure, SameSite cookies                                                                                                                                     | JavaScript can't read the session; SameSite cookies and Better Auth's trusted origins block CSRF                                          |
| **Authorization**    | Every household-scoped request checks membership (`HouseholdGuard`, C8)                                                                                                | Broken object-level authorization is the #1 risk in the OWASP API Security Top 10: a valid session must not open another household's data |
| **Input and output** | DTO validation that rejects unknown fields; Prisma's parameterized queries; React's escaping; CSV-injection escaping in exports                                        | Injection, mass assignment, XSS                                                                                                           |
| **HTTP**             | Security headers (Helmet), CORS limited to the web app's origin, rate limiting on sign-in                                                                              | A smaller attack surface; password guessing is slowed down                                                                                |
| **Secrets**          | `.env` files locally (gitignored); Secrets Manager / Key Vault in the cloud; OIDC in CI                                                                                | No secrets in Git or in CI settings                                                                                                       |
| **Supply chain**     | Lockfile with frozen installs; dependency build scripts run only for packages listed in `allowBuilds`; Dependabot alerts; CodeQL; secret scanning with push protection | Vulnerable or malicious dependencies and leaked secrets are caught early; the GitHub features are free for public repositories            |
| **Personal data**    | Collect only what the features need; TLS everywhere; encryption at rest in the managed database and storage                                                            | Financial data is personal data (GDPR)                                                                                                    |

### Deployment — AWS, Azure, then AKS (post-MVP)

> Both clouds are deployment targets and learning goals: the same app is deployed to AWS first, then to Azure, to compare the platforms, and finally to Kubernetes on AKS. The goal is to understand both ecosystems, not to run one production system across two clouds. The app itself stays cloud-neutral — containers, configuration from environment variables, PostgreSQL — and provider-specific code is limited to small adapters for file storage and e-mail. Every environment is created from code, so it can be destroyed when it isn't needed and recreated later.

**Learning path:**

1. Docker — container images for the API and the web app; CI builds them
2. AWS — managed services (table below), created with Terraform; GitHub Actions deploys the API, Amplify builds the frontend from the repository itself
3. Azure — the same app on Azure's managed services, created with Bicep and deployed by GitHub Actions
4. Compare the platforms — architecture, identity, networking, security, observability, CI/CD, scalability, reliability, cost — and the two IaC tools
5. Kubernetes — fundamentals on a local cluster first, then AKS (Azure Kubernetes Service), only after the managed container platforms above are understood (Kubernetes section below). The app doesn't change for this: it already runs as containers configured through environment variables.

| Component                  | AWS                                | Azure                                                                 | Notes                                                                                                                                                                                                                                                                       |
| -------------------------- | ---------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js frontend**       | **Amplify Hosting**                | **App Service** (Linux, Node.js)                                      | Managed hosting with server-side rendering. Amplify builds and deploys from the GitHub repository itself (it doesn't accept a pre-built server-rendered app); App Service is deployed from GitHub Actions. Azure Static Web Apps' full Next.js support is still in preview. |
| **NestJS backend**         | **ECS on Fargate**                 | **Container Apps**                                                    | Containers without managing servers, with autoscaling; suits long-running work such as bank imports                                                                                                                                                                         |
| **Container images**       | **ECR**                            | **Container Registry**                                                | Private registry for the app images                                                                                                                                                                                                                                         |
| **Database**               | **RDS for PostgreSQL**             | **Database for PostgreSQL** (flexible server)                         | Managed PostgreSQL 18 on both, automated backups, high availability for production                                                                                                                                                                                          |
| **File storage**           | **S3**                             | **Blob Storage**                                                      | Receipt photos/scans in private storage; the browser uploads and downloads them with short-lived signed URLs (S3 presigned URLs / Blob SAS) (HS-26)                                                                                                                         |
| **Secrets**                | **Secrets Manager**                | **Key Vault**                                                         | Database credentials, API keys, OAuth secrets — passed to the app as environment variables                                                                                                                                                                                  |
| **Scheduled jobs**         | **EventBridge Scheduler**          | **Container Apps jobs**                                               | Cron triggers for the daily exchange-rate sync and subscription reminders                                                                                                                                                                                                   |
| **Database migrations**    | **ECS task**, run once per release | **Container Apps job**, run once per release                          | `prisma migrate deploy` runs before the new API version starts — not inside the API at startup                                                                                                                                                                              |
| **Email**                  | Not decided yet                    | Not decided yet                                                       | Chosen when e-mail sending is built; invitation e-mails are only logged until then                                                                                                                                                                                          |
| **Logs & metrics**         | **CloudWatch**                     | **Azure Monitor** (Log Analytics, Application Insights)               | Pino writes JSON logs to stdout, which both platforms collect                                                                                                                                                                                                               |
| **Infrastructure as code** | **Terraform**                      | **Bicep**                                                             | Infrastructure as code below                                                                                                                                                                                                                                                |
| **CI/CD sign-in**          | **IAM role** trusted through OIDC  | **User-assigned managed identity** with a federated credential (OIDC) | GitHub Actions gets short-lived credentials; no cloud keys are stored in GitHub (architecture.md ADR-17)                                                                                                                                                                    |

### Infrastructure as code (post-MVP)

> Both IaC tools are learning goals, and each is used where it fits best (architecture.md ADR-18).

| Target                                                                                                          | Tool                                            | State                                                                                                                   | Why this tool here                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AWS**                                                                                                         | **Terraform** (AWS provider)                    | S3 bucket — versioned, encrypted, locked with `use_lockfile`                                                            | Bicep can't target AWS; what is learned here is reused for AKS                                                                                                                                  |
| **Azure** — App Service, Container Apps, PostgreSQL, Blob Storage, Key Vault, Container Registry, Azure Monitor | **Bicep**, deployed as a deployment stack       | No state file — Azure Resource Manager knows what is deployed; the stack can delete resources removed from the template | Azure-native: new Azure features on day one, `what-if` previews, no state to protect                                                                                                            |
| **AKS** — the cluster and the Azure resources it needs                                                          | **Terraform** (`azurerm` and `azapi` providers) | Azure Blob Storage — Microsoft Entra ID sign-in, locked with a blob lease                                               | The tool is already known from AWS, so this step is about Kubernetes; the resources it shares with the Azure environment (PostgreSQL, Key Vault, registry) compare both tools on the same thing |

- **Folders** — `infra/aws/` (Terraform), `infra/azure/` (Bicep), `infra/aks/` (Terraform), `deploy/k8s/` (Kubernetes manifests). Terraform creates the cluster and the pipeline applies the manifests — Terraform's Kubernetes provider warns against creating a cluster and its Kubernetes resources in the same configuration
- **State** — Terraform state can hold secrets in plain text, so it is stored only in the private backends above, never in Git. The S3 bucket and the storage account for state are created once by hand, before the first `terraform init`
- **Pipeline** — a pull request shows the preview (`terraform plan`, Bicep `what-if`); merging to `main` applies it after approval in a GitHub environment
- **Modules** — the first resources are written by hand to learn them; Azure Verified Modules (Microsoft-supported modules for Bicep and Terraform) come later
- **Cost** — environments are short-lived: create, learn, destroy (`terraform destroy`, deleting the deployment stack)

### Kubernetes — local cluster, then AKS (post-MVP, after AWS and Azure)

> ECS and Container Apps hide the cluster; here the same containers run on a cluster you configure yourself. Data stays in managed services, so the cluster runs only stateless containers and can be destroyed and recreated at any time.

1. **Local cluster** — Kubernetes in Docker Desktop (kind provisioner, multi-node), no cloud cost: Pods, Deployments, Services, ConfigMaps and Secrets, resource requests and limits, probes, rolling updates, Jobs and CronJobs, `kubectl`
2. **Packaging** — plain YAML manifests first, then Kustomize (built into `kubectl`): one base plus an overlay per environment (`local`, `aks`). Helm installs third-party software, such as a Gateway API implementation on the local cluster; the app itself doesn't need a Helm chart
3. **AKS** — the cluster is created with Terraform; GitHub Actions builds the images, pushes them to Container Registry, and applies the `aks` overlay (OIDC sign-in)
4. **GitOps** (optional) — Flux, an AKS cluster extension, pulls the manifests from the repository instead of the pipeline pushing them

| App part                                    | Kubernetes                                                                                                                                                                                           | On AKS                                                                                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js frontend, NestJS API**            | A Deployment and a Service each, HorizontalPodAutoscaler. API probes: readiness on `GET /health` (checks the database), liveness without the database — a database outage must not restart every pod | Images pulled from Container Registry, attached to the cluster (AcrPull)                                                                |
| **HTTP routing and TLS**                    | Gateway API (`Gateway`, `HTTPRoute`) — Kubernetes recommends it over Ingress, whose API is frozen                                                                                                    | Application routing add-on with its Gateway API implementation, managed by AKS                                                          |
| **Database migrations**                     | Job running `prisma migrate deploy` before the API rollout                                                                                                                                           | —                                                                                                                                       |
| **Scheduled jobs**                          | CronJob (exchange-rate sync, reminders)                                                                                                                                                              | —                                                                                                                                       |
| **Configuration**                           | ConfigMap → environment variables                                                                                                                                                                    | —                                                                                                                                       |
| **Secrets**                                 | Secret → environment variables                                                                                                                                                                       | Key Vault, mounted by the Secrets Store CSI driver add-on and synced to a Kubernetes Secret — the app still reads environment variables |
| **Access to Azure services** (Blob Storage) | ServiceAccount                                                                                                                                                                                       | Microsoft Entra Workload ID — the service account is federated with a managed identity; no keys                                         |
| **Database**                                | PostgreSQL StatefulSet + PersistentVolumeClaim — local cluster only, to practice storage                                                                                                             | Azure Database for PostgreSQL flexible server, outside the cluster                                                                      |
| **Logs and metrics**                        | `kubectl logs`, `kubectl describe`                                                                                                                                                                   | Container insights (logs) + Azure Monitor managed Prometheus (metrics)                                                                  |

**Cluster options:**

- **AKS Standard on the Free tier** — a free control plane without an SLA, meant for development and learning; you pay for the nodes. Node pools, networking (Azure CNI Overlay — kubenet, still the default, is retired on 31 March 2028), and add-ons are your choices, which is what this step is for
- **AKS Automatic** — Microsoft's production default: node autoprovisioning, Gateway API ingress, workload identity, monitoring, and safeguards are preconfigured; Standard tier (paid control plane with an SLA). Worth trying afterwards to see what it automates
- **Cost** — one small node pool; stop the cluster (`az aks stop`) or `terraform destroy` it when it isn't used
- **EKS**, AWS's managed Kubernetes, is not planned — the Kubernetes concepts are the same, and one managed Kubernetes service is enough to learn them

### AI features (Phases 3–4 — services not decided yet)

> Requirements 11.6 and 17.2 bring AI into the app. Each feature first gets the simplest version that works; the AI version is then built next to it and compared on accuracy, cost, latency, and privacy. Services are chosen when the feature is built.

| Feature                                                | Simple version first                              | AI version                                                                                        | Azure                                                       | AWS                         |
| ------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------- |
| **Receipt → draft transaction** (17.2, HS-28 to HS-30) | Manual entry, with the photo attached             | Prebuilt receipt extraction, or a vision-capable LLM that returns structured output (JSON schema) | Document Intelligence (`prebuilt-receipt`) in Foundry Tools | Textract (`AnalyzeExpense`) |
| **Category suggestions** (HS-21, HS-31)                | The category used last time for the same merchant | An LLM picks one of the household's categories                                                    | Microsoft Foundry models                                    | Amazon Bedrock              |
| **Budget forecasting** (11.6, HS-33)                   | Average of the last few months per category       | A statistical or ML forecast in code; an LLM explains it in plain language                        | Microsoft Foundry models                                    | Amazon Bedrock              |

- **Human in the loop** — AI only proposes (a draft transaction, a category, a budget); the user confirms
- **Untrusted input** — receipt text and merchant names can contain prompt injection: model output is validated against a schema and never triggers an action on its own (OWASP Top 10 for LLM Applications)
- **Data minimization** — send only the fields a feature needs, never account numbers; check the service's data retention and data residency terms
- **Evaluation** — a small labelled test set (receipts, transactions) measures accuracy before and after every prompt or model change
- **Cost** — pay per request: limits per household, caching, and the cheapest model that passes the evaluation

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
helmet                         ← Security headers
@nestjs/config                 ← Environment config
@nestjs/schedule               ← Cron jobs
@prisma/client, prisma         ← ORM (Prisma 7 + @prisma/adapter-pg driver adapter)
class-validator, class-transformer ← DTO validation
nestjs-pino, pino, pino-http   ← Logging (pino-http is a required peer of nestjs-pino 5)
pdfmake, csv-stringify         ← Report export (PDF, CSV)
```
