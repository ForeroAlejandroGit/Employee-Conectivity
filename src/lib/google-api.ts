import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import {
  addDays,
  subDays,
  subMonths,
  startOfMonth,
  format,
  eachDayOfInterval,
} from 'date-fns';
import { prisma } from './prisma';

/**
 * Parameters that are PROVEN to work — identical to the Python script.
 * Chat and Meeting data is fetched separately via the Activity Reports API
 * (see syncChatAndMeetings below).
 */
const PARAMETERS = [
  'gmail:num_emails_sent',
  'accounts:last_login_time',
  'drive:num_items_edited',
  'drive:num_items_viewed',
  'drive:num_items_created',
].join(',');

// ── Shared helpers ──────────────────────────────────────

function readServiceAccountKey() {
  const keyPath = path.resolve(
    process.cwd(),
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH!,
  );
  return JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function safeInt(value: string | number | undefined | null): number {
  if (value == null) return 0;
  const n = typeof value === 'number' ? value : parseInt(value, 10);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Returns a dynamic skip threshold based on the number of active (non-excluded)
 * employees. A date is considered already synced if at least 50% of active
 * employees have data for it. Replaces the old hardcoded `> 10` check.
 */
async function getSkipThreshold(): Promise<number> {
  const count = await prisma.employee.count({ where: { excluded: false } });
  return Math.max(1, Math.floor(count * 0.5));
}

// ── Auth: User Usage Reports (email/drive/accounts) ─────

function getUsageAuthClient() {
  const key = readServiceAccountKey();
  return new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/admin.reports.usage.readonly'],
    subject: process.env.GOOGLE_ADMIN_EMAIL,
  });
}

// ── Auth: Activity Reports (chat/meet audit logs) ───────

function getAuditAuthClient() {
  const key = readServiceAccountKey();
  return new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/admin.reports.audit.readonly'],
    subject: process.env.GOOGLE_ADMIN_EMAIL,
  });
}

// ── Types ───────────────────────────────────────────────

export interface UserMetrics {
  email: string;
  emailsSent: number;
  lastLoginTime: Date | null;
  filesEdited: number;
  filesViewed: number;
  filesCreated: number;
  meetingCount: number;
  meetingMinutes: number;
  chatMessagesSent: number;
}

export interface SyncResult {
  datesProcessed: string[];
  totalRecords: number;
  errors: string[];
}

interface ActivityEvent {
  email: string;
  date: string; // yyyy-MM-dd
}

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 1:  User Usage Reports  (email, drive, accounts)
//  Scope: admin.reports.usage.readonly
//  Same API as cell 4 in test.ipynb
// ══════════════════════════════════════════════════════════════════════════

function parseUserReport(report: any): UserMetrics {
  const email: string = report.entity?.userEmail ?? '';
  const params: any[] = report.parameters ?? [];

  const m: UserMetrics = {
    email,
    emailsSent: 0,
    lastLoginTime: null,
    filesEdited: 0,
    filesViewed: 0,
    filesCreated: 0,
    meetingCount: 0,
    meetingMinutes: 0,
    chatMessagesSent: 0,
  };

  for (const p of params) {
    switch (p.name) {
      case 'gmail:num_emails_sent':
        m.emailsSent = safeInt(p.intValue);
        break;
      case 'accounts:last_login_time':
        m.lastLoginTime = p.datetimeValue ? new Date(p.datetimeValue) : null;
        break;
      case 'drive:num_items_edited':
        m.filesEdited = safeInt(p.intValue);
        break;
      case 'drive:num_items_viewed':
        m.filesViewed = safeInt(p.intValue);
        break;
      case 'drive:num_items_created':
        m.filesCreated = safeInt(p.intValue);
        break;
    }
  }

  return m;
}

