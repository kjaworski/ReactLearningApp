# Event Storming – Personal & Household Finance Manager

> **What is Event Storming?**
> Event Storming is a workshop technique invented by Alberto Brandolini. You place colored sticky notes on a wall (or a virtual board) to map out **everything that happens** in your system as a timeline. It's the bridge between the DDD analysis (what concepts exist) and actual software design (how things flow).
>
> The goal: discover all the Domain Events, figure out what triggers them, what reacts to them, and where the tricky parts are — **before** writing any code.

---

## Sticky Note Legend

> Each color represents a different type of element. In a real workshop these would be physical sticky notes on a wall. Here we use emoji prefixes.

| Color | Symbol | Meaning | Example |
|-------|--------|---------|---------|
| 🟧 Orange | Domain Event | Something that **happened** (past tense). The most important element — you start here. | `TransactionRecorded` |
| 🟦 Blue | Command | An **intention** to do something. Someone or something decided to trigger this action. | `RecordTransaction` |
| 🟨 Yellow | Actor | The **person** who triggers a command. | `Household Member` |
| 🟩 Green | Aggregate | The **domain object** that receives the command, enforces rules, and emits the event. | `Transaction` |
| 🟪 Purple | Policy | An **automated reaction** — "When event X happens, then trigger command Y." Also called a process or reactor. | "When `TransactionRecorded`, then `CheckBudget`" |
| 📖 Green (light) | Read Model | **Data the UI needs** to display something. Built from events. | Transaction List, Dashboard Summary |
| 🔴 Red | Hot Spot | An **unresolved question**, risk, or conflict that needs discussion. | "What happens if splits don't sum up?" |
| ⬜ White | External System | A **third-party** system outside your control. | Bank API, Google OAuth |

> **How to read the flows below:**
> Read left to right, like a timeline. The pattern is:
> ```
> 🟨 Actor → 🟦 Command → 🟩 Aggregate → 🟧 Event → 🟪 Policy → 🟦 Next Command → ...
> ```
> Some events feed into **Read Models** (📖) that the UI displays.
> Some events trigger **Policies** (🟪) that automatically fire the next command.

---

## Phase 1 — MVP Flows

### Flow 1: User Registration & Household Setup

```
🟨 New User
  → 🟦 RegisterUser
    → ⬜ Google OAuth / Password validation
    → 🟩 User
      → 🟧 UserRegistered

🟪 Policy: "When UserRegistered AND no invitation → CreateHousehold"
  → 🟦 CreateHousehold
    → 🟩 Household
      → 🟧 HouseholdCreated

🟪 Policy: "When UserRegistered AND has invitation → JoinHousehold"
  → 🟦 JoinHousehold
    → 🟩 Household
      → 🟧 MemberJoinedHousehold

🟪 Policy: "When HouseholdCreated → SeedDefaultCategories"
  → 🟦 SeedDefaultCategories
    → 🟩 Category (×N)
      → 🟧 CategoryCreated (×N)
```

**📖 Read Models produced:**
- User Profile
- Household Members List

**🔴 Hot Spots:**
- What are the default categories? (Groceries, Transport, Housing, Entertainment, Health, etc.)
- Can a user belong to multiple households?
- What happens to data if a member leaves a household?

---

### Flow 2: User Login

```
🟨 Returning User
  → 🟦 AuthenticateUser
    → ⬜ Google OAuth / Password check
    → 🟩 User
      → 🟧 UserLoggedIn

🟪 Policy: "When UserLoggedIn AND uncategorized transactions exist → NotifyUncategorized"
  → 🟦 ShowUncategorizedPrompt
    → 📖 Uncategorized Transaction Count
```

---

### Flow 3: Invite a Household Member

```
🟨 Household Member
  → 🟦 InviteMember (email)
    → 🟩 Invitation
      → 🟧 InvitationSent
        → ⬜ Email / Notification Service

🟨 Invited Person
  → 🟦 AcceptInvitation
    → 🟩 Invitation
      → 🟧 InvitationAccepted

🟪 Policy: "When InvitationAccepted → RegisterUser (if new) + JoinHousehold"
  → (continues into Flow 1)
```

