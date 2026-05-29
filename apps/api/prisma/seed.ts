import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { CategoryType, PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_EXPENSE_CATEGORIES = [
  'Housing',
  'Bills & Utilities',
  'Groceries & Household',
  'Transport',
  'Health',
  'Telecom',
  'Dining Out',
  'Entertainment & Culture',
  'Clothing & Footwear',
  'Hygiene & Beauty',
  'Sports & Recreation',
  'Education & Development',
  'Travel & Vacation',
  'Gifts & Donations',
  'Savings & Investments',
  'Debt Repayment',
  'Pets',
  'Other Expenses',
];

const DEFAULT_INCOME_CATEGORIES = [
  'Salary',
  'Side Income',
  'Benefits & Refunds',
  'Interest & Investments',
  'Other Income',
];

async function main() {
  const existingCategories = await prisma.category.count();
  if (existingCategories > 0) {
    console.log('Database already seeded. Skipping.');
    return;
  }

  const user = await prisma.user.create({
    data: {
      email: 'dev@example.com',
      displayName: 'Dev User',
      passwordHash: 'not-a-real-hash',
    },
  });

  const household = await prisma.household.create({
    data: {
      name: 'Dev Household',
      mainCurrency: 'USD',
    },
  });

  await prisma.userHousehold.create({
    data: {
      userId: user.id,
      householdId: household.id,
    },
  });

  await prisma.account.create({
    data: {
      householdId: household.id,
      name: 'Cash',
      currency: 'USD',
      initialBalance: 0,
      isDefault: true,
    },
  });

  for (let i = 0; i < DEFAULT_EXPENSE_CATEGORIES.length; i++) {
    await prisma.category.create({
      data: {
        householdId: household.id,
        name: DEFAULT_EXPENSE_CATEGORIES[i],
        type: CategoryType.EXPENSE,
        sortOrder: i,
      },
    });
  }

  for (let i = 0; i < DEFAULT_INCOME_CATEGORIES.length; i++) {
    await prisma.category.create({
      data: {
        householdId: household.id,
        name: DEFAULT_INCOME_CATEGORIES[i],
        type: CategoryType.INCOME,
        sortOrder: i,
      },
    });
  }

  console.log(
    'Seed completed: user, household, account, and 23 categories created.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
