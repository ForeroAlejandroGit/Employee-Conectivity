import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { searchParams } = new URL(request.url);
  const monthStr = searchParams.get('month') ?? format(new Date(), 'yyyy-MM');
  const [year, mon] = monthStr.split('-').map(Number);
  const monthDate = new Date(year, mon - 1, 1);
  const startDate = startOfMonth(monthDate);
  const endDate = endOfMonth(monthDate);

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: {
      department: { select: { name: true } },
      division: { select: { name: true } },
    },
  });

  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  // Daily scores for the selected month
  const dailyScores = await prisma.dailyScore.findMany({
    where: {
      employeeId: params.id,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  });

  // Raw metrics for the selected month
  const dailyMetrics = await prisma.dailyMetric.findMany({
    where: {
      employeeId: params.id,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  });

  // Monthly summaries for the last 6 months
  const monthlySummaries = [];
  for (let i = 0; i < 6; i++) {
    const m = subMonths(monthDate, i);
    const ms = startOfMonth(m);
    const me = endOfMonth(m);
    const scores = await prisma.dailyScore.findMany({
      where: { employeeId: params.id, date: { gte: ms, lte: me } },
    });
    if (scores.length > 0) {
      const avg = scores.reduce((s, x) => s + x.totalScore, 0) / scores.length;
      monthlySummaries.push({
        month: format(m, 'yyyy-MM'),
        label: format(m, 'MMM yyyy'),
        avgScore: Math.round(avg * 1000) / 1000,
        daysTracked: scores.length,
        emailRate: Math.round((scores.filter((s) => s.emailActive > 0).length / scores.length) * 100),
        driveRate: Math.round((scores.filter((s) => s.driveActive > 0).length / scores.length) * 100),
        chatRate: Math.round((scores.filter((s) => s.chatActive > 0).length / scores.length) * 100),
        meetingsRate: Math.round((scores.filter((s) => s.meetingsActive > 0).length / scores.length) * 100),
        geminiRate: Math.round((scores.filter((s) => s.geminiActive > 0).length / scores.length) * 100),
      });
    }
  }

  // Build day-by-day data combining scores and metrics
  const metricsByDate = new Map(
    dailyMetrics.map((m) => [m.date.toISOString().slice(0, 10), m]),
  );

  const daily = dailyScores.map((s) => {
    const dateStr = s.date.toISOString().slice(0, 10);
    const metric = metricsByDate.get(dateStr);
    return {
      date: dateStr,
      totalScore: s.totalScore,
      emailActive: s.emailActive,
      driveActive: s.driveActive,
      chatActive: s.chatActive,
      meetingsActive: s.meetingsActive,
      geminiActive: s.geminiActive,
      emailsSent: metric?.emailsSent ?? 0,
      filesEdited: metric?.filesEdited ?? 0,
      filesViewed: metric?.filesViewed ?? 0,
      filesCreated: metric?.filesCreated ?? 0,
      chatMessagesSent: metric?.chatMessagesSent ?? 0,
      meetingCount: metric?.meetingCount ?? 0,
      geminiEvents: metric?.geminiEvents ?? 0,
    };
  });

  // Aggregate stats for the month
  const avgScore = dailyScores.length
    ? dailyScores.reduce((s, x) => s + x.totalScore, 0) / dailyScores.length
    : 0;

  return NextResponse.json({
    employee: {
      id: employee.id,
      name: employee.name,
      lastName: employee.lastName,
      email: employee.email,
      category: employee.category,
      position: employee.position,
      department: employee.department?.name ?? '—',
      division: employee.division?.name ?? '—',
      state: employee.state,
    },
    monthly: {
      month: monthStr,
      avgScore: Math.round(avgScore * 1000) / 1000,
      daysTracked: dailyScores.length,
      emailRate: dailyScores.length
        ? Math.round((dailyScores.filter((s) => s.emailActive > 0).length / dailyScores.length) * 100)
        : 0,
      driveRate: dailyScores.length
        ? Math.round((dailyScores.filter((s) => s.driveActive > 0).length / dailyScores.length) * 100)
        : 0,
      chatRate: dailyScores.length
        ? Math.round((dailyScores.filter((s) => s.chatActive > 0).length / dailyScores.length) * 100)
        : 0,
      meetingsRate: dailyScores.length
        ? Math.round((dailyScores.filter((s) => s.meetingsActive > 0).length / dailyScores.length) * 100)
        : 0,
      geminiRate: dailyScores.length
        ? Math.round((dailyScores.filter((s) => s.geminiActive > 0).length / dailyScores.length) * 100)
        : 0,
    },
    daily,
    monthlySummaries: monthlySummaries.reverse(),
  });
}
