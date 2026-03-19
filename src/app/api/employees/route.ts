import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDateRange } from '@/lib/date-utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const departmentId = searchParams.get('departmentId');
  const divisionId = searchParams.get('divisionId');
  const category = searchParams.get('category');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const sortBy = searchParams.get('sortBy') || 'name';
  const sortDir = searchParams.get('sortDir') || 'asc';
  const scoreRange = searchParams.get('scoreRange');

  const { startDate, endDate } = getDateRange(searchParams);

  // Build employee filter
  const where: any = { excluded: false, state: 'Activo' };
  if (departmentId) where.departmentId = departmentId;
  if (divisionId) where.divisionId = divisionId;
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
    ];
  }

  // If a score range filter is given, pre-compute which employees are in range
  let allowedEmployeeIds: string[] | null = null;
  if (scoreRange) {
    // Range format: "0.6 - 0.8" (from distribution buckets)
    const cleaned = scoreRange.replace(/\s/g, '');
    const [minStr, maxStr] = cleaned.split('-');
    const minScore = parseFloat(minStr);
    const maxScore = parseFloat(maxStr);

    if (!isNaN(minScore) && !isNaN(maxScore)) {
      const grouped = await prisma.dailyScore.groupBy({
        by: ['employeeId'],
        where: {
          date: { gte: startDate, lte: endDate },
          employee: where,
        },
        _avg: { totalScore: true },
      });
      allowedEmployeeIds = grouped
        .filter((g) => {
          const avg = g._avg.totalScore ?? 0;
          return avg >= minScore && avg < maxScore;
        })
        .map((g) => g.employeeId);
    }
  }

  // Final where clause
  const finalWhere = allowedEmployeeIds !== null
    ? { ...where, id: { in: allowedEmployeeIds } }
    : where;

  const totalCount = await prisma.employee.count({ where: finalWhere });

  const employees = await prisma.employee.findMany({
    where: finalWhere,
    include: {
      department: { select: { name: true } },
      division: { select: { name: true } },
      dailyScores: {
        where: { date: { gte: startDate, lte: endDate } },
        select: {
          totalScore: true,
          emailActive: true,
          driveActive: true,
          chatActive: true,
          meetingsActive: true,
          geminiActive: true,
          date: true,
        },
        orderBy: { date: 'desc' },
      },
    },
    skip: (page - 1) * limit,
    take: limit,
  });

  const rows = employees.map((emp) => {
    const scores = emp.dailyScores;
    const avgScore = scores.length
      ? scores.reduce((s, x) => s + x.totalScore, 0) / scores.length
      : 0;

    return {
      id: emp.id,
      name: emp.name,
      lastName: emp.lastName,
      email: emp.email,
      department: emp.department?.name ?? '—',
      division: emp.division?.name ?? '—',
      category: emp.category,
      avgScore: Math.round(avgScore * 100) / 100,
      emailRate: scores.length
        ? Math.round(
            (scores.filter((s) => s.emailActive > 0).length / scores.length) *
              100,
          )
        : 0,
      driveRate: scores.length
        ? Math.round(
            (scores.filter((s) => s.driveActive > 0).length / scores.length) *
              100,
          )
        : 0,
      chatRate: scores.length
        ? Math.round(
            (scores.filter((s) => s.chatActive > 0).length / scores.length) *
              100,
          )
        : 0,
      meetingsRate: scores.length
        ? Math.round(
            (scores.filter((s) => s.meetingsActive > 0).length /
              scores.length) *
              100,
          )
        : 0,
      geminiRate: scores.length
        ? Math.round(
            (scores.filter((s) => s.geminiActive > 0).length / scores.length) *
              100,
          )
        : 0,
      daysTracked: scores.length,
    };
  });

  rows.sort((a, b) => {
    const val =
      sortBy === 'name'
        ? `${a.name} ${a.lastName}`.localeCompare(`${b.name} ${b.lastName}`)
        : sortBy === 'department'
          ? a.department.localeCompare(b.department)
          : a.avgScore - b.avgScore;
    return sortDir === 'desc' ? -val : val;
  });

  return NextResponse.json({
    employees: rows,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
}