export async function fetchGoogleMetrics(
  targetDate: string,
): Promise<UserMetrics[]> {
  const auth = getUsageAuthClient();
  const service = google.admin({ version: 'reports_v1', auth });

  const allMetrics: UserMetrics[] = [];
  let pageToken: string | undefined;

  do {
    const response: any = await service.userUsageReport.get({
      userKey: 'all',
      date: targetDate,
      parameters: PARAMETERS,
      pageToken,
    });

    const warnings = response.data?.warnings;
    if (warnings?.length) {
      const msgs = warnings.map((w: any) => w.message).join('; ');
      console.log(`  [${targetDate}] API warnings: ${msgs}`);
    }

    const reports: any[] = response.data?.usageReports ?? [];
    for (const report of reports) {
      allMetrics.push(parseUserReport(report));
    }

    pageToken = response.data?.nextPageToken ?? undefined;
  } while (pageToken);

  return allMetrics;
}

/**
 * Fetches Google Workspace usage data (email/drive) for a rolling 2-month window.
 * Skips dates already stored in the DB.
 */
export async function syncGoogleMetricsForDateRange(fromDate?: Date): Promise<SyncResult> {
  const today = new Date();
  const windowStart = fromDate ?? startOfMonth(subMonths(today, 2));
  const windowEnd = subDays(today, 3);

  const result: SyncResult = {
    datesProcessed: [],
    totalRecords: 0,
    errors: [],
  };

  const skipThreshold = await getSkipThreshold();
  const dates = eachDayOfInterval({ start: windowStart, end: windowEnd });
  console.log(
    `  Window: ${format(windowStart, 'yyyy-MM-dd')} → ${format(windowEnd, 'yyyy-MM-dd')} (${dates.length} days, skip threshold: ${skipThreshold})`,
  );

  for (const target of dates) {
    const dateStr = format(target, 'yyyy-MM-dd');
    const dateStart = new Date(`${dateStr}T00:00:00.000Z`);

    // Skip dates we already have (email/drive data)
    const existing = await prisma.dailyMetric.count({
      where: { date: dateStart },
    });
    if (existing >= skipThreshold) continue;

    try {
      console.log(`  [${dateStr}] fetching email/drive…`);
      const metrics = await fetchGoogleMetrics(dateStr);

      if (metrics.length === 0) {
        console.log(`  [${dateStr}] 0 users returned (not ready)`);
        continue;
      }

      console.log(
        `  [${dateStr}] ${metrics.length} user reports, matching…`,
      );
      let matched = 0;
      let unmatched = 0;

      for (const m of metrics) {
        const employee = await prisma.employee.findUnique({
          where: { email: m.email.toLowerCase() },
        });

        if (!employee || employee.excluded) {
          unmatched++;
          continue;
        }

        await prisma.dailyMetric.upsert({
          where: {
            employeeId_date: { employeeId: employee.id, date: dateStart },
          },
          create: {
            employeeId: employee.id,
            date: dateStart,
            emailsSent: m.emailsSent,
            lastLoginTime: m.lastLoginTime,
            filesEdited: m.filesEdited,
            filesViewed: m.filesViewed,
            filesCreated: m.filesCreated,
          },
          update: {
            emailsSent: m.emailsSent,
            lastLoginTime: m.lastLoginTime,
            filesEdited: m.filesEdited,
            filesViewed: m.filesViewed,
            filesCreated: m.filesCreated,
          },
        });

        matched++;
        result.totalRecords++;
      }

      console.log(
        `  [${dateStr}] ✓ ${matched} stored, ${unmatched} skipped`,
      );
      result.datesProcessed.push(dateStr);
    } catch (error: any) {
      const code = error?.code ?? error?.status ?? 'unknown';
      const msg = error?.message ?? String(error);
      if (code === 400) {
        console.log(`  [${dateStr}] not available yet (400)`);
      } else {
        console.error(`  [${dateStr}] ERROR (${code}): ${msg}`);
        result.errors.push(`${dateStr}: [${code}] ${msg}`);
      }
    }

    await delay(500);
  }

  return result;
}

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 2:  Activity Reports  (chat, meet)
//  Scope: admin.reports.audit.readonly
//  Same API as cell 6 in test.ipynb — PROVEN to work
// ══════════════════════════════════════════════════════════════════════════

/**
 * Fetches ALL activity events for a given Google application (chat or meet)
 * within a time range. Returns one record per event, which we then aggregate
 * by (email, date) to get daily counts.
 *
 * This uses the Activity Reports API (audit logs), NOT the User Usage Reports.
 * Requires scope: admin.reports.audit.readonly
 */
