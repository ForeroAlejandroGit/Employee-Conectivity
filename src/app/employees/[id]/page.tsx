'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  Loader2,
  ArrowLeft,
  Mail,
  HardDrive,
  MessageSquare,
  Video,
  CalendarDays,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import Link from 'next/link';

// ── Types ───────────────────────────────────────────────

interface EmployeeDetail {
  employee: {
    id: string;
    name: string;
    lastName: string;
    email: string;
    category: string;
    position: string | null;
    department: string;
    division: string;
    state: string;
  };
  monthly: {
    month: string;
    avgScore: number;
    daysTracked: number;
    emailRate: number;
    driveRate: number;
    chatRate: number;
    meetingsRate: number;
  };
  daily: {
    date: string;
    totalScore: number;
    emailActive: number;
    driveActive: number;
    chatActive: number;
    meetingsActive: number;
    emailsSent: number;
    filesEdited: number;
    filesViewed: number;
    filesCreated: number;
    chatMessagesSent: number;
    meetingCount: number;
  }[];
  monthlySummaries: {
    month: string;
    label: string;
    avgScore: number;
    daysTracked: number;
    emailRate: number;
    driveRate: number;
    chatRate: number;
    meetingsRate: number;
  }[];
}

// ── Helpers ─────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 0.7) return 'text-emerald-600';
  if (score >= 0.4) return 'text-amber-600';
  return 'text-red-500';
}

function recentMonths(count: number) {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy'),
    });
  }
  return months;
}

const ACTIVITY_ITEMS = [
  { key: 'emailRate' as const, rawKey: 'emailsSent' as const, label: 'Email', icon: Mail, bg: 'bg-blue-50 text-blue-700', unit: 'sent' },
  { key: 'driveRate' as const, rawKey: 'filesEdited' as const, label: 'Drive', icon: HardDrive, bg: 'bg-violet-50 text-violet-700', unit: 'edited' },
  { key: 'chatRate' as const, rawKey: 'chatMessagesSent' as const, label: 'Chat', icon: MessageSquare, bg: 'bg-emerald-50 text-emerald-700', unit: 'messages' },
  { key: 'meetingsRate' as const, rawKey: 'meetingCount' as const, label: 'Meetings', icon: Video, bg: 'bg-amber-50 text-amber-700', unit: 'meetings' },
];

