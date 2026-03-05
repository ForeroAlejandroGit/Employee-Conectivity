import { prisma } from '../../lib/prisma';
import { recalculateAllScores } from '../../lib/score-calculator';

export async function runScoreCalculation() {
  const log = await prisma.syncLog.create({
    data: { jobType: 'score_calc', status: 'started' },
  });

  const start = Date.now();

  try {
    console.log('[Score Calc] Recalculating scores for all available dates…');
    const result = await recalculateAllScores();

    console.log(
      `[Score Calc] Processed ${result.dates} dates, ${result.total} total scores`,
    );

    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: 'completed',
        recordsCount: result.total,
        durationMs: Date.now() - start,
      },
    });

    return result;
  } catch (error: any) {
    console.error('[Score Calc] Fatal error:', error.message);
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