async function fetchActivityReports(
  applicationName: string,
  startTime: string,
  endTime: string,
): Promise<ActivityEvent[]> {
  const auth = getAuditAuthClient();
  const service = google.admin({ version: 'reports_v1', auth });

  const events: ActivityEvent[] = [];
  let pageToken: string | undefined;
  let pageCount = 0;

  do {
    const response: any = await service.activities.list({
      userKey: 'all',
      applicationName,
      startTime,
      endTime,
      pageToken,
    });

    pageCount++;
    const items: any[] = response.data?.items ?? [];
    console.log(`    Page ${pageCount}: ${items.length} events`);

    for (const item of items) {
      const email = (item.actor?.email ?? '').toLowerCase();
      const timestamp: string = item.id?.time ?? '';
      if (email && timestamp) {
        events.push({ email, date: timestamp.slice(0, 10) });
      }
    }

    pageToken = response.data?.nextPageToken ?? undefined;
  } while (pageToken);

  return events;
}

/**
 * Groups raw activity events by (email, date) → count.
 * Returns a Map<date, Map<email, count>>.
 */
function groupEventsByDay(
  events: ActivityEvent[],
): Map<string, Map<string, number>> {
  const byDay = new Map<string, Map<string, number>>();
  for (const e of events) {
    if (!byDay.has(e.date)) byDay.set(e.date, new Map());
    const dayMap = byDay.get(e.date)!;
    dayMap.set(e.email, (dayMap.get(e.email) ?? 0) + 1);
  }
  return byDay;
}

/**
 * Syncs Chat AND Meeting activity data from the Google Activity Reports API.
 *
 * Strategy (identical to test.ipynb cell 6):
 * - Fetches the full rolling 2-month window in one paginated API call per app.
 * - Groups events by (email, date) to get daily counts.
 * - Stores counts in DailyMetric (chatMessagesSent / meetingCount).
 * - Skips dates that already have data (chatMessagesSent > 0 or meetingCount > 0).
 * - Prints progress for every date stored so you can estimate time remaining.
 */
