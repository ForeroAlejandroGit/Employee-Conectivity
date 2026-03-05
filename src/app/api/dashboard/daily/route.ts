import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDateRange } from '@/lib/date-utils';
import { isBusinessDay, isColombianHoliday, getHolidayName } from '@/lib/colombian-holidays';
import { eachDayOfInterval, format, isWeekend } from 'date-fns';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { startDate, endDate } = getDateRange(searchParams);
  const divisionId = searchParams.get('divisionId');
  const departmentId = searchParams.get('departmentId');
  const category = searchParams.get('category');
  const employeeName = searchParams.get('employeeName');
  const employeeId = searchParams.get('employeeId');   // single employee view
  const scoreRange = searchParams.get('scoreRange');    // e.g. "0.6-0.8"

  // Build employee filter
  const employeeFilter: any = { excluded: false, state: 'Activo' };
  if (employeeId) {
    employeeFilter.id = employeeId;
  } else {
    if (divisionId) employeeFilter.divisionId = divisionId;
    if (departmentId) employeeFilter.departmentId = departmentId;
    if (category) employeeFilter.category = category;
    if (employeeName) {
      employeeFilter.OR = [
        { name: { contains: employeeName } },
        { lastName: { contains: employeeName } },
        { email: { contains: employeeName } },
      ];
    }
  }

  // If scoreRange is given, further restrict to employees whose avg score
  // for the period falls in that range.
  let filteredEmployeeIds: string[] | null = null;
  if (scoreRange && !employeeId) {
    const [minStr, maxStr] = scoreRange.split('-');
    const minScore = parseFloat(minStr);
    const maxScore = parseFloat(maxStr);

    if (!isNaN(minScore) && !isNaN(maxScore)) {
      const grouped = await prisma.dailyScore.groupBy({
        by: ['employeeId'],
        where: {
          date: { gte: startDate, lte: endDate },
          employee: employeeFilter,
        },
        _avg: { totalScore: true },
      });

      filteredEmployeeIds = grouped
        .filter((g) => {
          const avg = g._avg.totalScore ?? 0;
          return avg >= minScore && avg < maxScore;
        })
        .map((g) => g.employeeId);
    }
  }

  // Final score filter
  const scoreWhere: any = {
    date: { gte: startDate, lte: endDate },
    employee: employeeFilter,
  };
  if (filteredEmployeeIds !== null) {
    scoreWhere.employeeId = { in: filteredEmployeeIds };
  }

  // Fetch all daily scores for the period with filters
  const scores = await prisma.dailyScore.findMany({
    where: scoreWhere,
    select: {
      date: true,
      totalScore: true,
      emailActive: true,
      driveActive: true,
      chatActive: true,
      meetingsActive: true,
    },
  });

  // Group scores by date
  const byDate = new Map<string, {
    sum: number;
    count: number;
    emailActive: number;
    driveActive: number;
    chatActive: number;
    meetingsActive: number;
  }>();

  for (const s of scores) {
    const key = s.date.toISOString().slice(0, 10);
    const entry = byDate.get(key) ?? {
      sum: 0, count: 0,
      emailActive: 0, driveActive: 0, chatActive: 0, meetingsActive: 0,
    };
    entry.sum += s.totalScore;
    entry.count++;
    entry.emailActive += s.emailActive;
    entry.driveActive += s.driveActive;
    entry.chatActive += s.chatActive;
    entry.meetingsActive += s.meetingsActive;
    byDate.set(key, entry);
  }

  // Generate all days in the interval with metadata
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  const daily = allDays.map((d) => {
    const dateStr = format(d, 'yyyy-MM-dd');
    const entry = byDate.get(dateStr);
    const weekend = isWeekend(d);
    const holiday = isColombianHoliday(d);
    const holidayName = getHolidayName(d);
    const business = isBusinessDay(d);

    return {
      date: dateStr,
      dayOfWeek: format(d, 'EEE'),
      dayNumber: d.getDate(),
      isWeekend: weekend,
      isHoliday: holiday,
      holidayName,
      isBusinessDay: business,
      score: entry ? Math.round((entry.sum / entry.count) * 1000) / 1000 : null,
      employeeCount: entry?.count ?? 0,
      emailRate: entry ? Math.round((entry.emailActive / entry.count) * 100) : 0,
      driveRate: entry ? Math.round((entry.driveActive / entry.count) * 100) : 0,
      chatRate: entry ? Math.round((entry.chatActive / entry.count) * 100) : 0,
      meetingsRate: entry ? Math.round((entry.meetingsActive / entry.count) * 100) : 0,
    };
  });

  // Also compute top and bottom performers (respects all filters)
  const empScores = await prisma.dailyScore.groupBy({
    by: ['employeeId'],
    where: scoreWhere,
    _avg: { totalScore: true },
    _count: { totalScore: true },
  });

  const empIds = empScores.map((e) => e.employeeId);
  const empDetails = await prisma.employee.findMany({
    where: { id: { in: empIds } },
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      department: { select: { name: true } },
      category: true,
    },
  });

  const empMap = new Map(empDetails.map((e) => [e.id, e]));

  const ranked = empScores
    .map((e) => {
      const emp = empMap.get(e.employeeId);
      return {
        id: e.employeeId,
        name: emp ? `${emp.name} ${emp.lastName}` : '',
        email: emp?.email ?? '',
        department: emp?.department?.name ?? '',
        category: emp?.category ?? '',
        avgScore: Math.round((e._avg.totalScore ?? 0) * 1000) / 1000,
        daysTracked: e._count.totalScore,
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  // Score distribution buckets
  const distribution = [
    { range: '0.0 - 0.2', min: 0, max: 0.2, count: 0 },
    { range: '0.2 - 0.4', min: 0.2, max: 0.4, count: 0 },
    { range: '0.4 - 0.6', min: 0.4, max: 0.6, count: 0 },
    { range: '0.6 - 0.8', min: 0.6, max: 0.8, count: 0 },
    { range: '0.8 - 1.0', min: 0.8, max: 1.01, count: 0 },
  ];
  for (const emp of ranked) {
    for (const bucket of distribution) {
      if (emp.avgScore >= bucket.min && emp.avgScore < bucket.max) {
        bucket.count++;
        break;
      }
    }
  }

  return NextResponse.json({
    daily,
    topPerformers: ranked.slice(0, 10),
    bottomPerformers: ranked.slice(-10).reverse(),
    distribution: distribution.map((d) => ({ range: d.range, count: d.count })),
    totalEmployees: ranked.length,
    businessDaysWithData: daily.filter((d) => d.isBusinessDay && d.score !== null).length,
    totalBusinessDays: daily.filter((d) => d.isBusinessDay).length,
  });
}
