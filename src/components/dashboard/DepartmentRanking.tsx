'use client';

import Link from 'next/link';
import { clsx } from 'clsx';

interface DeptRow {
  id: string;
  name: string;
  employeeCount: number;
  avgScore: number;
}

interface Props {
  departments: DeptRow[];
}

function barColor(score: number) {
  if (score >= 0.7) return 'bg-emerald-500';
  if (score >= 0.4) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreColor(score: number) {
  if (score >= 0.7) return 'text-emerald-600';
  if (score >= 0.4) return 'text-amber-600';
  return 'text-red-500';
}

function scoreBg(score: number) {
  if (score >= 0.7) return 'bg-emerald-50';
  if (score >= 0.4) return 'bg-amber-50';
  return 'bg-red-50';
}

export function DepartmentRanking({ departments }: Props) {
  const maxScore = Math.max(...departments.map((d) => d.avgScore), 0.01);

  if (departments.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">
          Department Ranking
        </h3>
        <div className="flex h-48 items-center justify-center text-sm text-gray-400">
          No department data available yet.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Department Ranking
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Average connectivity score by department
          </p>
        </div>
        <Link
          href="/departments"
          className="text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          View all &rarr;
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {departments.slice(0, 12).map((dept, i) => (
          <Link
            key={dept.id}
            href={`/departments?id=${dept.id}`}
            className="group flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 transition hover:border-brand-200 hover:shadow-sm"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-800 group-hover:text-brand-600">
                {dept.name}
              </p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all',
                    barColor(dept.avgScore),
                  )}
                  style={{ width: `${(dept.avgScore / maxScore) * 100}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <span
                className={clsx(
                  'inline-block rounded-full px-2 py-0.5 text-xs font-bold',
                  scoreColor(dept.avgScore),
                  scoreBg(dept.avgScore),
                )}
              >
                {dept.avgScore.toFixed(2)}
              </span>
              <p className="mt-0.5 text-[10px] text-gray-400">
                {dept.employeeCount} emp
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
