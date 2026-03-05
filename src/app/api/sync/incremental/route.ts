import { NextResponse } from 'next/server';
import { addDays, startOfDay } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { syncGoogleMetricsForDateRange, syncChatAndMeetings } from '@/lib/google-api';
import { calculateScoresForDate } from '@/lib/score-calculator';

/**
 * POST /api/sync/incremental
 *
 * Fetches only missing data: starts from the day after the last DailyMetric
 * date in the database (or 7 days ago if the DB is empty) up to today - 3 days.
 * Then recalculates scores for every newly processed date.
 */
export async function POST() {
  const start = Date.now();

  // Find the latest date already in the DB
  const latest = await prisma.dailyMetric.findFirst({
    orderBy: { date: 'desc' },
    select: { date: true },
  });

  const fromDate = latest
    ? startOfDay(addDays(latest.date, 1))
    : addDays(new Date(), -7);

  const results: Record<string, any> = {
    fromDate: fromDate.toISOString().slice(0, 10),
    lastDbDate: latest ? latest.date.toISOString().slice(0, 10) : null,
  };

  try {
    results.google = await syncGoogleMetricsForDateRange(fromDate);
  } catch (error: any) {
    results.google = { error: error.message };
  }

  try {
    results.chatMeet = await syncChatAndMeetings(fromDate);
  } catch (error: any) {
    results.chatMeet = { error: error.message };
  }

  // Collect all dates that got new data
  const allDates = new Set([
    ...(results.google?.datesProcessed ?? []),
    ...(results.chatMeet?.datesProcessed ?? []),
  ]);

  const scoreResults: Record<string, any> = {};
  for (const dateStr of Array.from(allDates).sort()) {
    try {
      const d = new Date(`${dateStr}T00:00:00.000Z`);
      scoreResults[dateStr] = await calculateScoresForDate(d);
    } catch (error: any) {
      scoreResults[dateStr] = { error: error.message };
    }
  }

  results.scores = scoreResults;
  results.datesWithNewData = allDates.size;
  results.durationMs = Date.now() - start;

  return NextResponse.json(results);
}