**🔴 Hot Spots:**
- Invitation expiry period? (7 days? 30 days?)
- Can you revoke an invitation?
- What if the email is already registered in another household?

---

### Flow 4: Manage Categories

```
🟨 Household Member
  → 🟦 CreateCategory (name, icon, color)
    → 🟩 Category
      → 🟧 CategoryCreated

🟨 Household Member
  → 🟦 RenameCategory (id, newName)
    → 🟩 Category
      → 🟧 CategoryRenamed

🟨 Household Member
  → 🟦 DeleteCategory (id)
    → 🟩 Category
      → ❓ Rule: Are there transactions using this category?
        → YES → 🔴 Reject deletion (or require reassignment)
        → NO  → 🟧 CategoryDeleted

🟨 Household Member
  → 🟦 ReorderCategories (ordered list of ids)
    → 🟩 Category
      → 🟧 CategoriesReordered
```

**📖 Read Models produced:**
- Category List (ordered, with icons and colors)

**🔴 Hot Spots:**
- Should we allow deleting a category that has transactions? Force reassignment first?
- Category hierarchy (subcategories) — needed for MVP or later?
- Are categories shared across the household or per-user? → **Shared** (household-level)

---

### Flow 5: Record a Transaction

```
🟨 Household Member
  → 🟦 RecordTransaction (date, amount, accountId, categoryId, comment)
    → 🟩 Transaction
      → ❓ Rule: Account exists? Category exists? Amount > 0?
      → 🟧 TransactionRecorded
```

**📖 Read Models updated:**
- Transaction List
- Dashboard Summary (totals, pie chart)

**🔴 Hot Spots:**
- Can the amount be negative? Or do we use a separate field for income vs. expense?
- Is the transaction date always "today" or can you backdate?
- Should we auto-detect income vs. expense from positive/negative amount?

---

### Flow 6: Split a Transaction

```
🟨 Household Member
  → 🟦 SplitTransaction (transactionId, splits: [{categoryId, amount}, ...])
    → 🟩 Transaction
      → ❓ Rule: Sum of split amounts == Transaction total amount?
        → NO  → 🔴 Reject — "Splits must equal the total"
        → YES → 🟧 TransactionSplit
```

**📖 Read Models updated:**
- Transaction Detail (shows splits per category)
- Category-level spending totals

**🔴 Hot Spots:**
- Can you split into the same category twice? (Probably no — merge them)
- Can you "unsplit" (revert to a single category)?
- Minimum 2 splits required?

---

### Flow 7: Filter & Browse Transactions

> This is a **pure read/query flow** — no commands or events, just building a Read Model from existing data.

```
🟨 Household Member
  → 📖 GetFilteredTransactions
       Filters: dateRange, userId, categoryId, accountId, amountRange
    → 📖 Transaction List (filtered)
    → 📖 Filtered Sum (total of matching amounts)
```

**🔴 Hot Spots:**
- Default filter on page load? (Current month? All time?)
- Pagination or infinite scroll for large datasets?
- Should the sum show income and expense separately, or just net?

---

### Flow 8: View Dashboard

> Another **read-heavy flow**. The dashboard is a composite Read Model assembled from multiple data sources.

```
🟨 Household Member
  → 📖 GetDashboard
    → 📖 Pie Chart: expenses by category (current month)
    → 📖 Balance: total receipts − total expenses (current month)
    → 📖 Total Expenses (current month)
    → 📖 Total Receipts (current month)
    → 📖 Account Summary: balance per account
```

**🔴 Hot Spots:**
- Is the dashboard always for the current month, or can the user pick a period?
- How often does the dashboard refresh? Real-time after each transaction?
- Performance: precompute aggregates or calculate on the fly?

---

### Flow 9: View Reports

```
🟨 Household Member
  → 📖 GenerateReport (type, parameters)
    → type = "monthly"
      → 📖 Monthly Statement: all transactions in a month, grouped by category, with totals
    → type = "category"
      → 📖 Category Summary: spending per category over a period
```

