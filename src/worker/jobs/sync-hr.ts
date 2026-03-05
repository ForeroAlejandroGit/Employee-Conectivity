import { prisma } from '../../lib/prisma';
import { syncHrEmployees } from '../../lib/hr-api';

export async function runHrSync() {
  const log = await prisma.syncLog.create({
    data: { jobType: 'hr_api', status: 'started' },
  });

  const start = Date.now();

  try {
    console.log('[HR Sync] Fetching employee roster from HR API…');
    const result = await syncHrEmployees();

    console.log(
      `[HR Sync] Synced ${result.synced} employees, skipped ${result.skipped}, duplicates resolved ${result.duplicatesResolved}`,
    );

    if (result.errors.length > 0) {
      console.warn('[HR Sync] Errors:', result.errors);
    }

    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: 'completed',
        recordsCount: result.synced,
        errorMessage:
          result.errors.length > 0 ? result.errors.join('; ') : null,
        durationMs: Date.now() - start,
      },
    });

    return result;
  } catch (error: any) {
    console.error('[HR Sync] Fatal error:', error.message);
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
