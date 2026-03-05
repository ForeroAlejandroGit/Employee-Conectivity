import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDateRange } from '@/lib/date-utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { startDate, endDate } = getDateRange(searchParams);
  const divisionId = searchParams.get('divisionId');
  const category = searchParams.get('category');

  // Build employee filter
  const empWhere: any = { excluded: false, state: 'Activo' };
  if (divisionId) empWhere.divisionId = divisionId;
  if (category) empWhere.category = category;

  const departments = await prisma.department.findMany({
    include: {
      employees: {
        where: empWhere,
        include: {
          dailyScores: {
            where: { date: { gte: startDate, lte: endDate } },
            select: {
              totalScore: true,
              emailActive: true,
              driveActive: true,
              chatActive: true,
              meetingsActive: true,
            },
          },
        },
      },
    },
  });

  const rows = departments
    .map((dept) => {
      const allScores = dept.employees.flatMap((e) => e.dailyScores);
      const avgScore = allScores.length
        ? allScores.reduce((s, x) => s + x.totalScore, 0) / allScores.length
        : 0;

      return {
        id: dept.id,
        name: dept.name,
        employeeCount: dept.employees.length,
        avgScore: Math.round(avgScore * 100) / 100,
        emailRate: allScores.length
          ? Math.round(
              (allScores.filter((s) => s.emailActive > 0).length /
                allScores.length) *
                100,
            )
          : 0,
        driveRate: allScores.length
          ? Math.round(
              (allScores.filter((s) => s.driveActive > 0).length /
                allScores.length) *
                100,
            )
          : 0,
        chatRate: allScores.length
          ? Math.round(
              (allScores.filter((s) => s.chatActive > 0).length /
                allScores.length) *
                100,
            )
          : 0,
        meetingsRate: allScores.length
          ? Math.round(
              (allScores.filter((s) => s.meetingsActive > 0).length /
                allScores.length) *
                100,
            )
          : 0,
      };
    })
    .filter((d) => d.employeeCount > 0)
    .sort((a, b) => b.avgScore - a.avgScore);

  return NextResponse.json({ departments: rows });
}
