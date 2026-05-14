# DDD Analysis – Personal & Household Finance Manager

> **What is DDD (Domain-Driven Design)?**
> DDD is an approach to software design that focuses on understanding the **business domain** (the real-world problem you're solving) before writing any code. Instead of starting with databases or frameworks, you start by mapping out the language, concepts, and rules of your domain. This ensures the software accurately models reality.

---

## 0. MVP Scope

> **What is an MVP?**
> A Minimum Viable Product is the smallest version of your app that delivers real value to users. It lets you validate your idea quickly, get feedback, and iterate — without spending months building features nobody needs yet.

### MVP (Phase 1) — Core Finance Tracking

| # | Feature | Why it's in MVP |
|---|---------|-----------------|
| 1 | Manual transaction entry (date, amount, category, user, comment, account) | The fundamental action — without it nothing works |
| 6 | Custom expense categories | Users need their own taxonomy from day one |
| 17.a | Manage accounts (create, rename, deactivate; default account on setup) | Every transaction needs an account — must exist before first entry |
| 3 | Split transaction across categories | Common real-world scenario (supermarket receipt = groceries + cleaning supplies) |
| 4 | Filter transactions (by user, date, category, account, amount) | Useless data without the ability to find things |
| 5 | Sum of filtered transactions | Immediate insight |
| 7 | User registration & login (password + Google) | Security & multi-user support |
| 8 | Basic reports: monthly statement, category summary | Minimum actionable insight |
| 16 | Simple dashboard: pie chart of expenses, balance, total expenses/receipts | The "home screen" that gives a snapshot |
| 13 | Dark/light mode | Low effort, high perceived quality |
| 14 | Modern UI, mobile-first, responsive (web only) | One platform to start with |

### Phase 2 — Budgeting & Accounts

| # | Feature |
|---|---------|
| 11 | Budget per category, alerts, color coding, projected receipts/expenses |
| 10 | Multi-currency accounts with exchange rates |
| 15 | Asset/savings graph over time |
| 8+ | Extended reports: yearly, period comparison, per-user, savings info |

### Phase 3 — Automation & Integrations

| # | Feature |
|---|---------|
| 2 | Bank API import (automatic + on-demand) |
| 9 | Subscription tracking & reminders |
| 17 | Receipt photo/scan attachment |
| 17b | Import transaction from uploaded receipt (OCR) |
| 18 | Bank promotion requirements tracking |

### Phase 4 — Wealth & Forecasting

| # | Feature |
|---|---------|
| 19 | Assets & encumbrances, net worth calculation |
| 20 | Retirement forecasting |
| 11.6.1 | AI-powered budget forecasting |
| 12 | Dedicated mobile app (native or PWA) |
| 16.7-8 | Custom dashboard widgets |

---

## 1. Potential Users

> **Why identify users?**
> In DDD we call them **Actors**. Knowing who interacts with the system shapes the **Ubiquitous Language** (the shared vocabulary between developers and domain experts) and determines which features matter most.

### Primary Actor

| Actor | Description | Key Needs |
|-------|-------------|----------|
| **Household Member** | Any person in a household. All members have equal access — everyone can add transactions, manage categories, set budgets, view reports, configure accounts, and invite others. A solo user is simply a household of one. | Add transactions, manage categories & budgets, see combined and per-member views, configure accounts |

> **Why one role?** In your domain, you and your fiancée are equal partners. There is no "admin" who controls settings while others just view data. Every member can do everything. This simplifies the model — no role checks, no permission hierarchies. If you later need restrictions (e.g., a child account with limited access), you can introduce roles then.

### Secondary Actors (interact indirectly)

| Actor | Description |
|-------|-------------|
| **Bank API** | External system that provides transaction data |
| **Exchange Rate Service** | External system providing currency conversion rates |
| **Notification System** | Sends reminders about subscriptions, budgets, promotions |
| **AI Forecasting Service** | Generates budget predictions and retirement projections |

---

## 2. Problems Being Solved

> **Why identify problems?**
> In DDD the problems define the **Problem Space** — the real-world challenges that justify the software's existence. Each problem maps to one or more **Subdomains**.

| # | Problem | Subdomain |
|---|---------|-----------|
| P1 | **No single view of finances** — money is spread across multiple bank accounts, currencies, and family members | Transaction Management |
| P2 | **Manual tracking is tedious** — writing down every expense in a spreadsheet is error-prone and time-consuming | Transaction Management, Bank Integration |
| P3 | **No idea where money goes** — hard to see spending patterns without categorization and reports | Categorization, Reporting |
| P4 | **Overspending without realizing** — no alerts or visual feedback when a budget is exceeded | Budgeting |
| P5 | **Forgotten subscriptions & bills** — recurring payments slip through the cracks | Subscription Management |
| P6 | **No visibility into net worth** — people don't know if they're getting richer or poorer over time | Asset Management |
| P7 | **Retirement anxiety** — no easy way to model "will I have enough?" scenarios | Retirement Planning |
| P8 | **Missing bank promotion conditions** — losing bonus interest or cashback because a condition wasn't met | Promotion Tracking |
| P9 | **Multi-currency confusion** — hard to see total wealth when accounts are in PLN, EUR, USD, etc. | Account Management |

---

## 3. Main Use Cases

> **What is a Use Case?**
> A use case describes **one specific thing an actor wants to accomplish** with the system. It has a trigger, a flow of steps, and an outcome. In DDD, use cases help us discover **Commands** (things that change state) and **Queries** (things that read state).

### UC-1: Add a Transaction Manually
- **Actor:** Household Member
- **Trigger:** User clicks "Add Transaction"
- **Flow:**
  1. User selects transaction type: **Income** or **Expense**
  2. User enters: date (defaults to today, any past date allowed), amount (always positive), account, user (which household member), comment
  3. User selects or creates a category
  4. (Optional) User splits amount across multiple categories
  5. (Optional) User attaches a receipt photo
  6. System saves the transaction
- **Outcome:** Transaction appears in the list; dashboard/reports update
- **Command:** `RecordTransaction`

### UC-2: Import Transactions from Bank
- **Actor:** System (scheduled) or Household Member (on demand)
- **Trigger:** Daily schedule or user clicks "Import Now"
- **Flow:**
  1. System connects to bank API
  2. System downloads new transactions since last import
  3. System marks them as "uncategorized"
  4. On next login, user sees a prompt: "You have X new transactions to categorize"
  5. User assigns categories to each
- **Outcome:** Imported transactions are stored and categorized
- **Command:** `ImportTransactions`, `CategorizeTransaction`

### UC-3: Split a Transaction
- **Actor:** Household Member
- **Trigger:** User opens an existing transaction
- **Flow:**
  1. User clicks "Split"
  2. User defines 2+ category–amount pairs (must sum to original amount)
  3. Duplicate categories are allowed (two splits with the same category are not auto-merged)
  4. System validates the total matches
  5. System saves the splits
  6. User can also **unsplit** — remove all splits and reassign the full amount to one category
- **Outcome:** Transaction is linked to multiple categories (or reverted to one)
- **Command:** `SplitTransaction`, `UnsplitTransaction`

### UC-4: Filter & Browse Transactions
- **Actor:** Household Member
- **Trigger:** User opens the transaction list
- **Flow:**
  1. Page loads with **default filter: current month**
  2. User can adjust filter criteria (date range, user, category, account, amount range, type)
  3. System returns matching transactions via **virtual scroll** (windowed rendering, cursor-based pagination under the hood)
  4. **Sticky summary footer** shows three values: **total income, total expenses, and net** (income − expenses) for the entire filtered set
- **Outcome:** Filtered view with income/expense/net totals
- **Query:** `GetFilteredTransactions`, `GetFilteredTransactionsSummary`

### UC-5: Manage Categories
- **Actor:** Household Member
- **Trigger:** User opens category settings
- **Flow:**
  1. User creates / renames / deletes / reorders categories
  2. System rejects deletion if transactions exist — user must reassign them to another category first
- **Outcome:** Updated category list
- **Command:** `CreateCategory`, `RenameCategory`, `DeleteCategory`

### UC-6: Register & Log In
- **Actor:** Household Member
- **Trigger:** User opens the app for the first time / returns
- **Flow:**
  1. Registration: email + password OR Google OAuth
  2. Login: credentials or Google
  3. System issues a session/token
  4. If first user → system creates a new Household and adds this member
  5. System auto-creates a default account ("Gotówka" / Cash, in main currency)
  6. System offers **default categories** (18 expense + 5 income, Polish household set) — user can keep all, customize (modify/delete some), or start empty
  7. If invited → system adds the user to the existing Household
- **Outcome:** Authenticated user with full access to their household
- **Command:** `RegisterUser`, `AuthenticateUser`, `SeedDefaultCategories`, `CreateDefaultAccount`

### UC-7: View Reports
- **Actor:** Household Member
- **Trigger:** User opens Reports section
- **Flow:**
  1. User selects report type (monthly, yearly, category, comparison, per-user)
  2. User selects parameters (period, category, user)
  3. System aggregates data and renders charts/tables
  4. System indicates if savings occurred (receipts > expenses)
  5. User can **export to PDF or CSV**
- **Outcome:** Visual report with optional download
- **Query:** `GenerateReport`
- **Command:** `ExportReport`

### UC-8: Set & Track a Budget
- **Actor:** Household Member
- **Trigger:** User opens Budgets section
- **Flow:**
  1. User sets a spending limit per category per month
  2. User optionally enters projected receipts
  3. System calculates: projected expenses, receipts, and savings
  4. System colors categories green (under budget) or red (over budget)
  5. System sends an alert when a budget threshold is crossed
- **Outcome:** Active budget with real-time tracking
- **Command:** `SetBudget`, **Event:** `BudgetExceeded`

### UC-9: Manage Subscriptions
- **Actor:** Household Member
- **Trigger:** User adds a subscription
- **Flow:**
  1. User enters: name (e.g., Netflix), amount, billing date, currency, account
  2. System schedules reminders before due date
  3. If payment date passes without a matching transaction → overdue alert
- **Outcome:** Tracked subscription with reminders
- **Command:** `RegisterSubscription`

### UC-10: Track Multi-Currency Accounts
- **Actor:** Household Member
- **Trigger:** User adds an account in a foreign currency
- **Flow:**
  1. User creates account with a specified currency (e.g., EUR)
  2. System fetches exchange rate from external service
  3. Wherever a non-main-currency amount is displayed (transaction list, reports, dashboard), the system shows **both** the original amount (e.g., 50.00 EUR) **and** the converted amount in the main currency (e.g., ~216.00 PLN)
  4. Report totals and summaries use the converted main-currency values for aggregation
- **Outcome:** Unified financial view across currencies with full transparency of original amounts
- **Command:** `AddAccount`

### UC-11: View Dashboard
- **Actor:** Household Member
- **Trigger:** User opens the app
- **Flow:**
  1. System shows dashboard for **current month by default** (user can select any month): pie chart of top expense categories, monthly balance, total expenses, total receipts, budget status (shown only when budgets exist — Phase 2+), account summary
  2. Dashboard **refreshes in real-time** after each save (transaction add/edit/split/categorize)
  3. Aggregates are **calculated on the fly** for MVP (optimize later if needed)
  4. (Phase 4) User can add/remove custom dashboard widgets (text, image, chosen report)
- **Outcome:** At-a-glance financial snapshot
- **Query:** `GetDashboard`

### UC-12: Track Assets & Encumbrances
- **Actor:** Household Member
- **Trigger:** User opens Net Worth section
- **Flow:**
  1. User adds assets (apartment, car, investments) with current value
  2. User adds encumbrances (mortgage, loans) with remaining balance
  3. System calculates net worth = assets − encumbrances
  4. User sets a net worth goal
  5. System reminds user to update asset values periodically
- **Outcome:** Net worth dashboard with goal tracking
- **Command:** `RecordAsset`, `RecordEncumbrance`

### UC-13: Forecast Retirement
- **Actor:** Household Member
- **Trigger:** User opens Retirement Planner
- **Flow:**
  1. User enters: current age, target retirement age, desired monthly income, current savings
  2. System calculates scenarios (how much to save, how long to work, projected pension)
- **Outcome:** Retirement projection with actionable numbers
- **Query:** `ForecastRetirement`

### UC-14: Track Bank Promotion Requirements
- **Actor:** Household Member
- **Trigger:** User adds a bank promotion
- **Flow:**
  1. User enters: promotion name, conditions (e.g., 5 card transactions/month), link to promo page, link to T&C
  2. System checks each month if conditions are met based on transaction data
  3. System sends monthly reminders
- **Outcome:** Promotion compliance tracking
- **Command:** `RegisterPromotion`

### UC-15: Import Transaction from Receipt
- **Actor:** Household Member
- **Trigger:** User clicks "Scan Receipt" or uploads a photo/file
- **Flow:**
  1. User uploads a receipt image (photo, scan, or PDF)
  2. System sends the image to an OCR/AI service for data extraction
  3. System creates a **draft transaction** pre-filled with extracted data (date, total amount, merchant/items)
  4. User reviews the draft — corrects any errors, selects account and category
  5. (Optional) User splits the amount across categories
  6. User confirms → system saves the transaction with the receipt attached
- **Outcome:** A new transaction is created from the receipt; the original image is stored as an attachment
- **Command:** `ExtractReceiptData`, `ConfirmReceiptTransaction`

### UC-16: Invite a Household Member
- **Actor:** Household Member
- **Trigger:** User clicks "Invite Member"
- **Flow:**
  1. User enters the invitee's email address
  2. System creates a single-use invitation token (expires in 7 days)
  3. System sends an invitation email
  4. Invitee clicks the link → registers (if new) or joins the household (if existing user)
  5. Inviter can resend (generates new token, invalidates old) or revoke at any time
- **Outcome:** New member joins the household with equal access
- **Command:** `InviteMember`, `AcceptInvitation`, `RevokeInvitation`

### UC-17: Manage Accounts
- **Actor:** Household Member (or System during household setup)
- **Trigger:** User opens account settings, or household is created
- **Flow:**
  1. On household creation, system auto-creates a default account ("Gotówka" / Cash, in the household's main currency)
  2. User can add accounts (name, currency, initial balance)
  3. User can rename or deactivate accounts
  4. Deactivation is soft — historical transactions remain linked
- **Outcome:** Account list available for recording transactions
- **Command:** `AddAccount`, `RenameAccount`, `DeactivateAccount`

---

## 4. Processes in the System

> **What is a Process?**
> A process (or **Domain Process / Workflow**) is a sequence of steps that spans time and may involve multiple actors or system components. In DDD, long-running processes are modeled as **Sagas** or **Process Managers**. Short ones are just use case flows.

### Process 1: Transaction Recording Flow

```
User fills form (selects type: Income/Expense) → Validate input → Save Transaction → Update Account Balance
                                  → (optional) Split into categories
                                  → (optional) Attach receipt
                                  → Emit event: TransactionRecorded
                                  → Update Dashboard Cache (real-time)
                                  → Check Budget thresholds
                                      → If exceeded → Emit: BudgetExceeded → Send Alert
```

### Process 2: Bank Import Flow (Saga)

```
Scheduler triggers import (or user clicks "Import Now")
  → For each connected bank account:
      → Call Bank API → Download new transactions
      → Save as "Uncategorized" transactions
      → Emit: TransactionsImported
  → On next user login:
      → Show "X uncategorized transactions" prompt
      → User categorizes each one
      → For each: Emit TransactionCategorized → Update budgets/reports
```

This is a **Saga** because it spans time (import happens in background, categorization happens later during user session).

### Process 3: Budget Monitoring Flow

```
TransactionRecorded event received
  → Calculate total spending in that category for current month
  → Compare to budget limit
  → If total ≥ limit:
      → Emit: BudgetExceeded
      → Send notification to user
  → Update dashboard colors (green/red)
```

### Process 4: Subscription Reminder Flow

```
Daily scheduler runs
  → For each active subscription:
      → If billing date is in 3 days → Send "upcoming payment" reminder
      → If billing date has passed AND no matching transaction found:
          → Send "overdue payment" alert
```

### Process 5: Exchange Rate Sync

```
Daily scheduler (or on-demand)
  → Call Exchange Rate Service
  → Update stored rates for all active currencies
  → Recalculate multi-currency report totals
```

### Process 6: Net Worth Calculation

```
User updates asset/encumbrance value (or monthly reminder triggers)
  → Recalculate: Net Worth = Σ Assets − Σ Encumbrances
  → Store historical snapshot (for month-over-month graph)
  → Compare to goal
  → Update dashboard
```

### Process 7: Promotion Compliance Check (Monthly Saga)

```
End of month (or on-demand)
  → For each active promotion:
      → Evaluate each condition against transaction data
      → Mark condition as met/unmet
      → If any condition unmet → Send alert
  → Beginning of next month → Send reminder of conditions to meet
```

---

## 5. Key Domain Concepts

> **What are Domain Concepts?**
> These are the building blocks of your domain model. In DDD they are classified into:
>
> - **Entity** — An object with a unique identity that persists over time (e.g., a specific Transaction).
> - **Value Object** — An object defined only by its attributes, with no identity (e.g., Money = amount + currency). Two Money objects with the same amount and currency are interchangeable.
> - **Aggregate** — A cluster of entities and value objects treated as a single unit for data changes. Every aggregate has a **root entity** that controls access. External objects can only reference the root.
> - **Domain Event** — Something meaningful that happened in the domain (e.g., "Budget was exceeded"). Events are used to trigger side effects (notifications, recalculations).
> - **Bounded Context** — A logical boundary within which a particular model and language apply. Different contexts can have different meanings for the same word (e.g., "Account" means a bank account in one context and a user login in another).

---

### 5.1 Bounded Contexts

> **Beginner tip:** Think of a bounded context as a department in a company. Each department has its own vocabulary and rules. The "Account" in the Finance department is a bank account; in IT it's a login. Bounded contexts prevent confusion by keeping these meanings separate.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PERSONAL FINANCE APP                        │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   Identity &     │  │   Transaction    │  │   Budgeting      │  │
│  │   Access         │  │   Management     │  │                  │  │
│  │                  │  │                  │  │                  │  │
│  │  • User          │  │  • Transaction   │  │  • Budget        │  │
│  │  • Household     │  │  • Category      │  │  • BudgetAlert   │  │
│  │  • Auth          │  │  • Split         │  │  • Forecast      │  │
│  │  • Invitation    │  │  • Receipt       │  │                  │  │
│  └──────────────────┘  │  • Account       │  └──────────────────┘  │
│                        └──────────────────┘                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   Reporting &    │  │   Subscription   │  │   Bank           │  │
│  │   Analytics      │  │   Management     │  │   Integration    │  │
│  │                  │  │                  │  │                  │  │
│  │  • Report        │  │  • Subscription  │  │  • BankConnection│  │
│  │  • Dashboard     │  │  • Reminder      │  │  • ImportBatch   │  │
│  │  • BalanceSnap.  │  │  • PaymentCheck  │  │  • RawTransaction│  │
│  │  • ReportExport  │  │                  │  │                  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   Wealth         │  │   Promotion      │  │   Currency       │  │
│  │   Management     │  │   Tracking       │  │   Exchange       │  │
│  │                  │  │                  │  │                  │  │
│  │  • Asset         │  │  • Promotion     │  │  • ExchangeRate  │  │
│  │  • Encumbrance   │  │  • Condition     │  │  • CurrencyPair  │  │
│  │  • NetWorth      │  │  • Compliance    │  │                  │  │
│  │  • RetirementPlan│  │                  │  │                  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 5.2 Aggregates, Entities, and Value Objects

> **Beginner tip on Aggregates:** Imagine a `Transaction` with its `Splits`. You never create a Split without a Transaction. You never load a Split alone — you always go through the Transaction. The Transaction is the **Aggregate Root**. All changes to Splits go through the Transaction, which enforces rules like "splits must sum to the transaction amount."

#### Bounded Context: Transaction Management

| Concept | Type | Description |
|---------|------|-------------|
| **Transaction** | **Aggregate Root (Entity)** | A single financial event. Has a unique ID, **type** (Income or Expense), date, total amount (always positive), account, user, comment. Controls its Splits. |
| **TransactionSplit** | Entity (inside Transaction aggregate) | One portion of a split transaction — links a sub-amount to a category. Identity matters because you edit/delete specific splits. |
| **Money** | Value Object | Amount + Currency (e.g., 150.00 PLN). Immutable — you don't change a Money, you create a new one. Two `Money(150, PLN)` are equal. |
| **Category** | Aggregate Root (Entity) | A user-defined expense/income label (e.g., "Groceries", "Rent"). Has a unique ID, name, icon, color. |
| **Account** | Aggregate Root (Entity) | A bank account or cash wallet. Has ID, name, currency, current balance. |
| **Receipt** | Entity (inside Transaction aggregate) | An attached photo/scan of a paper receipt. Stored as a file reference. |
| **TransactionType** | Value Object | Either `Income` or `Expense`. Determines the meaning of the amount — always positive, direction determined by type. |

**Key Rule (Invariant):**
> The sum of all `TransactionSplit` amounts must equal the `Transaction` total amount.

#### Bounded Context: Identity & Access

| Concept | Type | Description |
|---------|------|-------------|
| **User** | Aggregate Root (Entity) | A person using the app. Has ID, email, auth method, display name. Every user is a full and equal member of their Household — there are no restricted roles. |
| **Household** | Aggregate Root (Entity) | A group of users sharing finances equally. Has ID, name, main currency, list of member references. All members have identical permissions. **Data model uses a junction table `user_households` to support multi-household in the future**, but MVP launches with single-household UX (no switcher). All APIs are scoped with explicit `householdId`. |
| **Invitation** | Entity | A pending invite for someone to join a Household. Has ID, inviter reference, invitee email, status (pending/accepted/expired/revoked), **expiry: 7 days**. Single-use token. Inviter can resend (new token, old invalidated) or revoke. Any member can invite others. |
| **AuthCredentials** | Value Object | Password hash or Google OAuth token. Never stored as plain text. |

#### Bounded Context: Budgeting

| Concept | Type | Description |
|---------|------|-------------|
| **Budget** | Aggregate Root (Entity) | A spending limit for a category in a given month. Has ID, category reference, month, limit amount, projected receipts. |
| **BudgetStatus** | Value Object | Calculated state: `UnderBudget` or `OverBudget`, with actual vs. limit amounts. Determines green/red coloring. |
| **Forecast** | Value Object | AI-generated projection of future expenses/receipts/savings based on historical data. |

**Key Rule:**
> When actual spending in a category exceeds the budget limit, the system must emit a `BudgetExceeded` event.

#### Bounded Context: Subscription Management

| Concept | Type | Description |
|---------|------|-------------|
| **Subscription** | Aggregate Root (Entity) | A recurring payment (e.g., Netflix, 49.99 PLN, every 15th). Has ID, name, amount, billing day, account, active/inactive status. |
| **PaymentStatus** | Value Object | For a given month: `Upcoming`, `Paid`, or `Overdue`. |

#### Bounded Context: Bank Integration

| Concept | Type | Description |
|---------|------|-------------|
| **BankConnection** | Aggregate Root (Entity) | A link to an external bank API. Has ID, bank name, API credentials (encrypted), linked account. |
| **ImportBatch** | Entity | A set of transactions downloaded in one import run. Has timestamp, count, status (pending/categorized). |
| **RawTransaction** | Value Object | Unprocessed transaction data from the bank, before user categorizes it. |

#### Bounded Context: Wealth Management

| Concept | Type | Description |
|---------|------|-------------|
| **Asset** | Aggregate Root (Entity) | Something of value owned by the household (apartment, car, stocks). Has ID, name, type, current estimated value, last updated date. |
| **Encumbrance** | Aggregate Root (Entity) | A debt or obligation (mortgage, car loan). Has ID, name, type, remaining balance, monthly payment. |
| **NetWorthSnapshot** | Value Object | A point-in-time calculation: total assets − total encumbrances. Stored monthly for historical graphing. |
| **NetWorthGoal** | Value Object | The target net worth the user wants to achieve. |
| **RetirementScenario** | Value Object | Input parameters (current age, target age, desired monthly income, savings) and calculated output (required monthly saving, projected pension). |

#### Bounded Context: Currency Exchange

| Concept | Type | Description |
|---------|------|-------------|
| **ExchangeRate** | Value Object | A conversion rate between two currencies on a given date (e.g., EUR/PLN = 4.32 on 2026-05-13). |
| **CurrencyPair** | Value Object | Two currency codes (e.g., EUR/PLN). |

#### Bounded Context: Promotion Tracking

| Concept | Type | Description |
|---------|------|-------------|
| **Promotion** | Aggregate Root (Entity) | A bank promotion with conditions. Has ID, name, bank, promo page URL, T&C URL, active period. |
| **PromotionCondition** | Entity (inside Promotion aggregate) | A single condition to meet (e.g., "≥5 card transactions/month"). |
| **ComplianceStatus** | Value Object | For a given month: each condition marked as `Met` or `Unmet`. |

#### Bounded Context: Reporting & Analytics

| Concept | Type | Description |
|---------|------|-------------|
| **BalanceSnapshot** | Value Object | A point-in-time record of monthly savings: total income − total expenses for a given month. Stored monthly for the savings graph (Req 15). |
| **ReportExport** | Value Object | A generated file (PDF or CSV) representing a report. Has format, data snapshot, and download URL. |

---

### 5.3 Domain Events

> **Beginner tip:** A Domain Event is a notification that "something important just happened." Other parts of the system listen for these events and react. This keeps components decoupled — the Transaction context doesn't need to know about Budgeting; it just says "a transaction was recorded" and Budgeting listens.

| Event | Produced by | Consumed by | What happens |
|-------|-------------|-------------|--------------|
| **Identity & Access** | | | |
| `UserRegistered` | Identity & Access | Transaction Mgmt | Initialize user profile, seed default categories + default account |
| `HouseholdCreated` | Identity & Access | Transaction Mgmt | Set up shared space, create default account and categories |
| `MemberJoinedHousehold` | Identity & Access | — | Update household member list |
| `InvitationSent` | Identity & Access | External (Email) | Deliver invitation email to invitee |
| `InvitationAccepted` | Identity & Access | Identity & Access | Trigger registration (if new) + join household |
| `UserLoggedIn` | Identity & Access | Transaction Mgmt | Check for uncategorized transactions → show prompt |
| **Transaction Management** | | | |
| `TransactionRecorded` | Transaction Management | Budgeting, Reporting, Promotion Tracking | Recalculate budget usage; update reports; check promotion conditions |
| `TransactionCategorized` | Transaction Management | Budgeting, Reporting | Uncategorized imported transaction now has a category — update aggregations |
| `TransactionSplit` | Transaction Management | Budgeting, Reporting | Split amounts update per-category calculations |
| `TransactionUnsplit` | Transaction Management | Budgeting, Reporting | Reverted to single category — recalculate per-category totals |
| `CategoryCreated` | Transaction Management | Reporting | Update category list read model |
| `AccountCreated` | Transaction Management | Currency Exchange | If foreign currency → fetch exchange rate |
| `ReceiptAttached` | Transaction Management | — | Update transaction detail read model (thumbnail) |
| `ReceiptDataExtracted` | Transaction Mgmt (via OCR) | — | Create draft transaction for user review |
| **Budgeting** | | | |
| `BudgetSet` | Budgeting | Reporting | Update budget overview read model |
| `BudgetExceeded` | Budgeting | Notification Service | Send alert to user |
| `BudgetForecastGenerated` | Budgeting (via AI) | — | Show suggested budgets for next month |
| **Bank Integration** | | | |
| `TransactionsImported` | Bank Integration | Transaction Management | Create uncategorized transactions; prompt user on next login |
| **Subscription Management** | | | |
| `SubscriptionRegistered` | Subscription Management | — | Schedule payment reminders |
| `SubscriptionPaymentDue` | Subscription Management | Notification Service | Send upcoming payment reminder |
| `SubscriptionOverdue` | Subscription Management | Notification Service | Send overdue alert |
| **Currency Exchange** | | | |
| `ExchangeRatesUpdated` | Currency Exchange | Transaction Mgmt, Reporting, Wealth Mgmt | Recalculate multi-currency totals |
| **Promotion Tracking** | | | |
| `PromotionConditionUnmet` | Promotion Tracking | Notification Service | Alert user about unmet conditions |
| `PromotionReminderSent` | Promotion Tracking | — | Monthly reminder of conditions to meet |
| **Wealth Management** | | | |
| `AssetValueUpdated` | Wealth Management | Wealth Management, Reporting | Recalculate net worth, update graph |
| `AssetRecorded` | Wealth Management | Wealth Management, Reporting | Initial asset creation — triggers net worth recalculation |
| `EncumbranceRecorded` | Wealth Management | Wealth Management, Reporting | Initial encumbrance creation — triggers net worth recalculation |
| `NetWorthRecalculated` | Wealth Management | Reporting | Update net worth dashboard and history graph |
| **Reporting & Analytics** | | | |
| `BalanceSnapshotTaken` | Reporting | — | Update savings graph (monthly data point) |

---

### 5.4 Context Map (How Bounded Contexts Relate)

> **Beginner tip:** A Context Map shows how different bounded contexts communicate. Common patterns:
> - **Upstream/Downstream** — one context provides data that another consumes
> - **Anti-Corruption Layer (ACL)** — a translation layer that protects your model from external system quirks (e.g., messy bank API data)

```
                    ┌─────────────────┐
                    │  Identity &     │
                    │  Access         │
                    └────────┬────────┘
                             │ (User/Household ID
                             │  shared via tokens)
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │ Transaction  │ │  Budgeting   │ │  Reporting   │
   │ Management   │─┤              │ │  & Analytics │
   └──────┬───────┘ └──────────────┘ └──────┬───────┘
          │              ▲                    ▲
          │ events       │ events             │ reads from all
          ├──────────────┘                    │ contexts below
          ├───────────────────────────────────┘
          │
   ┌──────┴───────┐
   │    Bank      │◄── ACL ──► External Bank APIs
   │ Integration  │
   └──────────────┘

   ┌──────────────┐        ┌──────────────┐
   │ Subscription │        │  Currency    │◄── ACL ──► Exchange Rate API
   │ Management   │        │  Exchange    │
   │              │        │              │
   │  reads txn   │        │  provides    │
   │  data ───────┼────►   │  rates to ───┼──► Transaction Mgmt
   │  (payment    │  Txn   │              │    Reporting, Wealth
   │   matching)  │  Mgmt  └──────────────┘
   └──────────────┘

   ┌──────────────┐        ┌──────────────┐
   │   Wealth     │        │  Promotion   │
   │ Management   │        │  Tracking    │
   │              │        │              │
   │  reads txn   │        │  reads txn   │
   │  data ───────┼────►   │  data ───────┼──► Transaction Mgmt
   │  (savings)   │  Txn   │  (compliance)│     (evaluate conditions)
   └──────────────┘  Mgmt  └──────────────┘
```

---

### 5.5 Ubiquitous Language Glossary

> **Beginner tip:** The Ubiquitous Language is a shared vocabulary used by everyone on the project — developers, designers, product owners. If the domain expert says "transaction," the code should have a class called `Transaction`, not `FinancialRecord` or `MoneyEvent`. This eliminates translation errors.

| Term | Definition |
|------|------------|
| **Transaction** | A single financial event — money in or money out of an Account |
| **TransactionType** | Either `Income` (money in) or `Expense` (money out). Amount is always positive; the type determines direction |
| **Split** | A portion of a Transaction assigned to a specific Category |
| **Category** | A user-defined label for classifying expenses or income (e.g., "Groceries") |
| **Account** | A financial container — bank account, cash wallet, or savings account |
| **Household** | A group of Users who share financial tracking with equal access — every member can do everything |
| **Budget** | A spending limit set for a Category within a time period (usually monthly) |
| **Subscription** | A recurring payment obligation (e.g., Netflix, electricity) |
| **Asset** | Something of value owned (apartment, car, investment portfolio) |
| **Encumbrance** | A financial obligation or debt (mortgage, loan) |
| **Net Worth** | Total value of Assets minus total Encumbrances |
| **Receipt** | A photo or scan of a paper proof of purchase, attached to a Transaction |
| **Promotion** | A bank offer with conditions that must be met monthly for benefits |
| **Import Batch** | A set of Transactions downloaded from a Bank API in one operation |
| **Exchange Rate** | The conversion ratio between two currencies on a given date |
| **Forecast** | A prediction of future expenses, receipts, or savings based on historical data |
| **Invitation** | A pending request for a new User to join a Household; any member can send one |
| **Main Currency** | The Household's primary currency, used for consolidated reporting || **Balance Snapshot** | A monthly record of total income minus total expenses, used for the savings graph |
| **Report Export** | A generated file (PDF or CSV) representing a report, available for download |
| **Default Account** | The “Gotówka” (Cash) account auto-created when a new Household is set up, in the household’s main currency |
---

### 5.6 Non-Functional Requirements

> These requirements don't map to domain concepts, bounded contexts, or use cases — they are cross-cutting UI and platform concerns. Included here for full traceability against the requirements document.

| Req | Requirement | Notes |
|-----|-------------|-------|
| 12 | Web and mobile access (mobile-first, responsive) | Phase 1: responsive web only. Phase 4: dedicated mobile app (native or PWA). |
| 13 | Dark mode / light mode switching | Theme preference stored per User profile. Toggle available on every screen. |
| 14 | Modern UI design | Clean, minimal interface with a consistent design system. |
