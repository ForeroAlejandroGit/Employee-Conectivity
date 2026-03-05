import { PrismaClient } from '@prisma/client';
import { COEFFICIENT_SETS, EXCLUDED_EMAILS } from '../config/coefficients';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding coefficient sets…');

  for (const [, coeff] of Object.entries(COEFFICIENT_SETS)) {
    await prisma.coefficientSet.upsert({
      where: { name: coeff.name },
      create: { ...coeff, isActive: true },
      update: { ...coeff },
    });
    console.log(`  ✓ ${coeff.name}`);
  }

  // Mark any existing employees with excluded emails
  console.log(`Marking ${EXCLUDED_EMAILS.length} service emails as excluded…`);
  for (const email of EXCLUDED_EMAILS) {
    await prisma.employee.updateMany({
      where: { email },
      data: { excluded: true },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
