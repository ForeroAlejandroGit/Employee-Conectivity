import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const [divisions, departments, categories] = await Promise.all([
    prisma.division.findMany({
      where: { employees: { some: { excluded: false, state: 'Activo' } } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.department.findMany({
      where: { employees: { some: { excluded: false, state: 'Activo' } } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.employee.findMany({
      where: { excluded: false, state: 'Activo', category: { not: '' } },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    }),
  ]);

  return NextResponse.json({
    divisions: divisions.map((d) => ({ id: d.id, name: d.name })),
    departments: departments.map((d) => ({ id: d.id, name: d.name })),
    categories: categories.map((c) => c.category).filter(Boolean),
  });
}