// ── Page Component ──────────────────────────────────────

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const searchParams = useSearchParams();
  const router = useRouter();
  const [month, setMonth] = useState(
    searchParams.get('month') ?? format(new Date(), 'yyyy-MM'),
  );
  const [data, setData] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const monthOptions = recentMonths(12);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/employees/${id}?month=${month}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch(() => setError('Failed to load employee data'))
      .finally(() => setLoading(false));
  }, [id, month]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-500">{error ?? 'Employee not found'}</p>
        <Link href="/employees" className="text-sm text-brand-600 hover:underline">
          &larr; Back to Employees
        </Link>
      </div>
    );
  }

  const { employee, monthly, daily, monthlySummaries } = data;
  const fullName = `${employee.name} ${employee.lastName}`;

  // Chart data
  const chartData = daily.map((d) => ({
    ...d,
    label: d.date.slice(8, 10),
    displayScore: d.totalScore,
  }));

  // Activity totals for the month
  const totals = daily.reduce(
    (acc, d) => ({
      emailsSent: acc.emailsSent + d.emailsSent,
      filesEdited: acc.filesEdited + d.filesEdited,
      filesViewed: acc.filesViewed + d.filesViewed,
      filesCreated: acc.filesCreated + d.filesCreated,
      chatMessagesSent: acc.chatMessagesSent + d.chatMessagesSent,
      meetingCount: acc.meetingCount + d.meetingCount,
    }),
    { emailsSent: 0, filesEdited: 0, filesViewed: 0, filesCreated: 0, chatMessagesSent: 0, meetingCount: 0 },
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
            <User className="h-7 w-7 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
            <p className="text-sm text-gray-500">{employee.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <CalendarDays className="pointer-events-none absolute left-3 h-4 w-4 text-gray-400" />
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-10 appearance-none rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-sm font-medium text-gray-700 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Info chips */}
      <div className="flex flex-wrap gap-2">
        {[
          employee.department,
          employee.division,
          employee.category,
          employee.position,
        ]
          .filter(Boolean)
          .map((label, i) => (
            <span
              key={i}
              className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600"
            >
              {label}
            </span>
          ))}
      </div>

      {/* KPI Cards */}
      {monthly.daysTracked > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Avg Score</p>
            <p className={`mt-2 text-3xl font-bold ${scoreColor(monthly.avgScore)}`}>
              {monthly.avgScore.toFixed(3)}
            </p>
            <p className="mt-1 text-[11px] text-gray-400">{monthly.daysTracked} days tracked</p>
          </div>
          {ACTIVITY_ITEMS.map((a) => (
            <div key={a.key} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${a.bg}`}>
                  <a.icon className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs font-medium text-gray-500">{a.label}</p>
              </div>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {monthly[a.key]}%
              </p>
              <p className="mt-1 text-[11px] text-gray-400">
                {totals[a.rawKey].toLocaleString()} {a.unit} total
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No data available for this employee in{' '}
          <strong>{monthOptions.find((m) => m.value === month)?.label ?? month}</strong>.
          Try a different month.
        </div>
      )}

      {/* Daily Score Chart */}
      {daily.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">
            Daily Connectivity Score
          </h2>
          <p className="mt-0.5 text-xs text-gray-400">
            Score for each day with data in{' '}
            {monthOptions.find((m) => m.value === month)?.label ?? month}
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={chartData}
              margin={{ top: 15, right: 10, left: -10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="empScoreGrad" x1="0" y1="0" x2="0" y2="1">
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
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [value.toFixed(3), 'Score']}
                labelFormatter={(label) => `Day ${label}`}
              />
              {monthly.avgScore > 0 && (
                <ReferenceLine
                  y={monthly.avgScore}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{
                    value: `Avg ${monthly.avgScore.toFixed(2)}`,
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
                fill="url(#empScoreGrad)"
                dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Activity Breakdown Chart */}
      {daily.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Daily Activity Detail</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            1 = active, 0 = inactive for each activity type per day
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                domain={[0, 1]}
                ticks={[0, 1]}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [
                  value === 1 ? 'Active' : 'Inactive',
                  name,
                ]}
              />
              <Bar dataKey="emailActive" name="Email" fill="#3b82f6" maxBarSize={12} radius={[2, 2, 0, 0]} />
              <Bar dataKey="driveActive" name="Drive" fill="#8b5cf6" maxBarSize={12} radius={[2, 2, 0, 0]} />
              <Bar dataKey="chatActive" name="Chat" fill="#10b981" maxBarSize={12} radius={[2, 2, 0, 0]} />
              <Bar dataKey="meetingsActive" name="Meetings" fill="#f59e0b" maxBarSize={12} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly History */}
      {monthlySummaries.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">Monthly History</h2>
            <p className="mt-0.5 text-xs text-gray-400">Last 6 months with data</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Month</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Avg Score</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Days</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Email</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Drive</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Chat</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Meetings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {monthlySummaries.map((s) => (
                  <tr
                    key={s.month}
                    className={`transition hover:bg-gray-50 ${s.month === month ? 'bg-brand-50' : ''}`}
                  >
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">
                      <button
                        onClick={() => setMonth(s.month)}
                        className="hover:text-brand-600 hover:underline"
                      >
                        {s.label}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-bold ${scoreColor(s.avgScore)}`}>
                        {s.avgScore.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">{s.daysTracked}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">{s.emailRate}%</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">{s.driveRate}%</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">{s.chatRate}%</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">{s.meetingsRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