**🔴 Hot Spots:**
- Export to PDF/CSV — needed for MVP?
- How to visualize "did we save anything?" — just the number, or a chart?

---

## Phase 2 — Budgeting & Accounts

### Flow 10: Set a Budget

```
🟨 Household Member
  → 🟦 SetBudget (categoryId, month, limitAmount, projectedReceipts)
    → 🟩 Budget
      → 🟧 BudgetSet
```

**📖 Read Models produced:**
- Budget Overview: per-category limit vs. actual spending
- Forecast: projected expenses, receipts, savings

---

### Flow 11: Budget Monitoring (Automated)

```
🟧 TransactionRecorded (from Flow 5)
  → 🟪 Policy: "When TransactionRecorded → CheckBudget for that category"
    → 🟦 CheckBudget (categoryId, month)
      → 🟩 Budget
        → Calculate: actual spending vs. limit
        → IF actual ≥ limit:
            → 🟧 BudgetExceeded
              → 🟪 Policy: "When BudgetExceeded → SendAlert"
                → 🟦 SendBudgetAlert
                  → ⬜ Notification Service
                    → 🟧 BudgetAlertSent
        → 📖 Update BudgetStatus (green/red coloring)
```

**🔴 Hot Spots:**
- Alert threshold: exactly at limit, or at 80%/90% warning first?
- Should split transactions check budget for each split's category?
- Alert frequency: once per budget period, or every time it's exceeded?

---

### Flow 12: Add Multi-Currency Account

```
🟨 Household Member
  → 🟦 AddAccount (name, currency, initialBalance)
    → 🟩 Account
      → 🟧 AccountCreated

🟪 Policy: "When AccountCreated AND currency ≠ mainCurrency → FetchExchangeRate"
  → 🟦 FetchExchangeRate (currencyPair)
    → ⬜ Exchange Rate Service
      → 🟩 ExchangeRate (stored)
        → 🟧 ExchangeRateFetched
```

**📖 Read Models updated:**
- Account List (showing original balance + converted to main currency)
- All transaction/report views for that account show dual amounts

---

### Flow 13: Daily Exchange Rate Sync

```
⏰ Daily Scheduler
  → 🟦 SyncExchangeRates
    → ⬜ Exchange Rate Service
      → 🟩 ExchangeRate (updated for each active currency pair)
        → 🟧 ExchangeRatesUpdated

🟪 Policy: "When ExchangeRatesUpdated → RecalculateMultiCurrencyTotals"
  → 📖 Update all multi-currency Read Models
```

---

### Flow 14: Extended Reports

```
🟨 Household Member
  → 📖 GenerateReport (type, parameters)
    → type = "yearly"
      → 📖 Yearly Summary
    → type = "comparison"
      → 📖 Period Comparison (month-to-month, year-to-year)
    → type = "per-user"
      → 📖 User Statement: spending per household member
    → type = "savings"
      → 📖 Savings Report: receipts − expenses, with "saved" indicator
```

---

### Flow 15: Savings Graph

```
🟧 TransactionRecorded (ongoing)
  → 🟪 Policy: "At end of each month → SnapshotMonthlyBalance"
    → 🟦 SnapshotMonthlyBalance
      → 🟩 BalanceSnapshot (month, totalSaved)
        → 🟧 BalanceSnapshotTaken

📖 Read Model: Savings Graph (line chart, month by month)
```

---

## Phase 3 — Automation & Integrations

### Flow 16: Bank Import

```
⏰ Daily Scheduler (morning, before first login)
  → 🟦 ImportTransactions (bankConnectionId)
    → ⬜ Bank API
      → 🟩 ImportBatch
        → 🟧 TransactionsImported (count, accountId)

🟪 Policy: "When TransactionsImported → CreateUncategorizedTransactions"
  → 🟦 CreateUncategorizedTransaction (×N)
    → 🟩 Transaction (status = uncategorized)
      → 🟧 UncategorizedTransactionCreated (×N)

--- later, on user login (see Flow 2) ---

🟨 Household Member
  → 🟦 CategorizeTransaction (transactionId, categoryId)
    → 🟩 Transaction
      → 🟧 TransactionCategorized
        → 🟪 Policy: "When TransactionCategorized → CheckBudget"
          → (continues into Flow 11)
```

