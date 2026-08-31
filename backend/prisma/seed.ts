import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { seedCategories } from './seed-categories';
import { seedProducts } from './seed-products';

const prisma = new PrismaClient();

async function seedUsers() {
  const adminHash = await bcrypt.hash('Admin123!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@shoptaj.com' },
    update: {},
    create: {
      email: 'admin@shoptaj.com',
      passwordHash: adminHash,
      fullName: 'Admin User',
      role: 'ADMIN',
      isEmailVerified: true,
      cart: { create: {} },
    },
  });
  console.log('✅ Admin user: admin@shoptaj.com');

  const userHash = await bcrypt.hash('User1234!', 12);
  await prisma.user.upsert({
    where: { email: 'user@shoptaj.com' },
    update: {},
    create: {
      email: 'user@shoptaj.com',
      passwordHash: userHash,
      fullName: 'John Doe',
      role: 'USER',
      isEmailVerified: true,
      cart: { create: {} },
    },
  });
  console.log('✅ Test user: user@shoptaj.com');
}

async function seedCoupons() {
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minOrderValue: 20,
      isActive: true,
    },
  });
  await prisma.coupon.upsert({
    where: { code: 'SAVE20' },
    update: {},
    create: {
      code: 'SAVE20',
      discountType: 'FIXED',
      discountValue: 20,
      minOrderValue: 100,
      isActive: true,
    },
  });
  console.log('✅ Coupons created');
}

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@shoptaj.com' } });
  if (existing) {
    console.log('✅ Already seeded — skipping');
    return;
  }
  console.log('🌱 Seeding database...');

  await seedUsers();
  const categoryIds = await seedCategories(prisma);
  await seedProducts(prisma, categoryIds);
  await seedCoupons();

  console.log('\n🎉 Seed complete!');
  console.log('Admin:     admin@shoptaj.com / Admin123!');
  console.log('Test user: user@shoptaj.com  / User1234!');
  console.log('Coupons:   WELCOME10 (10%), SAVE20 ($20 off)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
