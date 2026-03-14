import prisma from '../config/prisma.js';

/**
 * Enhanced Ledger Service with Double-Entry Accounting
 * Implements proper accounting for Assets, Liabilities, Equity, Revenue, Expenses
 */

/**
 * Get or create an account (chart of accounts entry)
 */
export async function ensureAccount(tx, tenantId, name, type) {
  return tx.account.upsert({
    where: { id: `${tenantId}-${name}` },
    update: {},
    create: {
      id: `${tenantId}-${name}`,
      tenantId,
      name,
      type,
    },
  });
}

/**
 * Create double-entry ledger posts (debit + credit)
 */
export async function createLedgerEntry(tx, tenantId, {
  debitAccountName,
  creditAccountName,
  amount,
  description,
  reference,
  debitType = 'ASSET',
  creditType = 'REVENUE'
}) {
  const debitAccount = await ensureAccount(tx, tenantId, debitAccountName, debitType);
  const creditAccount = await ensureAccount(tx, tenantId, creditAccountName, creditType);

  const entries = await tx.ledgerEntry.createMany({
    data: [
      {
        tenantId,
        accountId: debitAccount.id,
        type: 'DEBIT',
        amount,
        description,
        reference,
      },
      {
        tenantId,
        accountId: creditAccount.id,
        type: 'CREDIT',
        amount,
        description,
        reference,
      },
    ],
  });

  return entries;
}

/**
 * Get all ledger entries with filtering
 */
export async function getLedgerEntries(tenantId, query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 50)));
  const skip = (page - 1) * limit;

  const where = {
    tenantId,
    ...(query.accountId && { accountId: query.accountId }),
    ...(query.type && { type: query.type }),
    ...(query.startDate && query.endDate && {
      createdAt: {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      },
    }),
  };

  const [data, total] = await prisma.$transaction([
    prisma.ledgerEntry.findMany({
      where,
      include: { account: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.ledgerEntry.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

/**
 * Get trial balance (sum of debits and credits by account)
 */
export async function getTrialBalance(tenantId) {
  const entries = await prisma.ledgerEntry.findMany({
    where: { tenantId },
    include: { account: true },
  });

  const accountBalances = {};

  entries.forEach(entry => {
    const accountId = entry.accountId;
    if (!accountBalances[accountId]) {
      accountBalances[accountId] = {
        account: entry.account,
        debit: 0,
        credit: 0,
      };
    }

    if (entry.type === 'DEBIT') {
      accountBalances[accountId].debit += entry.amount;
    } else {
      accountBalances[accountId].credit += entry.amount;
    }
  });

  const accounts = Object.values(accountBalances).map(acc => ({
    ...acc,
    balance: acc.debit - acc.credit,
  }));

  const totalDebits = accounts.reduce((sum, acc) => sum + acc.debit, 0);
  const totalCredits = accounts.reduce((sum, acc) => sum + acc.credit, 0);

  return {
    accounts,
    summary: {
      totalDebits,
      totalCredits,
      balanced: Math.abs(totalDebits - totalCredits) < 0.01,
    },
  };
}

/**
 * Get financial statements (Income Statement, Balance Sheet)
 */
export async function getIncomeStatement(tenantId, startDate, endDate) {
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      tenantId,
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      account: {
        type: { in: ['REVENUE', 'EXPENSE'] },
      },
    },
    include: { account: true },
  });

  let totalRevenue = 0;
  let totalExpenses = 0;

  entries.forEach(entry => {
    if (entry.account.type === 'REVENUE' && entry.type === 'CREDIT') {
      totalRevenue += entry.amount;
    } else if (entry.account.type === 'EXPENSE' && entry.type === 'DEBIT') {
      totalExpenses += entry.amount;
    }
  });

  const netIncome = totalRevenue - totalExpenses;

  return {
    period: { startDate, endDate },
    revenue: totalRevenue,
    expenses: totalExpenses,
    netIncome,
    data: entries,
  };
}

/**
 * Get balance sheet (Assets, Liabilities, Equity)
 */
export async function getBalanceSheet(tenantId) {
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      tenantId,
      account: {
        type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] },
      },
    },
    include: { account: true },
  });

  const accountBalances = {};

  entries.forEach(entry => {
    const accountId = entry.accountId;
    if (!accountBalances[accountId]) {
      accountBalances[accountId] = {
        account: entry.account,
        balance: 0,
      };
    }

    if (entry.type === 'DEBIT') {
      if (['ASSET', 'EXPENSE'].includes(entry.account.type)) {
        accountBalances[accountId].balance += entry.amount;
      } else {
        accountBalances[accountId].balance -= entry.amount;
      }
    } else {
      if (['LIABILITY', 'EQUITY', 'REVENUE'].includes(entry.account.type)) {
        accountBalances[accountId].balance += entry.amount;
      } else {
        accountBalances[accountId].balance -= entry.amount;
      }
    }
  });

  const assets = Object.values(accountBalances)
    .filter(acc => acc.account.type === 'ASSET')
    .map(acc => acc.balance)
    .reduce((sum, balance) => sum + balance, 0);

  const liabilities = Object.values(accountBalances)
    .filter(acc => acc.account.type === 'LIABILITY')
    .map(acc => acc.balance)
    .reduce((sum, balance) => sum + balance, 0);

  const equity = Object.values(accountBalances)
    .filter(acc => acc.account.type === 'EQUITY')
    .map(acc => acc.balance)
    .reduce((sum, balance) => sum + balance, 0);

  return {
    assets,
    liabilities,
    equity,
    totalLiabilitiesAndEquity: liabilities + equity,
    balanced: Math.abs(assets - (liabilities + equity)) < 0.01,
    accounts: Object.values(accountBalances),
  };
}

/**
 * Calculate financial ratios
 */
export async function getFinancialRatios(tenantId) {
  const { data: payments } = await prisma.payment.findMany({
    where: { tenantId },
    select: { amount: true },
  }).catch(() => ({ data: [] }));

  const { data: invoices } = await prisma.invoice.findMany({
    where: { tenantId },
    select: { total: true, status: true },
  }).catch(() => ({ data: [] }));

  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalInvoices = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const paidInvoices = invoices.filter(inv => inv.status === 'PAID').length;
  const totalInvoiceCount = invoices.length;

  return {
    paymentCollectionRate: totalInvoiceCount > 0 ? (paidInvoices / totalInvoiceCount * 100).toFixed(2) : 0,
    averagePaymentAmount: totalPayments > 0 ? (totalPayments / payments.length).toFixed(2) : 0,
    outstandingRevenue: totalInvoices - totalPayments,
    paymentPercentage: totalInvoices > 0 ? (totalPayments / totalInvoices * 100).toFixed(2) : 0,
  };
}
