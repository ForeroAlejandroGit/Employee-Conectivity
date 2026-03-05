import { prisma } from '../../lib/prisma';
import { syncGoogleMetricsForDateRange } from '../../lib/google-api';
import { calculateScoresForDate } from '../../lib/score-calculator';

export async function runGoogleSync() {
  const log = await prisma.syncLog.create({
    data: { jobType: 'google_api', status: 'started' },
  });

  const start = Date.now();

  try {
    console.log('[Google Sync] Starting data fetch for rolling 14-day window…');
    const result = await syncGoogleMetricsForDateRange();

    console.log(
      `[Google Sync] Fetched ${result.totalRecords} records for dates: ${result.datesProcessed.join(', ') || '(none new)'}`,
    );

    if (result.errors.length > 0) {
      console.warn('[Google Sync] Errors:', result.errors);
    }

    // Calculate scores for every newly-fetched date
    for (const dateStr of result.datesProcessed) {
      const d = new Date(`${dateStr}T00:00:00.000Z`);
      const scores = await calculateScoresForDate(d);
      console.log(
        `[Google Sync] Calculated ${scores.calculated} scores for ${dateStr}`,
      );
    }

    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: 'completed',
        recordsCount: result.totalRecords,
        dateRangeFrom: result.datesProcessed.length
          ? new Date(`${result.datesProcessed[0]}T00:00:00.000Z`)
          : null,
        dateRangeTo: result.datesProcessed.length
          ? new Date(
              `${result.datesProcessed[result.datesProcessed.length - 1]}T00:00:00.000Z`,
            )
          : null,
        errorMessage:
          result.errors.length > 0 ? result.errors.join('; ') : null,
        durationMs: Date.now() - start,
      },
    });

    return result;
  } catch (error: any) {
    console.error('[Google Sync] Fatal error:', error.message);
    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: 'failed',
        errorMessage: error.message,
        durationMs: Date.now() - start,
      },
    });
    throw error;
  }
}
