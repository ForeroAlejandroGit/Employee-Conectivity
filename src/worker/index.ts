import cron from 'node-cron';
import { runHrSync } from './jobs/sync-hr';
import { runGoogleSync } from './jobs/sync-google';
import { runChatMeetingsSync } from './jobs/sync-chat-meetings';
import { runGeminiSync } from './jobs/sync-gemini';
import { calculateScoresForDate } from '../lib/score-calculator';

/**
 * Worker process — runs independently from Next.js.
 *
 * Start with:  npm run worker      (production)
 *              npm run worker:dev   (auto-restart on file changes)
 *
 * Schedule: Daily at 02:00 AM local time.
 *
 * Pipeline order:
 *   1. HR Sync                    — refresh the employee roster first
 *   2-4. Google + Chat/Meet + Gemini — run in PARALLEL (different DB columns)
 *   5. Score calculation           — runs ONCE after all 3 syncs finish
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

  // Run the 3 Google API syncs in parallel — they write to different columns
  // of DailyMetric so there are no data conflicts between them.
  console.log('\n[Worker] Starting Google, Chat/Meet and Gemini syncs in parallel…');
  const [googleResult, chatMeetResult, geminiResult] = await Promise.allSettled([
    runGoogleSync(),
    runChatMeetingsSync(),
    runGeminiSync(),
  ]);

  if (googleResult.status === 'rejected')
    console.error('[Worker] Google sync (email/drive) failed:', googleResult.reason);
  if (chatMeetResult.status === 'rejected')
    console.error('[Worker] Chat/Meet sync failed:', chatMeetResult.reason);
  if (geminiResult.status === 'rejected')
    console.error('[Worker] Gemini sync failed:', geminiResult.reason);

  // Collect all unique dates from all 3 jobs and recalculate scores ONCE per date.
  // Running scores here (after all jobs finish) ensures every score reflects the
  // complete metric record — email + drive + chat + meetings + gemini all written.
  const allDates = new Set<string>();
  if (googleResult.status === 'fulfilled' && googleResult.value)
    googleResult.value.datesProcessed.forEach((d) => allDates.add(d));
  if (chatMeetResult.status === 'fulfilled' && chatMeetResult.value)
    chatMeetResult.value.datesProcessed.forEach((d) => allDates.add(d));
  if (geminiResult.status === 'fulfilled' && geminiResult.value)
    geminiResult.value.datesProcessed.forEach((d) => allDates.add(d));

  if (allDates.size > 0) {
    console.log(`\n[Worker] Recalculating scores for ${allDates.size} unique date(s)…`);
    for (const dateStr of Array.from(allDates).sort()) {
      const d = new Date(`${dateStr}T00:00:00.000Z`);
      const scores = await calculateScoresForDate(d);
      console.log(`  [${dateStr}] ${scores.calculated} scores calculated`);
    }
  } else {
    console.log('\n[Worker] No new dates — score recalculation skipped.');
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
