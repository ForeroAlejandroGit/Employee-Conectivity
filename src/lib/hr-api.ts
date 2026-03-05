import { prisma } from './prisma';
import { EXCLUDED_EMAILS } from '../../config/coefficients';

interface HrEmployee {
  employeeID: string;
  employeeName: string;
  employeeLastName: string;
  employeeSalary: number;
  employeeCategorie: string;
  employeeState: string;
  employeeDepartment: string;
  employeeDivision: string;
  employeeManagment: string;
  employeeMail: string;
  employeePosition: string;
}

export interface HrSyncResult {
  synced: number;
  skipped: number;
  duplicatesResolved: number;
  errors: string[];
}

/**
 * Fetches the employee roster from the HR API and upserts into the database.
 *
 * - Appends EMAIL_DOMAIN to the mail field (the API omits the domain).
 * - Deduplicates by email: when multiple HR records share the same email
 *   (e.g. rehires), the "Activo" record wins.
 * - Upserts by **email** (the universal join key across Google & HR data).
 * - Creates/updates Department and Division lookup records.
 * - Marks service/functional emails as excluded.
 */
export async function syncHrEmployees(): Promise<HrSyncResult> {
  const url = process.env.HR_API_URL!;
  const domain = process.env.EMAIL_DOMAIN!;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HR API responded with ${response.status}`);
  }

  const data = await response.json();
  const raw: HrEmployee[] = data.employeeApp ?? [];

  // ── Deduplicate by email, preferring "Activo" ────────
  const byEmail = new Map<string, HrEmployee>();
  let duplicatesResolved = 0;

  for (const emp of raw) {
    if (!emp.employeeMail) continue;

    const email = `${emp.employeeMail.toLowerCase().trim()}${domain}`;
    const existing = byEmail.get(email);

    if (!existing) {
      byEmail.set(email, emp);
      continue;
    }

    // Keep the "Activo" record; if both are Activo, keep the latest
    duplicatesResolved++;
    const existingActive = existing.employeeState === 'Activo';
    const newActive = emp.employeeState === 'Activo';

    if (newActive && !existingActive) {
      byEmail.set(email, emp);
    }
    // else keep existing
  }

  // ── Upsert each unique employee ──────────────────────
  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [email, emp] of Array.from(byEmail.entries())) {
    try {
      // Upsert department
      let departmentId: string | null = null;
      if (emp.employeeDepartment) {
        const dept = await prisma.department.upsert({
          where: { name: emp.employeeDepartment },
          create: { name: emp.employeeDepartment },
          update: {},
        });
        departmentId = dept.id;
      }

      // Upsert division
      let divisionId: string | null = null;
      if (emp.employeeDivision) {
        const div = await prisma.division.upsert({
          where: { name: emp.employeeDivision },
          create: { name: emp.employeeDivision },
          update: {},
        });
        divisionId = div.id;
      }

      const isExcluded = EXCLUDED_EMAILS.includes(email);

      // Upsert by EMAIL — the universal key that joins HR ↔ Google data
      await prisma.employee.upsert({
        where: { email },
        create: {
          employeeHrId: emp.employeeID,
          name: emp.employeeName,
          lastName: emp.employeeLastName,
          email,
          salary: emp.employeeSalary ?? 0,
          category: emp.employeeCategorie ?? '',
          position: emp.employeePosition ?? null,
          state: emp.employeeState ?? 'Activo',
          management: emp.employeeManagment ?? null,
          departmentId,
          divisionId,
          excluded: isExcluded,
        },
        update: {
          employeeHrId: emp.employeeID,
          name: emp.employeeName,
          lastName: emp.employeeLastName,
          salary: emp.employeeSalary ?? 0,
          category: emp.employeeCategorie ?? '',
          position: emp.employeePosition ?? null,
          state: emp.employeeState ?? 'Activo',
          management: emp.employeeManagment ?? null,
          departmentId,
          divisionId,
          excluded: isExcluded,
        },
      });

      synced++;
    } catch (error: any) {
      errors.push(`${email}: ${error.message}`);
    }
  }

  // Count employees without email
  skipped = raw.filter((e) => !e.employeeMail).length;

  return { synced, skipped, duplicatesResolved, errors };
}
