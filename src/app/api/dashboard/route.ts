import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDateRange } from '@/lib/date-utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { startDate, endDate } = getDateRange(searchParams);
  const departmentId = searchParams.get('departmentId');
  const divisionId = searchParams.get('divisionId');
  const category = searchParams.get('category');

  // Previous period (same length, immediately before)
  const periodMs = endDate.getTime() - startDate.getTime();
  const prevEndDate = new Date(startDate.getTime() - 1);
  const prevStartDate = new Date(prevEndDate.getTime() - periodMs);

  // Build filter
  const employeeFilter: any = { excluded: false, state: 'Activo' };
  if (departmentId) employeeFilter.departmentId = departmentId;
  if (divisionId) employeeFilter.divisionId = divisionId;
  if (category) employeeFilter.category = category;

  // Current period scores
  const scores = await prisma.dailyScore.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      employee: employeeFilter,
    },
    include: { employee: { select: { id: true } } },
  });

  // Previous period scores (for delta comparison)
  const prevScores = await prisma.dailyScore.findMany({
    where: {
      date: { gte: prevStartDate, lte: prevEndDate },
      employee: employeeFilter,
    },
  });

  const avg = (arr: { totalScore: number }[]) =>
    arr.length ? arr.reduce((s, x) => s + x.totalScore, 0) / arr.length : 0;

  const avgScore = avg(scores);
  const prevAvgScore = avg(prevScores);

  const activeEmployees = new Set(scores.map((s) => s.employee.id)).size;
  const totalEmployees = await prisma.employee.count({
    where: employeeFilter,
  });

  const rate = (
    field: 'emailActive' | 'driveActive' | 'chatActive' | 'meetingsActive',
  ) =>
    scores.length
      ? Math.round(
          (scores.filter((s) => s[field] > 0).length / scores.length) * 100,
        )
      : 0;

  // Trend data — avg score per day
  const trendMap = new Map<string, { sum: number; count: number }>();
  for (const s of scores) {
    const key = s.date.toISOString().slice(0, 10);
    const entry = trendMap.get(key) ?? { sum: 0, count: 0 };
    entry.sum += s.totalScore;
    entry.count++;
    trendMap.set(key, entry);
  }
  const trend = Array.from(trendMap.entries())
    .map(([date, { sum, count }]) => ({
      date,
      score: Math.round((sum / count) * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Last sync info
  const lastSync = await prisma.syncLog.findFirst({
    where: { status: 'completed' },
    orderBy: { createdAt: 'desc' },
  });

  // Available months (months that actually have score data)
  const distinctDates = await prisma.dailyScore.findMany({
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'desc' },
  });
  const monthsWithData = Array.from(
    new Set(distinctDates.map((d) => d.date.toISOString().slice(0, 7))),
  )
    .sort()
    .reverse();

  return NextResponse.json({
    avgScore: Math.round(avgScore * 100) / 100,
    prevAvgScore: Math.round(prevAvgScore * 100) / 100,
    scoreDelta: Math.round((avgScore - prevAvgScore) * 100) / 100,
    activeEmployees,
    totalEmployees,
    activityRates: {
      email: rate('emailActive'),
      drive: rate('driveActive'),
      chat: rate('chatActive'),
      meetings: rate('meetingsActive'),
    },
    trend,
    lastSyncAt: lastSync?.createdAt ?? null,
    monthsWithData,
  });
}
