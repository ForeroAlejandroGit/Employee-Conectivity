import { prisma } from '../../lib/prisma';
import { syncGeminiActivity } from '../../lib/google-api';

/**
 * Syncs Gemini data from the Google Activity Reports API,
 * then recalculates connectivity scores for all affected dates.
 */
export async function runGeminiSync() {
  const log = await prisma.syncLog.create({
    data: { jobType: 'gemini_api', status: 'started' },
  });

  const start = Date.now();

  try {
    console.log('[Gemini Sync] Starting Activity Reports fetch…');
    const result = await syncGeminiActivity();

    console.log(
      `\n[Gemini Sync] Done: ${result.totalRecords} records stored for ${result.datesProcessed.length} dates`,
    );

    if (result.errors.length > 0) {
      console.warn('[Gemini Sync] Errors:', result.errors);
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
    console.error('[Gemini Sync] Fatal error:', error.message);
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
