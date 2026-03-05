'use client';

import { ArrowUpRight, ArrowDownRight, Mail, HardDrive, MessageSquare, Video } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  avgScore: number;
  scoreDelta: number;
  activeEmployees: number;
  totalEmployees: number;
  activityRates: {
    email: number;
    drive: number;
    chat: number;
    meetings: number;
  };
}

const ACTIVITIES = [
  { key: 'email' as const, label: 'Email', icon: Mail, color: 'text-blue-600 bg-blue-50' },
  { key: 'drive' as const, label: 'Drive', icon: HardDrive, color: 'text-violet-600 bg-violet-50' },
  { key: 'chat' as const, label: 'Chat', icon: MessageSquare, color: 'text-emerald-600 bg-emerald-50' },
  { key: 'meetings' as const, label: 'Meetings', icon: Video, color: 'text-amber-600 bg-amber-50' },
];

function scoreColor(score: number) {
  if (score >= 0.7) return 'text-emerald-600';
  if (score >= 0.4) return 'text-amber-600';
  return 'text-red-600';
}

export function ScoreOverview({
  avgScore,
  scoreDelta,
  activeEmployees,
  totalEmployees,
  activityRates,
}: Props) {
  const deltaPositive = scoreDelta >= 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Main score card */}
      <div className="card sm:col-span-2 lg:col-span-1">
        <p className="text-sm font-medium text-gray-500">Connectivity Index</p>
        <div className="mt-2 flex items-baseline gap-3">
          <span className={clsx('text-4xl font-bold', scoreColor(avgScore))}>
            {avgScore.toFixed(2)}
          </span>
          <span
            className={clsx(
              'flex items-center gap-0.5 text-sm font-semibold',
              deltaPositive ? 'text-emerald-600' : 'text-red-600',
            )}
          >
            {deltaPositive ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            {Math.abs(scoreDelta).toFixed(2)}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-400">vs previous period</p>
      </div>

      {/* Active employees */}
      <div className="card">
        <p className="text-sm font-medium text-gray-500">Active Employees</p>
        <p className="mt-2 text-3xl font-bold text-gray-900">
          {activeEmployees}
          <span className="text-lg font-normal text-gray-400">
            /{totalEmployees}
          </span>
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{
              width: `${totalEmployees ? (activeEmployees / totalEmployees) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Activity rates */}
      <div className="card">
        <p className="text-sm font-medium text-gray-500">Activity Rates</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {ACTIVITIES.map((a) => (
            <div key={a.key} className="flex items-center gap-2">
              <div
                className={clsx(
                  'flex h-8 w-8 items-center justify-center rounded-lg',
                  a.color,
                )}
              >
                <a.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{a.label}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {activityRates[a.key]}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
