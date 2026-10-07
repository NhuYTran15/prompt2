import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [adminRole, customerRole, bronzeMembership] = await Promise.all([
    prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: { name: 'ADMIN' },
    }),
    prisma.role.upsert({
      where: { name: 'CUSTOMER' },
      update: {},
      create: { name: 'CUSTOMER' },
    }),
    prisma.membership.upsert({
      where: { name: 'BRONZE' },
      update: {},
      create: { name: 'BRONZE', score: 0 },
    }),
  ]);

  await Promise.all([
    prisma.membership.upsert({
      where: { name: 'SILVER' },
      update: { score: 1000 },
      create: { name: 'SILVER', score: 1000 },
    }),
    prisma.membership.upsert({
      where: { name: 'GOLD' },
      update: { score: 5000 },
      create: { name: 'GOLD', score: 5000 },
    }),
  ]);

  const username = process.env.ADMIN_USERNAME ?? 'admin';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin@123456';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { username },
    update: { roleId: adminRole.id },
    create: {
      username,
      fullName: process.env.ADMIN_FULLNAME ?? 'System Administrator',
      passwordHash,
      roleId: adminRole.id,
      membershipId: bronzeMembership.id,
    },
  });

  console.log(`Seed completed. Roles: ${adminRole.name}, ${customerRole.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