**🔴 Hot Spots:**
- Duplicate detection: what if the bank sends the same transaction twice?
- Auto-categorization: can the system suggest a category based on merchant name?
- What if the bank API is down? Retry logic? Notify user?

---

### Flow 17: Manage Subscriptions

```
🟨 Household Member
  → 🟦 RegisterSubscription (name, amount, billingDay, accountId)
    → 🟩 Subscription
      → 🟧 SubscriptionRegistered
```

### Flow 18: Subscription Reminders (Automated)

```
⏰ Daily Scheduler
  → 🟦 CheckSubscriptionsDue
    → 🟩 Subscription (for each active)
      → IF billingDate − today ≤ 3 days:
          → 🟧 SubscriptionPaymentDue
            → 🟪 Policy: "Send upcoming payment reminder"
              → ⬜ Notification Service

      → IF billingDate < today AND no matching transaction found:
          → 🟧 SubscriptionOverdue
            → 🟪 Policy: "Send overdue alert"
              → ⬜ Notification Service
```

**🔴 Hot Spots:**
- How to match a subscription to a transaction? By amount + account + date range?
- What tolerance for matching? (exact amount, or within 5%?)
- Can subscriptions have variable amounts (e.g., electricity)?

---

### Flow 19: Attach Receipt

```
🟨 Household Member
  → 🟦 AttachReceipt (transactionId, file)
    → 🟩 Transaction
      → 🟧 ReceiptAttached

📖 Read Model: Transaction Detail (now shows receipt thumbnail)
```

**🔴 Hot Spots:**
- File size limit? Accepted formats (JPEG, PNG, PDF)?
- Storage: cloud (S3/Azure Blob) or local?

---

### Flow 19b: Import Transaction from Receipt

```
🟨 Household Member
  → 🟦 UploadReceipt (file)
    → ⬜ OCR / AI Service
      → Extract: date, total amount, merchant name, line items
      → 🟧 ReceiptDataExtracted

📖 Read Model: Draft Transaction (pre-filled form for user review)

🟨 Household Member (reviews and corrects)
  → 🟦 ConfirmReceiptTransaction (date, amount, accountId, categoryId, comment, receiptRef)
    → 🟩 Transaction (with Receipt attached)
      → 🟧 TransactionRecorded
        → 🟪 CheckBudget (see Flow 11)
        → 📖 Update Dashboard, Reports
```

**🔴 Hot Spots:**
- Which OCR/AI service? (Azure AI Document Intelligence, Google Vision, Tesseract?)
- How to handle multi-item receipts? One transaction per receipt, or multiple?
- What if OCR fails or extracts garbage? User must be able to fill in manually.
- Should the system suggest a category based on merchant name?
- Can the user reject the draft entirely and start a manual transaction instead?

---

### Flow 20: Track Bank Promotions

```
🟨 Household Member
  → 🟦 RegisterPromotion (name, bank, conditions[], promoUrl, termsUrl, activePeriod)
    → 🟩 Promotion
      → 🟧 PromotionRegistered

⏰ Monthly Scheduler (end of month)
  → 🟦 EvaluatePromotionCompliance (promotionId, month)
    → 🟩 Promotion
      → For each PromotionCondition:
          → Query transaction data
          → Mark as Met / Unmet
      → 🟧 PromotionComplianceEvaluated
        → IF any condition Unmet:
            → 🟧 PromotionConditionUnmet
              → 🟪 Policy: "Send alert"
                → ⬜ Notification Service

⏰ Monthly Scheduler (beginning of month)
  → 🟪 Policy: "Send reminder of conditions to meet this month"
    → ⬜ Notification Service
      → 🟧 PromotionReminderSent
```

