import { NextResponse } from 'next/server';
import { syncHrEmployees } from '@/lib/hr-api';
import { syncGoogleMetricsForDateRange, syncChatAndMeetings } from '@/lib/google-api';
import { recalculateAllScores } from '@/lib/score-calculator';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/sync — manual trigger for the full data pipeline.
 * Runs: HR sync → Google sync → Score recalculation.
 */
export async function POST() {
  const start = Date.now();
  const results: Record<string, any> = {};

  try {
    // 1. HR employee roster
    results.hr = await syncHrEmployees();
  } catch (error: any) {
    results.hr = { error: error.message };
  }

  try {
    // 2. Google Workspace metrics (email/drive)
    results.google = await syncGoogleMetricsForDateRange();
  } catch (error: any) {
    results.google = { error: error.message };
  }

  try {
    // 3. Chat & Meeting activity (Activity Reports API)
    results.chatMeet = await syncChatAndMeetings();
  } catch (error: any) {
    results.chatMeet = { error: error.message };
  }

  try {
    // 4. Recalculate all scores
    results.scores = await recalculateAllScores();
  } catch (error: any) {
    results.scores = { error: error.message };
  }

  results.durationMs = Date.now() - start;

  return NextResponse.json(results);
}

/** GET /api/sync — returns recent sync log entries. */
export async function GET() {
  const logs = await prisma.syncLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({ logs });
}
