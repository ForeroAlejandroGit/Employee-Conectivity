import { prisma } from './prisma';
import { MANAGEMENT_CATEGORIES } from '../../config/coefficients';

export interface ScoreResult {
  calculated: number;
  errors: string[];
}

/**
 * Calculates connectivity scores for every employee that has a DailyMetric
 * record on the given date. Mirrors the binary-activity × coefficient logic
 * from the legacy Python script (calculate_productivity.py).
 */
export async function calculateScoresForDate(
  date: Date,
): Promise<ScoreResult> {
  const coefficients = await prisma.coefficientSet.findMany({
    where: { isActive: true },
  });

  const mgmtCoeff = coefficients.find((c) => c.name === 'management');
  const othersCoeff = coefficients.find((c) => c.name === 'others');

  if (!mgmtCoeff || !othersCoeff) {
    throw new Error(
      'Missing coefficient sets in database. Run "npm run db:seed" first.',
    );
  }

  const metrics = await prisma.dailyMetric.findMany({
    where: { date },
    include: { employee: true },
  });

  let calculated = 0;
  const errors: string[] = [];

  for (const metric of metrics) {
    try {
      const emp = metric.employee;
      if (emp.excluded || emp.state !== 'Activo') continue;

      // Pick coefficient set based on HR category
      const isManagement = MANAGEMENT_CATEGORIES.some((cat) =>
        emp.category.toUpperCase().includes(cat),
      );
      const coeff = isManagement ? mgmtCoeff : othersCoeff;

      // Binary conversion — same logic as the Python version
      const emailActive =
        metric.emailsSent > 0 || metric.lastLoginTime ? 1 : 0;
      const driveActive =
        metric.filesEdited + metric.filesViewed + metric.filesCreated > 0
          ? 1
          : 0;
      const chatActive = metric.chatMessagesSent > 0 ? 1 : 0;
      const meetingsActive = metric.meetingCount > 0 ? 1 : 0;

      // Weighted sum, capped at 1.0
      const totalScore = Math.min(
        1.0,
        emailActive * coeff.emailWeight +
          emailActive * coeff.emailLastUse +
          driveActive * coeff.filesEdited +
          driveActive * coeff.filesViewed +
          driveActive * coeff.driveLastUse +
          driveActive * coeff.filesCreated +
          chatActive * coeff.chatWeight +
          meetingsActive * coeff.meetingsWeight,
      );

      await prisma.dailyScore.upsert({
        where: {
          employeeId_date: { employeeId: emp.id, date },
        },
        create: {
          employeeId: emp.id,
          date,
          emailActive,
          driveActive,
          chatActive,
          meetingsActive,
          totalScore,
          coefficientSet: coeff.name,
        },
        update: {
          emailActive,
          driveActive,
          chatActive,
          meetingsActive,
          totalScore,
          coefficientSet: coeff.name,
        },
      });

      calculated++;
    } catch (error: any) {
      errors.push(`${metric.employee.email}: ${error.message}`);
    }
  }

  return { calculated, errors };
}

/**
 * Recalculates scores for every date that has DailyMetric records
 * but is missing (or has outdated) DailyScore records.
 */
export async function recalculateAllScores(): Promise<{
  dates: number;
  total: number;
}> {
  const dates = await prisma.dailyMetric.findMany({
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'asc' },
  });

  let total = 0;

  for (const { date } of dates) {
    const { calculated } = await calculateScoresForDate(date);
    total += calculated;
  }

  return { dates: dates.length, total };
}
