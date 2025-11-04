// scripts/seed-subscriptions.js (optional utility)
import prisma from '../src/config/prisma.js';

const seed = async () => {
  const tenants = await prisma.tenant.findMany();
  const now = new Date();
  const next = new Date(now);
  next.setMonth(next.getMonth() + 1);

  for (const t of tenants) {
    await prisma.subscription.upsert({
      where: { tenantId: t.id },
      create: {
        tenantId: t.id,
        plan: 'FREE',
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: next,
      },
      update: {},
    });
  }
  console.log('Seeded subscriptions for all tenants.');
  process.exit(0);
};

seed().catch(e => { console.error(e); process.exit(1); });
