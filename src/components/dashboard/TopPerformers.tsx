'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';

interface Performer {
  id: string;
  name: string;
  email: string;
  department: string;
  avgScore: number;
  daysTracked: number;
}

interface Props {
  top: Performer[];
  bottom: Performer[];
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

export function TopPerformers({ top, bottom }: Props) {
  const [view, setView] = useState<'top' | 'bottom'>('top');
  const list = view === 'top' ? top : bottom;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          {view === 'top' ? 'Top' : 'Bottom'} Performers
        </h3>
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            onClick={() => setView('top')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              view === 'top'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <TrendingUp className="h-3 w-3" />
            Top 10
          </button>
          <button
            onClick={() => setView('bottom')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              view === 'bottom'
                ? 'bg-white text-red-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <TrendingDown className="h-3 w-3" />
            Bottom 10
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {list.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-400">
            No data available
          </p>
        ) : (
          list.map((emp, i) => (
            <div
              key={emp.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-gray-50"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">
                {view === 'top' ? i + 1 : list.length - i}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">
                  {emp.name}
                </p>
                <p className="truncate text-[11px] text-gray-400">
                  {emp.department}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={clsx(
                    'inline-block rounded-full px-2 py-0.5 text-xs font-bold',
                    scoreColor(emp.avgScore),
                    scoreBg(emp.avgScore),
                  )}
                >
                  {emp.avgScore.toFixed(3)}
                </span>
                <p className="mt-0.5 text-[10px] text-gray-400">
                  {emp.daysTracked}d tracked
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
