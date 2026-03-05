import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { calculateScoresForDate } from '@/lib/score-calculator';

/**
 * POST /api/upload
 * Accepts multipart form data with:
 * - type: 'chats' | 'meetings'
 * - file: CSV or Excel file
 *
 * Chat CSV format: Actor (email), Fecha (date as DD/MM/YYYY or YYYY-MM-DD)
 * Meetings Excel format: Actor (email), Fecha (date), Código de reunión
 */
export async function POST(request: Request) {
  const formData = await request.formData();
  const type = formData.get('type') as string;
  const file = formData.get('file') as File;

  if (!type || !file) {
    return NextResponse.json(
      { error: 'Missing type or file' },
      { status: 400 },
    );
  }

  if (type !== 'chats' && type !== 'meetings') {
    return NextResponse.json(
      { error: 'type must be "chats" or "meetings"' },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const affectedDates = new Set<string>();
  let processed = 0;
  let matched = 0;
  let unmatched = 0;

  if (type === 'chats') {
    // Parse CSV
    const text = buffer.toString('utf-8');
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV has no data rows' }, { status: 400 });
    }

    const header = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
    const actorIdx = header.findIndex((h) => h.toLowerCase().includes('actor'));
    const fechaIdx = header.findIndex((h) => h.toLowerCase().includes('fecha'));

    if (actorIdx === -1 || fechaIdx === -1) {
      return NextResponse.json(
        { error: 'CSV must have Actor and Fecha columns' },
        { status: 400 },
      );
    }

    // Aggregate: count messages per (email, date)
    const chatMap = new Map<string, number>();
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''));
      const email = cols[actorIdx]?.toLowerCase();
      const dateRaw = cols[fechaIdx];
      if (!email || !dateRaw) continue;

      const dateStr = parseDate(dateRaw);
      if (!dateStr) continue;

      const key = `${email}|${dateStr}`;
      chatMap.set(key, (chatMap.get(key) ?? 0) + 1);
      processed++;
    }

    // Update DailyMetric records
    for (const [key, count] of Array.from(chatMap.entries())) {
      const [email, dateStr] = key.split('|');
      const employee = await prisma.employee.findUnique({
        where: { email },
      });

      if (!employee || employee.excluded) {
        unmatched++;
        continue;
      }

      const date = new Date(`${dateStr}T00:00:00.000Z`);
      await prisma.dailyMetric.upsert({
        where: {
          employeeId_date: { employeeId: employee.id, date },
        },
        create: {
          employeeId: employee.id,
          date,
          chatMessagesSent: count,
        },
        update: {
          chatMessagesSent: count,
        },
      });

      matched++;
      affectedDates.add(dateStr);
    }
  } else {
    // Parse Excel for meetings
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(sheet);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Excel file has no data' }, { status: 400 });
    }

    // Find column names (flexible matching)
    const sampleKeys = Object.keys(rows[0]);
    const actorCol = sampleKeys.find((k) => k.toLowerCase().includes('actor'));
    const fechaCol = sampleKeys.find((k) => k.toLowerCase().includes('fecha'));
    const meetingIdCol = sampleKeys.find((k) =>
      k.toLowerCase().includes('código') || k.toLowerCase().includes('codigo') || k.toLowerCase().includes('reunion'),
    );

    if (!actorCol || !fechaCol) {
      return NextResponse.json(
        { error: 'Excel must have Actor and Fecha columns' },
        { status: 400 },
      );
    }

    // Aggregate: count unique meetings per (email, date)
    const meetingMap = new Map<string, Set<string>>();
    for (const row of rows) {
      const email = String(row[actorCol] ?? '').toLowerCase().trim();
      const dateRaw = row[fechaCol];
      if (!email || !dateRaw) continue;

      const dateStr = parseDate(String(dateRaw));
      if (!dateStr) continue;

      const key = `${email}|${dateStr}`;
      if (!meetingMap.has(key)) meetingMap.set(key, new Set());
      // Use meeting ID for dedup if available, otherwise count each row
      const meetId = meetingIdCol ? String(row[meetingIdCol] ?? processed) : String(processed);
      meetingMap.get(key)!.add(meetId);
      processed++;
    }

    // Update DailyMetric records
    for (const [key, meetingIds] of Array.from(meetingMap.entries())) {
      const [email, dateStr] = key.split('|');
      const employee = await prisma.employee.findUnique({
        where: { email },
      });

      if (!employee || employee.excluded) {
        unmatched++;
        continue;
      }

      const date = new Date(`${dateStr}T00:00:00.000Z`);
      await prisma.dailyMetric.upsert({
        where: {
          employeeId_date: { employeeId: employee.id, date },
        },
        create: {
          employeeId: employee.id,
          date,
          meetingCount: meetingIds.size,
        },
        update: {
          meetingCount: meetingIds.size,
        },
      });

      matched++;
      affectedDates.add(dateStr);
    }
  }

  // Recalculate scores for affected dates
  let scoresRecalculated = 0;
  for (const dateStr of Array.from(affectedDates)) {
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    const result = await calculateScoresForDate(date);
    scoresRecalculated += result.calculated;
  }

  return NextResponse.json({
    type,
    rowsProcessed: processed,
    employeesMatched: matched,
    employeesUnmatched: unmatched,
    datesAffected: affectedDates.size,
    scoresRecalculated,
  });
}

/** Parse various date formats to yyyy-MM-dd */
function parseDate(raw: string): string | null {
  if (!raw) return null;

  // Handle Excel serial date numbers
  const num = Number(raw);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + num * 86400000);
    return d.toISOString().slice(0, 10);
  }

  // yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = raw.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // MM/DD/YYYY
  const mdy = raw.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
}