**🔴 Hot Spots:**
- Condition types: number of transactions, minimum card spend, salary deposit, etc.
- How to evaluate arbitrary conditions against transaction data?
- What if a promotion spans multiple accounts?

---

## Phase 4 — Wealth & Forecasting

### Flow 21: Track Assets & Encumbrances

```
🟨 Household Member
  → 🟦 RecordAsset (name, type, estimatedValue)
    → 🟩 Asset
      → 🟧 AssetRecorded

🟨 Household Member
  → 🟦 RecordEncumbrance (name, type, remainingBalance, monthlyPayment)
    → 🟩 Encumbrance
      → 🟧 EncumbranceRecorded

🟨 Household Member
  → 🟦 UpdateAssetValue (assetId, newValue)
    → 🟩 Asset
      → 🟧 AssetValueUpdated

🟪 Policy: "When AssetValueUpdated OR EncumbranceRecorded → RecalculateNetWorth"
  → 🟦 RecalculateNetWorth
    → 🟩 NetWorthSnapshot (Σ Assets − Σ Encumbrances)
      → 🟧 NetWorthRecalculated

📖 Read Models:
  - Net Worth Dashboard (current value, goal, gap)
  - Net Worth History Graph (month over month)
```

---

### Flow 22: Net Worth Goal & Reminders

```
🟨 Household Member
  → 🟦 SetNetWorthGoal (targetAmount)
    → 🟩 NetWorthGoal
      → 🟧 NetWorthGoalSet

⏰ Monthly Scheduler
  → 🟪 Policy: "Remind user to update asset values"
    → ⬜ Notification Service
      → 🟧 AssetUpdateReminderSent
```

---

### Flow 23: Retirement Forecasting

```
🟨 Household Member
  → 📖 ForecastRetirement (currentAge, targetAge, desiredMonthlyIncome, currentSavings)
    → Calculate:
      → Scenario A: "Save X PLN/month to have Y PLN/month at age Z"
      → Scenario B: "Work until age X to have Y PLN/month"
      → Scenario C: "At current savings rate, you'll have X PLN/month at age Y"
    → 📖 Retirement Projection (3 scenarios displayed)
```

**🔴 Hot Spots:**
- Inflation rate assumption?
- Investment return rate assumption?
- Country-specific pension system rules (ZUS in Poland)?

---

### Flow 24: AI-Powered Budget Forecasting

```
⏰ Monthly Scheduler (or on-demand)
  → 🟦 GenerateBudgetForecast (categoryId, monthsOfHistory)
    → ⬜ AI Forecasting Service
      → Analyze spending patterns from last N months
      → 🟩 Forecast
        → 🟧 BudgetForecastGenerated
          → 📖 Suggested budgets for next month
```

**🔴 Hot Spots:**
- Which AI/ML approach? Simple moving average, or full ML model?
- Confidence level display?
- User ability to accept/reject AI suggestions?

---

## Summary: Complete Event Flow Map

> This shows how events cascade across bounded contexts. Read top-to-bottom.

