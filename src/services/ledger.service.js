import prisma from '../config/prisma.js';

export async function addLedgerEntry({ tenantId, type, amount, description, relatedInvoiceId = null }) {
  return await prisma.ledger.create({
    data: {
      tenantId,
      type,
      amount,
      description,
      relatedInvoiceId,
    },
  });
}

export async function getLedgerEntries({ tenantId, type, startDate, endDate }) {
  return await prisma.ledger.findMany({
    where: {
      tenantId,
      ...(type && { type }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getLedgerSummary(tenantId) {
  const credit = await prisma.ledger.aggregate({
    where: { tenantId, type: 'credit' },
    _sum: { amount: true },
  });

  const debit = await prisma.ledger.aggregate({
    where: { tenantId, type: 'debit' },
    _sum: { amount: true },
  });

  return {
    totalCredit: credit._sum.amount || 0,
    totalDebit: debit._sum.amount || 0,
    balance: (credit._sum.amount || 0) - (debit._sum.amount || 0),
  };
}
