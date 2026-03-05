import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { subDays } from 'date-fns';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId');
  const days = parseInt(searchParams.get('days') || '30', 10);

  const now = new Date();
  const startDate = subDays(now, days);

  if (!employeeId) {
    return NextResponse.json(
      { error: 'employeeId is required' },
      { status: 400 },
    );
  }

  const scores = await prisma.dailyScore.findMany({
    where: {
      employeeId,
      date: { gte: startDate, lte: now },
    },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      totalScore: true,
      emailActive: true,
      driveActive: true,
      chatActive: true,
      meetingsActive: true,
      coefficientSet: true,
    },
  });

  const metrics = await prisma.dailyMetric.findMany({
    where: {
      employeeId,
      date: { gte: startDate, lte: now },
    },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      emailsSent: true,
      filesEdited: true,
      filesViewed: true,
      filesCreated: true,
      meetingCount: true,
      meetingMinutes: true,
      chatMessagesSent: true,
    },
  });

  return NextResponse.json({ scores, metrics });
}
