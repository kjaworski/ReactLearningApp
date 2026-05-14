# Functional Requirements – Personal & Household Finance Manager

A web application for managing personal and household finances. Designed for couples and families who want a single, shared view of all their accounts, expenses, budgets, and wealth — with equal access for every household member. Mobile-first, responsive, with a modern UI.

---

## 1. Manual Transaction Entry

1. Date
2. Amount
3. Category
4. User
5. Comment
6. Account name

## 2. Import Transactions from Banks' APIs

1. Automatic import, e.g. once a day (in the morning, during the first login)
2. Ability to import on demand
3. After login, request to user to view imported transactions and assign categories

## 3. Split Transaction Across Categories

1. Example: I buy groceries and household chemicals in one transaction and assign the corresponding parts of the total transaction amount to two different categories

## 4. Filter Transactions (single value or range)

1. User
2. Date
3. Category
4. Account
5. Amount

## 5. Sum of Filtered Transactions

Sum of all loaded amounts at the bottom of the table with transactions.

## 6. Custom Expense Categories

Define my own expense categories.

## 7. User Registration & Login

1. Password
2. Google ID

## 8. Reports

1. Monthly statement
2. Yearly summary
3. Summary for each category
4. Comparison to previous period (month to month, year to year)
5. Statement for individual users
6. Information if we saved anything

## 9. Subscription Integration

Integration with subscriptions (like Netflix, Play, Energa, etc.).

1. Reminder of upcoming payments
2. Reminder of overdue payments

## 10. Multi-Currency Accounts

1. Rate taken from some service
2. In reports a summary with conversion to the main currency

## 11. Budget (Spending Limit)

1. Budget for each category
2. Alerts when the budget is exceeded
3. Expenses below budget colored in green and above budget in red
4. Recording of projected receipts
5. Forecasted total expenses, total receipts, and savings (difference between receipts and expenses)
6. Forecasted value of budgets based on previous months' data
   1. Integration with AI

## 12. Web and Mobile Access

1. Mobile-first
2. Responsiveness

## 13. Dark Mode / Light Mode

Switching between dark and light mode.

## 14. Modern UI Design

## 15. Asset Graph

See how my savings are going month by month.

## 16. Dashboard with Summary

1. Pie chart with categories of biggest expenses
2. Balance in a given month
3. Total expenses in a given month
4. Total receipts in a given month
5. Budgets
6. Summary of accounts
7. Custom widgets (text, image, chosen report)

## 17. Receipt Management

1. Attach a photo or scan of a receipt to any transaction
2. Import a transaction by uploading a receipt — OCR/AI extracts date, amount, and merchant; user reviews and confirms

## 18. Bank Promotion Tracking

1. Register a bank promotion with conditions (e.g., 5 card transactions/month, minimum spend)
2. System evaluates conditions monthly against transaction data
3. Alerts when conditions are unmet; monthly reminders of conditions to meet

## 19. Assets & Encumbrances (Net Worth)

1. Record assets (apartment, car, investments) with estimated value
2. Record encumbrances (mortgage, loans) with remaining balance
3. Net worth = total assets − total encumbrances
4. Set a net worth goal
5. Monthly reminders to update asset values

## 20. Retirement Forecasting

1. Enter current age, target retirement age, desired monthly income, current savings
2. System calculates scenarios: how much to save, how long to work, projected pension