export async function syncChatAndMeetings(fromDate?: Date): Promise<SyncResult> {
  const today = new Date();
  const hardWindowStart = fromDate ?? startOfMonth(subMonths(today, 2));
  const windowEnd = subDays(today, 3);

  // Pre-filter: find the latest date already stored for chat AND meetings.
  // Use the earlier of the two so we don't leave gaps in partial coverage.
  const [latestChatRow, latestMeetRow] = await Promise.all([
    prisma.dailyMetric.findFirst({
      where: { chatMessagesSent: { gt: 0 } },
      orderBy: { date: 'desc' },
      select: { date: true },
    }),
    prisma.dailyMetric.findFirst({
      where: { meetingCount: { gt: 0 } },
      orderBy: { date: 'desc' },
      select: { date: true },
    }),
  ]);

  const latestDates = [latestChatRow?.date, latestMeetRow?.date].filter(Boolean) as Date[];
  const latestStored = latestDates.length
    ? latestDates.reduce((a, b) => (a < b ? a : b))
    : null;

  const windowStart = latestStored
    ? new Date(Math.max(addDays(latestStored, 1).getTime(), hardWindowStart.getTime()))
    : hardWindowStart;

  if (windowStart > windowEnd) {
    console.log('  [Chat/Meet] All dates up to date — nothing to fetch.');
    return { datesProcessed: [], totalRecords: 0, errors: [] };
  }

  const startTime = `${format(windowStart, 'yyyy-MM-dd')}T00:00:00.000Z`;
  const endTime = `${format(windowEnd, 'yyyy-MM-dd')}T23:59:59.000Z`;

  const skipThreshold = await getSkipThreshold();
  const result: SyncResult = {
    datesProcessed: [],
    totalRecords: 0,
    errors: [],
  };

  console.log(
    `  Window: ${format(windowStart, 'yyyy-MM-dd')} → ${format(windowEnd, 'yyyy-MM-dd')} (skip threshold: ${skipThreshold})`,
  );

  // ── 1. CHAT ───────────────────────────────────────────

  console.log(`\n  ── Fetching CHAT activity reports ──`);
  const t0Chat = Date.now();
  let chatEvents: ActivityEvent[] = [];

  try {
    chatEvents = await fetchActivityReports('chat', startTime, endTime);
    console.log(
      `  ✓ ${chatEvents.length} chat events fetched in ${((Date.now() - t0Chat) / 1000).toFixed(1)}s`,
    );
  } catch (error: any) {
    const msg = `Chat fetch failed: ${error.message}`;
    console.error(`  ✗ ${msg}`);
    result.errors.push(msg);
  }

  if (chatEvents.length > 0) {
    const chatByDay = groupEventsByDay(chatEvents);
    const chatDates = Array.from(chatByDay.keys()).sort();
    console.log(
      `  ${chatDates.length} days with chat activity, storing…`,
    );

    for (let i = 0; i < chatDates.length; i++) {
      const dateStr = chatDates[i];
      const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

      // Skip if chat data already stored for this date
      const existing = await prisma.dailyMetric.count({
        where: { date: dateObj, chatMessagesSent: { gt: 0 } },
      });
      if (existing >= skipThreshold) {
        console.log(
          `  [${dateStr}] chat already stored (${existing} records), skip  [${i + 1}/${chatDates.length}]`,
        );
        continue;
      }

      const dayMap = chatByDay.get(dateStr)!;
      let matched = 0;

      for (const [email, count] of Array.from(dayMap.entries())) {
        const employee = await prisma.employee.findUnique({
          where: { email },
        });
        if (!employee || employee.excluded) continue;

        await prisma.dailyMetric.upsert({
          where: {
            employeeId_date: { employeeId: employee.id, date: dateObj },
          },
          create: {
            employeeId: employee.id,
            date: dateObj,
            chatMessagesSent: count,
          },
          update: {
            chatMessagesSent: count,
          },
        });
        matched++;
        result.totalRecords++;
      }

      console.log(
        `  [${dateStr}] ✓ ${matched} chat records stored  [${i + 1}/${chatDates.length}]`,
      );
      if (!result.datesProcessed.includes(dateStr)) {
        result.datesProcessed.push(dateStr);
      }
    }
  }

  // ── 2. MEETINGS ───────────────────────────────────────

  console.log(`\n  ── Fetching MEET activity reports ──`);
  const t0Meet = Date.now();
  let meetEvents: ActivityEvent[] = [];

  try {
    meetEvents = await fetchActivityReports('meet', startTime, endTime);
    console.log(
      `  ✓ ${meetEvents.length} meet events fetched in ${((Date.now() - t0Meet) / 1000).toFixed(1)}s`,
    );
  } catch (error: any) {
    const msg = `Meet fetch failed: ${error.message}`;
    console.error(`  ✗ ${msg}`);
    result.errors.push(msg);
  }

  if (meetEvents.length > 0) {
    const meetByDay = groupEventsByDay(meetEvents);
    const meetDates = Array.from(meetByDay.keys()).sort();
    console.log(
      `  ${meetDates.length} days with meeting activity, storing…`,
    );

    for (let i = 0; i < meetDates.length; i++) {
      const dateStr = meetDates[i];
      const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

      // Skip if meeting data already stored for this date
      const existing = await prisma.dailyMetric.count({
        where: { date: dateObj, meetingCount: { gt: 0 } },
      });
      if (existing >= skipThreshold) {
        console.log(
          `  [${dateStr}] meet already stored (${existing} records), skip  [${i + 1}/${meetDates.length}]`,
        );
        continue;
      }

      const dayMap = meetByDay.get(dateStr)!;
      let matched = 0;

      for (const [email, count] of Array.from(dayMap.entries())) {
        const employee = await prisma.employee.findUnique({
          where: { email },
        });
        if (!employee || employee.excluded) continue;

        await prisma.dailyMetric.upsert({
          where: {
            employeeId_date: { employeeId: employee.id, date: dateObj },
          },
          create: {
            employeeId: employee.id,
            date: dateObj,
            meetingCount: count,
          },
          update: {
            meetingCount: count,
          },
        });
        matched++;
        result.totalRecords++;
      }

      console.log(
        `  [${dateStr}] ✓ ${matched} meet records stored  [${i + 1}/${meetDates.length}]`,
      );
      if (!result.datesProcessed.includes(dateStr)) {
        result.datesProcessed.push(dateStr);
      }
    }
  }

  result.datesProcessed.sort();
  return result;
}

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 3:  Gemini Usage Reports  (gemini_in_workspace_apps)
//  Scope: admin.reports.audit.readonly
// ══════════════════════════════════════════════════════════════════════════