```
══════════════════════════════════════════════════════════════════════
 IDENTITY & ACCESS
══════════════════════════════════════════════════════════════════════

🟨 New User
├─► 🟦 RegisterUser ──► 🟩 User ──► 🟧 UserRegistered
│                                      │
│                          ┌───────────┴───────────┐
│                          ▼                       ▼
│                   🟦 CreateHousehold       🟦 JoinHousehold
│                    ▼                       ▼
│              🟧 HouseholdCreated    🟧 MemberJoinedHousehold
│                    │
│                    ▼
│              🟪 SeedDefaultCategories
│                    ▼
│              🟧 CategoryCreated (×N)
│
├─► 🟦 InviteMember (email) ──► 🟩 Invitation ──► 🟧 InvitationSent
│                                                        │
│                                                        ▼
│                                                  ⬜ Email Service
│
└─► 🟦 AcceptInvitation ──► 🟩 Invitation ──► 🟧 InvitationAccepted
                                                     │
                                                     ▼
                                              🟪 RegisterUser + JoinHousehold

🟨 Returning User
└─► 🟦 AuthenticateUser ──► 🟩 User ──► 🟧 UserLoggedIn
                                              │
                                              ▼
                                    🟪 "If uncategorized transactions exist"
                                              │
                                              ▼
                                    📖 Show uncategorized prompt

══════════════════════════════════════════════════════════════════════
 TRANSACTION MANAGEMENT
══════════════════════════════════════════════════════════════════════

🟨 Household Member
├─► 🟦 RecordTransaction ──► 🟩 Transaction ──► 🟧 TransactionRecorded
│                                                     │
│                                    ┌────────────────┼────────────────┐
│                                    ▼                ▼                ▼
│                           🟪 CheckBudget    📖 Update Dashboard   📖 Update Reports
│                                    │
│                                    ▼
│                            (if over limit)
│                           🟧 BudgetExceeded
│                                    │
│                                    ▼
│                           🟪 SendBudgetAlert ──► ⬜ Notification
│
├─► 🟦 SplitTransaction ──► 🟩 Transaction ──► 🟧 TransactionSplit
│                                                     │
│                                                     ▼
│                                            🟪 CheckBudget (per split category)
│
├─► 🟦 CategorizeTransaction ──► 🟩 Transaction ──► 🟧 TransactionCategorized
│        (imported, uncategorized)                         │
│                                                          ▼
│                                                 🟪 CheckBudget
│                                                          │
│                                              ┌───────────┴───────────┐
│                                              ▼                       ▼
│                                      📖 Update Dashboard      📖 Update Reports
│
├─► 🟦 AttachReceipt ──► 🟩 Transaction ──► 🟧 ReceiptAttached
│                                                  │
│                                                  ▼
│                                          📖 Transaction Detail (thumbnail)
│
├─► 🟦 UploadReceipt ──► ⬜ OCR/AI Service ──► 🟧 ReceiptDataExtracted
│                                                     │
│                                                     ▼
│                                             📖 Draft Transaction (pre-filled)
│                                                     │
│                                                     ▼
│   🟦 ConfirmReceiptTransaction ──► 🟩 Transaction ──► 🟧 TransactionRecorded
│                                      (+ Receipt)          │
│                                                    🟪 CheckBudget + 📖 Updates
│
├─► 🟦 CreateCategory ──► 🟩 Category ──► 🟧 CategoryCreated
├─► 🟦 RenameCategory ──► 🟩 Category ──► 🟧 CategoryRenamed
├─► 🟦 DeleteCategory ──► 🟩 Category ──► 🟧 CategoryDeleted
│       (❓ Rule: no orphaned transactions)
│
└─► 🟦 AddAccount ──► 🟩 Account ──► 🟧 AccountCreated
         (name, currency)                   │
                                            ▼
                                   🟪 "If currency ≠ mainCurrency → FetchExchangeRate"
                                            │
                                            ▼
                                   ⬜ Exchange Rate Service ──► 🟧 ExchangeRateFetched

📖 Read Models:
  - Transaction List (filtered by date, user, category, account, amount)
  - Filtered Sum
  - Transaction Detail (with splits, receipt)
  - Category List
  - Account List

══════════════════════════════════════════════════════════════════════
 BUDGETING
══════════════════════════════════════════════════════════════════════

🟨 Household Member
└─► 🟦 SetBudget ──► 🟩 Budget ──► 🟧 BudgetSet
         (categoryId, month, limit, projectedReceipts)

🟧 TransactionRecorded / TransactionCategorized / TransactionSplit
  → 🟪 CheckBudget (categoryId, month)
      → 🟩 Budget
        → IF actual ≥ limit:
            → 🟧 BudgetExceeded ──► 🟪 SendBudgetAlert ──► ⬜ Notification
        → 📖 BudgetStatus (green/red)

📖 Read Models:
  - Budget Overview (per-category limit vs. actual)
  - Forecast (projected expenses, receipts, savings)

══════════════════════════════════════════════════════════════════════
 BANK INTEGRATION
══════════════════════════════════════════════════════════════════════

⏰ Daily Scheduler (or 🟨 Household Member on demand)
└─► 🟦 ImportTransactions ──► ⬜ Bank API ──► 🟩 ImportBatch ──► 🟧 TransactionsImported
                                                                        │
                                                                        ▼
                                                  🟪 CreateUncategorizedTransaction (×N)
                                                                        │
                                                                        ▼
                                                  🟩 Transaction (×N) ──► 🟧 UncategorizedTransactionCreated (×N)

  ─── later, on login (see UserLoggedIn above) ───

🟨 Household Member
└─► 🟦 CategorizeTransaction (×N) ──► (see Transaction Management above)

══════════════════════════════════════════════════════════════════════
 SUBSCRIPTION MANAGEMENT
══════════════════════════════════════════════════════════════════════

🟨 Household Member
└─► 🟦 RegisterSubscription ──► 🟩 Subscription ──► 🟧 SubscriptionRegistered

⏰ Daily Scheduler
└─► 🟦 CheckSubscriptionsDue ──► 🟩 Subscription (each active)
      ├─► IF due in ≤ 3 days ──► 🟧 SubscriptionPaymentDue ──► ⬜ Notification
      └─► IF overdue + no matching txn ──► 🟧 SubscriptionOverdue ──► ⬜ Notification

══════════════════════════════════════════════════════════════════════
 CURRENCY EXCHANGE
══════════════════════════════════════════════════════════════════════

⏰ Daily Scheduler
└─► 🟦 SyncExchangeRates ──► ⬜ Exchange Rate Service ──► 🟧 ExchangeRatesUpdated
                                                                │
                                                                ▼
                                                  📖 Recalculate multi-currency totals
                                                  📖 Update Dashboard, Reports, Account List

══════════════════════════════════════════════════════════════════════
 PROMOTION TRACKING
══════════════════════════════════════════════════════════════════════

🟨 Household Member
└─► 🟦 RegisterPromotion ──► 🟩 Promotion ──► 🟧 PromotionRegistered

⏰ Monthly Scheduler (end of month)
└─► 🟦 EvaluatePromotionCompliance ──► 🟩 Promotion ──► 🟧 PromotionComplianceEvaluated
                                                               │
                                                               ▼
                                                    (if unmet) 🟧 PromotionConditionUnmet
                                                               │
                                                               ▼
                                                         ⬜ Notification

⏰ Monthly Scheduler (beginning of month)
└─► 🟪 SendPromotionReminder ──► ⬜ Notification ──► 🟧 PromotionReminderSent

══════════════════════════════════════════════════════════════════════
 WEALTH MANAGEMENT
══════════════════════════════════════════════════════════════════════

🟨 Household Member
├─► 🟦 RecordAsset ──► 🟩 Asset ──► 🟧 AssetRecorded ──┐
├─► 🟦 UpdateAssetValue ──► 🟩 Asset ──► 🟧 AssetValueUpdated ──┤
├─► 🟦 RecordEncumbrance ──► 🟩 Encumbrance ──► 🟧 EncumbranceRecorded ──┤
│                                                                         │
│   🟪 "When any asset/encumbrance changes → RecalculateNetWorth" ◄───────┘
│     → 🟩 NetWorthSnapshot ──► 🟧 NetWorthRecalculated
│                                      │
│                                      ▼
│                              📖 Net Worth Dashboard
│                              📖 Net Worth History Graph
│
└─► 🟦 SetNetWorthGoal ──► 🟩 NetWorthGoal ──► 🟧 NetWorthGoalSet

⏰ Monthly Scheduler
└─► 🟪 RemindToUpdateAssets ──► ⬜ Notification ──► 🟧 AssetUpdateReminderSent

📖 Read Models:
  - Retirement Projection (3 scenarios from ForecastRetirement query)

══════════════════════════════════════════════════════════════════════
 REPORTING & ANALYTICS
══════════════════════════════════════════════════════════════════════

📖 Dashboard (composite read model, updated by TransactionRecorded/Categorized/Split):
  - Pie chart: expenses by category
  - Monthly balance (receipts − expenses)
  - Total expenses / Total receipts
  - Budget status
  - Account summary

📖 Reports (generated on demand):
  - Monthly statement
  - Yearly summary
  - Category summary
  - Period comparison (month-to-month, year-to-year)
  - Per-user statement
  - Savings report

⏰ Monthly Scheduler
└─► 🟦 SnapshotMonthlyBalance ──► 🟩 BalanceSnapshot ──► 🟧 BalanceSnapshotTaken
                                                                │
                                                                ▼
                                                        📖 Savings Graph

══════════════════════════════════════════════════════════════════════
 AI FORECASTING
══════════════════════════════════════════════════════════════════════

⏰ Monthly Scheduler (or on-demand)
└─► 🟦 GenerateBudgetForecast ──► ⬜ AI Service ──► 🟩 Forecast ──► 🟧 BudgetForecastGenerated
                                                                          │
                                                                          ▼
                                                                  📖 Suggested budgets
```

