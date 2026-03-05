'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, CalendarDays, TrendingUp, Users, Activity, X } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';

import { FilterBar } from '@/components/dashboard/FilterBar';
import { ConnectivityChart } from '@/components/dashboard/ConnectivityChart';
import { ScoreDistribution } from '@/components/dashboard/ScoreDistribution';
import { EmployeeList } from '@/components/dashboard/EmployeeList';
import { ActivityBreakdown } from '@/components/dashboard/ActivityBreakdown';
import { DepartmentRanking } from '@/components/dashboard/DepartmentRanking';

// ── Types ───────────────────────────────────────────────

interface DashboardData {
  avgScore: number;
  prevAvgScore: number;
  scoreDelta: number;
  activeEmployees: number;
  totalEmployees: number;
  activityRates: { email: number; drive: number; chat: number; meetings: number };
  lastSyncAt: string | null;
  monthsWithData: string[];
}

interface DailyData {
  daily: DayPoint[];
  topPerformers: Performer[];
  bottomPerformers: Performer[];
  distribution: { range: string; count: number }[];
  totalEmployees: number;
  businessDaysWithData: number;
  totalBusinessDays: number;
}

interface DayPoint {
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

interface Performer {
  id: string;
  name: string;
  email: string;
  department: string;
  avgScore: number;
  daysTracked: number;
}

interface DeptRow {
  id: string;
  name: string;
  employeeCount: number;
  avgScore: number;
}

interface FilterState {
  divisionId: string;
  departmentId: string;
  category: string;
  employeeName: string;
}

// ── Score color helpers ─────────────────────────────────

function scoreColor(score: number) {
  if (score >= 0.7) return 'text-emerald-600';
  if (score >= 0.4) return 'text-amber-600';
  return 'text-red-500';
}

// ── Dashboard Page ──────────────────────────────────────

export default function DashboardPage() {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [filters, setFilters] = useState<FilterState>({
    divisionId: '',
    departmentId: '',
    category: '',
    employeeName: '',
  });
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dailyData, setDailyData] = useState<DailyData | null>(null);
  const [departments, setDepartments] = useState<DeptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthsWithData, setMonthsWithData] = useState<string[]>([]);

  // Selection state
  const [selectedScoreRange, setSelectedScoreRange] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string | null>(null);

  // Build base query params (for dashboard stats, departments)
  const buildParams = useCallback(
    (extra: Record<string, string> = {}) => {
      const params = new URLSearchParams({ month, ...extra });
      if (filters.divisionId) params.set('divisionId', filters.divisionId);
      if (filters.departmentId) params.set('departmentId', filters.departmentId);
      if (filters.category) params.set('category', filters.category);
      if (filters.employeeName) params.set('employeeName', filters.employeeName);
      return params.toString();
    },
    [month, filters],
  );

  // Build params for the daily chart (respects employee/range selection)
  const buildDailyParams = useCallback(() => {
    const params = new URLSearchParams({ month });
    if (selectedEmployeeId) {
      params.set('employeeId', selectedEmployeeId);
    } else {
      if (filters.divisionId) params.set('divisionId', filters.divisionId);
      if (filters.departmentId) params.set('departmentId', filters.departmentId);
      if (filters.category) params.set('category', filters.category);
      if (filters.employeeName) params.set('employeeName', filters.employeeName);
      if (selectedScoreRange) params.set('scoreRange', selectedScoreRange);
    }
    return params.toString();
  }, [month, filters, selectedEmployeeId, selectedScoreRange]);

  const fetchAll = useCallback(async () => {
    const [dashRes, dailyRes, deptRes] = await Promise.all([
      fetch(`/api/dashboard?${buildParams()}`),
      fetch(`/api/dashboard/daily?${buildDailyParams()}`),
      fetch(`/api/departments?${buildParams()}`),
    ]);
    const dashJson = await dashRes.json();
    setDashboard(dashJson);
    setMonthsWithData(dashJson.monthsWithData ?? []);
    setDailyData(await dailyRes.json());
    const deptData = await deptRes.json();
    setDepartments(deptData.departments ?? []);
  }, [buildParams, buildDailyParams]);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  // When monthsWithData arrives, default to the most recent month with data
  useEffect(() => {
    if (monthsWithData.length > 0 && !monthsWithData.includes(month)) {
      setMonth(monthsWithData[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthsWithData]);

  function handleFiltersChange(newFilters: FilterState) {
    setFilters(newFilters);
    setSelectedEmployeeId(null);
    setSelectedEmployeeName(null);
    setSelectedScoreRange(null);
  }

  function handleMonthChange(newMonth: string) {
    setMonth(newMonth);
    setSelectedEmployeeId(null);
    setSelectedEmployeeName(null);
    setSelectedScoreRange(null);
  }

  function handleEmployeeClick(emp: { id: string; name: string; lastName: string }) {
    if (selectedEmployeeId === emp.id) {
      setSelectedEmployeeId(null);
      setSelectedEmployeeName(null);
    } else {
      setSelectedEmployeeId(emp.id);
      setSelectedEmployeeName(`${emp.name} ${emp.lastName}`);
      setSelectedScoreRange(null);
    }
  }

  function handleRangeSelect(range: string | null) {
    setSelectedScoreRange(range);
    setSelectedEmployeeId(null);
    setSelectedEmployeeName(null);
  }

  function clearSelection() {
    setSelectedEmployeeId(null);
    setSelectedEmployeeName(null);
    setSelectedScoreRange(null);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-500" />
          <p className="mt-3 text-sm text-gray-400">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  // Month selector: only months with data
  const monthOptions = monthsWithData.map((m) => {
    const [y, mo] = m.split('-').map(Number);
    const d = new Date(y, mo - 1, 1);
    return { value: m, label: format(d, 'MMMM yyyy') };
  });
  const selectedLabel = monthOptions.find((m) => m.value === month)?.label ?? month;

  const hasSelection = selectedEmployeeId || selectedScoreRange;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Connectivity Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            {dashboard?.lastSyncAt
              ? `Last sync: ${new Date(dashboard.lastSyncAt).toLocaleString()}`
              : 'No sync data yet'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Month selector — only months with data */}
          <div className="relative flex items-center">
            <CalendarDays className="pointer-events-none absolute left-3 h-4 w-4 text-gray-400" />
            <select
              value={month}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="h-10 appearance-none rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-sm font-medium text-gray-700 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              {monthOptions.length > 0 ? (
                monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))
              ) : (
                <option value={month}>{selectedLabel}</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────── */}
      <FilterBar filters={filters} onChange={handleFiltersChange} />

      {/* ── Active selection banner ──────────────────── */}
      {hasSelection && (
        <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5">
          <Activity className="h-4 w-4 text-brand-600" />
          <p className="flex-1 text-sm text-brand-800">
            {selectedEmployeeName
              ? <>Showing chart for <strong>{selectedEmployeeName}</strong></>
              : <>Filtering by score range <strong>{selectedScoreRange}</strong></>}
          </p>
          <button
            onClick={clearSelection}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-brand-600 hover:bg-brand-100"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        </div>
      )}

      {/* ── KPI Cards ───────────────────────────────── */}
      {dashboard && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Connectivity Index */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
                <Activity className="h-4 w-4 text-brand-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">
                Connectivity Index
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={clsx('text-3xl font-bold', scoreColor(dashboard.avgScore))}>
                {dashboard.avgScore.toFixed(2)}
              </span>
              <span
                className={clsx(
                  'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
                  dashboard.scoreDelta >= 0
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-red-50 text-red-600',
                )}
              >
                {dashboard.scoreDelta >= 0 ? '+' : ''}
                {dashboard.scoreDelta.toFixed(2)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-400">vs previous period</p>
          </div>

          {/* Active Employees */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
                <Users className="h-4 w-4 text-violet-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">
                Active Employees
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {dashboard.activeEmployees}
              <span className="text-lg font-normal text-gray-400">
                /{dashboard.totalEmployees}
              </span>
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{
                  width: `${dashboard.totalEmployees ? (dashboard.activeEmployees / dashboard.totalEmployees) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Data Coverage */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                <CalendarDays className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">
                Data Coverage
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {dailyData?.businessDaysWithData ?? 0}
              <span className="text-lg font-normal text-gray-400">
                /{dailyData?.totalBusinessDays ?? 0}
              </span>
            </p>
            <p className="mt-1 text-[11px] text-gray-400">
              business days with data in {selectedLabel}
            </p>
          </div>

          {/* Departments */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">
                Departments Tracked
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {departments.length}
            </p>
            <p className="mt-1 text-[11px] text-gray-400">
              with active employees
            </p>
          </div>
        </div>
      )}

      {/* ── No data notice ──────────────────────────── */}
      {dailyData && dailyData.businessDaysWithData === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No score data for <strong>{selectedLabel}</strong>.
          The nightly worker syncs data automatically. Google typically has a 3–5 day delay.
        </div>
      )}

      {/* ── Main Chart ──────────────────────────────── */}
      {dailyData && (
        <ConnectivityChart
          data={dailyData.daily}
          avgScore={dashboard?.avgScore ?? 0}
          employeeLabel={selectedEmployeeName ?? (selectedScoreRange ? `Range ${selectedScoreRange}` : undefined)}
        />
      )}

      {/* ── Insights + Employee List ─────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Score Distribution */}
        {dailyData && (
          <ScoreDistribution
            data={dailyData.distribution}
            totalEmployees={dailyData.totalEmployees}
            selectedRange={selectedScoreRange}
            onRangeSelect={handleRangeSelect}
          />
        )}

        {/* Activity Breakdown */}
        {dashboard && (
          <ActivityBreakdown activityRates={dashboard.activityRates} />
        )}

        {/* Employee List */}
        <EmployeeList
          month={month}
          filters={filters}
          selectedScoreRange={selectedScoreRange}
          selectedEmployeeId={selectedEmployeeId}
          onEmployeeClick={handleEmployeeClick}
        />
      </div>

      {/* ── Department Ranking ──────────────────────── */}
      <DepartmentRanking departments={departments} />
    </div>
  );
}
