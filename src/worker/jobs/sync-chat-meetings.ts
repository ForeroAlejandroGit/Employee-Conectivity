import { prisma } from '../../lib/prisma';
import { syncChatAndMeetings } from '../../lib/google-api';
import { calculateScoresForDate } from '../../lib/score-calculator';

/**
 * Syncs Chat and Meeting data from the Google Activity Reports API,
 * then recalculates connectivity scores for all affected dates.
 *
 * Uses scope: admin.reports.audit.readonly
 * (separate from the email/drive sync which uses admin.reports.usage.readonly)
 */
export async function runChatMeetingsSync() {
  const log = await prisma.syncLog.create({
    data: { jobType: 'chat_meet_api', status: 'started' },
  });

  const start = Date.now();

  try {
    console.log('[Chat/Meet Sync] Starting Activity Reports fetch…');
    const result = await syncChatAndMeetings();

    console.log(
      `\n[Chat/Meet Sync] Done: ${result.totalRecords} records stored for ${result.datesProcessed.length} dates`,
    );

    if (result.errors.length > 0) {
      console.warn('[Chat/Meet Sync] Errors:', result.errors);
    }

    // Recalculate scores for every date that got new chat/meeting data
    if (result.datesProcessed.length > 0) {
      console.log(
        `[Chat/Meet Sync] Recalculating scores for ${result.datesProcessed.length} dates…`,
      );

      for (let i = 0; i < result.datesProcessed.length; i++) {
        const dateStr = result.datesProcessed[i];
        const d = new Date(`${dateStr}T00:00:00.000Z`);
        const scores = await calculateScoresForDate(d);
        console.log(
          `  [${dateStr}] recalculated ${scores.calculated} scores  [${i + 1}/${result.datesProcessed.length}]`,
        );
      }
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
    console.error('[Chat/Meet Sync] Fatal error:', error.message);
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