---

## All Hot Spots (Consolidated)

> These are open questions to resolve before or during implementation.

| # | Hot Spot | Context | Priority |
|---|----------|---------|----------|
| HS-1 | What are the default categories? | Identity & Access | MVP |
| HS-2 | Can a user belong to multiple households? | Identity & Access | MVP |
| HS-3 | What happens to data if a member leaves? | Identity & Access | MVP |
| HS-4 | Invitation expiry period? | Identity & Access | MVP |
| HS-5 | Income vs. expense: negative amounts or separate type field? | Transaction Management | MVP |
| HS-6 | Can you backdate transactions? | Transaction Management | MVP |
| HS-7 | Can you split into the same category twice? | Transaction Management | MVP |
| HS-8 | Can you unsplit (revert to single category)? | Transaction Management | MVP |
| HS-9 | Default filter on transaction list page load? | Transaction Management | MVP |
| HS-10 | Pagination or infinite scroll? | Transaction Management | MVP |
| HS-11 | Sum: income and expense separately, or net? | Transaction Management | MVP |
| HS-12 | Dashboard: fixed to current month or selectable? | Reporting | MVP |
| HS-13 | Dashboard refresh frequency? | Reporting | MVP |
| HS-14 | Precompute aggregates or calculate on the fly? | Reporting | MVP |
| HS-15 | Export reports to PDF/CSV? | Reporting | MVP |
| HS-16 | Category hierarchy (subcategories)? | Transaction Management | Phase 2+ |
| HS-17 | Budget alert threshold: 100% or earlier warning? | Budgeting | Phase 2 |
| HS-18 | Split transactions: check budget per split category? | Budgeting | Phase 2 |
| HS-19 | Budget alert frequency: once or every overspend? | Budgeting | Phase 2 |
| HS-20 | Bank import duplicate detection | Bank Integration | Phase 3 |
| HS-21 | Auto-categorization by merchant name? | Bank Integration | Phase 3 |
| HS-22 | Bank API downtime: retry logic? | Bank Integration | Phase 3 |
| HS-23 | Subscription matching tolerance (amount, date) | Subscription Management | Phase 3 |
| HS-24 | Variable-amount subscriptions? | Subscription Management | Phase 3 |
| HS-25 | Receipt file size limit and formats | Transaction Management | Phase 3 |
| HS-26 | Receipt storage: cloud provider? | Infrastructure | Phase 3 |
| HS-27 | Promotion condition types and evaluation engine | Promotion Tracking | Phase 3 |
| HS-28 | Which OCR/AI service for receipt scanning? | Transaction Management | Phase 3 |
| HS-29 | Multi-item receipts: one transaction or many? | Transaction Management | Phase 3 |
| HS-30 | OCR failure fallback: auto-switch to manual entry? | Transaction Management | Phase 3 |
| HS-31 | Auto-suggest category from merchant name on receipt? | Transaction Management | Phase 3 |
| HS-32 | Retirement: inflation & return rate assumptions | Wealth Management | Phase 4 |
| HS-33 | AI forecasting: simple average vs. ML model? | Budgeting | Phase 4 |