/**
 * Syncs Gemini Activity data from the Google Activity Reports API.
 */
export async function syncGeminiActivity(fromDate?: Date): Promise<SyncResult> {
  const today = new Date();
  const hardWindowStart = fromDate ?? startOfMonth(subMonths(today, 2));
  const windowEnd = subDays(today, 3);

  // Pre-filter: find the latest date already stored for gemini.
  const latestGeminiRow = await prisma.dailyMetric.findFirst({
    where: { geminiEvents: { gt: 0 } },
    orderBy: { date: 'desc' },
    select: { date: true },
  });

  const windowStart = latestGeminiRow
    ? new Date(Math.max(addDays(latestGeminiRow.date, 1).getTime(), hardWindowStart.getTime()))
    : hardWindowStart;

  if (windowStart > windowEnd) {
    console.log('  [Gemini] All dates up to date — nothing to fetch.');
    return { datesProcessed: [], totalRecords: 0, errors: [] };
  }

  const startTime = `${format(windowStart, 'yyyy-MM-dd')}T00:00:00.000Z`;
  const endTime = `${format(windowEnd, 'yyyy-MM-dd')}T23:59:59.000Z`;

  const skipThreshold = await getSkipThreshold();
  const result: SyncResult = {
    datesProcessed: [],
    totalRecords: 0,
    errors: [],
  };

  console.log(
    `  Window (Gemini): ${format(windowStart, 'yyyy-MM-dd')} → ${format(windowEnd, 'yyyy-MM-dd')} (skip threshold: ${skipThreshold})`,
  );

  console.log(`\n  ── Fetching GEMINI activity reports ──`);
  const t0Gemini = Date.now();
  let geminiEvents: ActivityEvent[] = [];

  try {
    geminiEvents = await fetchActivityReports('gemini_in_workspace_apps', startTime, endTime);
    console.log(
      `  ✓ ${geminiEvents.length} gemini events fetched in ${((Date.now() - t0Gemini) / 1000).toFixed(1)}s`,
    );
  } catch (error: any) {
    const msg = `Gemini fetch failed: ${error.message}`;
    console.error(`  ✗ ${msg}`);
    result.errors.push(msg);
  }

  if (geminiEvents.length > 0) {
    const geminiByDay = groupEventsByDay(geminiEvents);
    const geminiDates = Array.from(geminiByDay.keys()).sort();
    console.log(
      `  ${geminiDates.length} days with gemini activity, storing…`,
    );

    for (let i = 0; i < geminiDates.length; i++) {
      const dateStr = geminiDates[i];
      const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

      // Skip if gemini data already stored for this date
      const existing = await prisma.dailyMetric.count({
        where: { date: dateObj, geminiEvents: { gt: 0 } },
      });
      if (existing >= skipThreshold) {
        console.log(
          `  [${dateStr}] gemini already stored (${existing} records), skip  [${i + 1}/${geminiDates.length}]`,
        );
        continue;
      }

      const dayMap = geminiByDay.get(dateStr)!;
      let matched = 0;

      for (const [email, count] of Array.from(dayMap.entries())) {
        const employee = await prisma.employee.findUnique({
          where: { email },
        });
        if (!employee || employee.excluded) continue;

        await prisma.dailyMetric.upsert({
          where: {
            employeeId_date: { employeeId: employee.id, date: dateObj },
          },
          create: {
            employeeId: employee.id,
            date: dateObj,
            geminiEvents: count,
          },
          update: {
            geminiEvents: count,
          },
        });
        matched++;
        result.totalRecords++;
      }

      console.log(
        `  [${dateStr}] ✓ ${matched} gemini records stored  [${i + 1}/${geminiDates.length}]`,
      );
      if (!result.datesProcessed.includes(dateStr)) {
        result.datesProcessed.push(dateStr);
      }
    }
  }

  result.datesProcessed.sort();
  return result;
}
