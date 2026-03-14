import prisma from '../config/prisma.js';

export async function addLedgerEntry({ tenantId, type, amount, description, relatedInvoiceId = null, reference = null, category = null, date = null }) {
  // Find or create a default account for this tenant
  let account = await prisma.account.findFirst({
    where: { tenantId, type: type === 'INCOME' ? 'REVENUE' : 'EXPENSE' },
  });
  if (!account) {
    account = await prisma.account.create({
      data: {
        tenantId,
        name: type === 'INCOME' ? 'General Revenue' : 'General Expense',
        type: type === 'INCOME' ? 'REVENUE' : 'EXPENSE',
      },
    });
  }

  return await prisma.ledgerEntry.create({
    data: {
      tenantId,
      type:        type?.toUpperCase(),
      amount:      parseFloat(amount),
      description,
      accountId:   account.id,
      reference:   reference || relatedInvoiceId || null,
    },
  });
}

export async function getLedgerEntries({ tenantId, type, startDate, endDate, limit = 500 }) {
  return await prisma.ledgerEntry.findMany({
    where: {
      tenantId,
      ...(type && { type: type.toUpperCase() }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    },
    include: { account: true },
    orderBy: { createdAt: 'desc' },
    take: Number(limit) || 500,
  });
}

export async function deleteLedgerEntry({ id, tenantId }) {
  const entry = await prisma.ledgerEntry.findFirst({ where: { id, tenantId } });
  if (!entry) return null;
  return await prisma.ledgerEntry.delete({ where: { id } });
}

export async function getLedgerSummary(tenantId) {
  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.ledgerEntry.aggregate({
      where: { tenantId, type: 'INCOME' },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: { tenantId, type: 'EXPENSE' },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome  = Number(incomeAgg._sum.amount  || 0);
  const totalExpense = Number(expenseAgg._sum.amount || 0);
  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    // legacy field names (backwards compat)
    totalCredit: totalIncome,
    totalDebit:  totalExpense,
  };
}
