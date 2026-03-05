'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface DayData {
  date: string;
  dayOfWeek: string;
  dayNumber: number;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  isBusinessDay: boolean;
  score: number | null;
  employeeCount: number;
  emailRate: number;
  driveRate: number;
  chatRate: number;
  meetingsRate: number;
}

interface Props {
  data: DayData[];
  avgScore: number;
  employeeLabel?: string;
}

type ViewMode = 'business' | 'all';

export function ConnectivityChart({ data, avgScore, employeeLabel }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('business');

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500">
          Daily Connectivity Score
        </h3>
        <div className="flex h-72 items-center justify-center text-sm text-gray-400">
          No data available. Run a sync to populate data.
        </div>
      </div>
    );
  }

  const chartData =
    viewMode === 'business'
      ? data.filter((d) => d.isBusinessDay)
      : data;

  // Format data for chart
  const formatted = chartData.map((d) => ({
    ...d,
    displayScore: d.score ?? undefined,
    label: `${d.dayOfWeek} ${d.dayNumber}`,
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Daily Connectivity Score
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">
            {employeeLabel
              ? `Showing: ${employeeLabel}`
              : viewMode === 'business'
                ? 'Business days only (excludes weekends & Colombian holidays)'
                : 'All calendar days'}
          </p>
        </div>
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            onClick={() => setViewMode('business')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              viewMode === 'business'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Business Days
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              viewMode === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Days
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart
          data={formatted}
          margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
        >
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            interval={Math.max(0, Math.floor(formatted.length / 15))}
          />
          <YAxis
            domain={[0, 1]}
            ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => v.toFixed(1)}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as DayData & { label: string };
              return (
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg">
                  <p className="text-xs font-medium text-gray-500">{d.date}</p>
                  {d.isHoliday && (
                    <p className="text-xs text-amber-600">{d.holidayName}</p>
                  )}
                  {d.isWeekend && (
                    <p className="text-xs text-gray-400">Weekend</p>
                  )}
                  {d.score !== null ? (
                    <>
                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {d.score.toFixed(3)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {d.employeeCount} employees tracked
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <span className="text-gray-400">Email</span>
                        <span className="font-medium text-gray-700">{d.emailRate}%</span>
                        <span className="text-gray-400">Drive</span>
                        <span className="font-medium text-gray-700">{d.driveRate}%</span>
                        <span className="text-gray-400">Chat</span>
                        <span className="font-medium text-gray-700">{d.chatRate}%</span>
                        <span className="text-gray-400">Meetings</span>
                        <span className="font-medium text-gray-700">{d.meetingsRate}%</span>
                      </div>
                    </>
                  ) : (
                    <p className="mt-1 text-xs text-gray-400">No data</p>
                  )}
                </div>
              );
            }}
          />
          {/* Average line */}
          {avgScore > 0 && (
            <ReferenceLine
              y={avgScore}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: `Avg ${avgScore.toFixed(2)}`,
                position: 'right',
                fill: '#94a3b8',
                fontSize: 10,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="displayScore"
            stroke="#2563eb"
            strokeWidth={2.5}
            fill="url(#scoreGrad)"
            dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
