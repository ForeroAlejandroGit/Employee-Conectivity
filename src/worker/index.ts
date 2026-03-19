import cron from 'node-cron';
import { runHrSync } from './jobs/sync-hr';
import { runGoogleSync } from './jobs/sync-google';
import { runChatMeetingsSync } from './jobs/sync-chat-meetings';
import { runGeminiSync } from './jobs/sync-gemini';

/**
 * Worker process — runs independently from Next.js.
 *
 * Start with:  npm run worker      (production)
 *              npm run worker:dev   (auto-restart on file changes)
 *
 * Schedule: Daily at 02:00 AM local time.
 *
 * Pipeline order:
 *   1. HR Sync          — refresh the employee roster first
 *   2. Google Sync       — fetch email/drive metrics (User Usage Reports)
 *   3. Chat/Meet Sync   — fetch chat & meeting activity (Activity Reports)
 *   4. Gemini Sync      — fetch Gemini usage activity (Activity Reports)
 *   5. Score calculation — runs inside steps 2, 3 & 4 per date
 */

async function runFullPipeline() {
  const start = Date.now();
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`[Worker] Full sync started at ${new Date().toISOString()}`);
  console.log('═'.repeat(60));

  try {
    await runHrSync();
  } catch (e) {
    console.error('[Worker] HR sync failed — continuing to Google sync');
  }

  try {
    await runGoogleSync();
  } catch (e) {
    console.error('[Worker] Google sync (email/drive) failed');
  }

  try {
    await runChatMeetingsSync();
  } catch (e) {
    console.error('[Worker] Chat/Meet sync failed');
  }

  try {
    await runGeminiSync();
  } catch (e) {
    console.error('[Worker] Gemini sync failed');
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n[Worker] Pipeline finished in ${elapsed}s\n`);
}

// ── Schedule ────────────────────────────────────────────
cron.schedule('0 2 * * *', runFullPipeline, {
  timezone: 'America/Bogota',
});

console.log('[Worker] CRON scheduler started — next run at 02:00 AM COT');
console.log('[Worker] Press Ctrl+C to stop\n');

// Run immediately on first start so data is available right away
runFullPipeline();
