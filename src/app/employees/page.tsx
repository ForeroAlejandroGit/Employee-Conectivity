'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2,
  Download,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface EmpRow {
  id: string;
  name: string;
  lastName: string;
  email: string;
  department: string;
  division: string;
  avgScore: number;
  emailRate: number;
  driveRate: number;
  chatRate: number;
  meetingsRate: number;
  daysTracked: number;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

function recentMonths(count: number) {
  const now = new Date();
  const months: { value: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy'),
    });
  }
  return months;
}

function scoreColor(score: number) {
  if (score >= 0.7) return 'text-emerald-600';
  if (score >= 0.4) return 'text-amber-600';
  return 'text-red-500';
}

export default function EmployeesPage() {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [employees, setEmployees] = useState<EmpRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'score'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);

  const monthOptions = recentMonths(12);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchEmployees = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      limit: '20',
      month,
      sortBy,
      sortDir,
    });
    if (debouncedSearch) params.set('search', debouncedSearch);

    const res = await fetch(`/api/employees?${params}`);
    const data = await res.json();
    setEmployees(data.employees ?? []);
    setPagination(
      data.pagination ?? { page: 1, limit: 20, totalCount: 0, totalPages: 0 },
    );
  }, [page, debouncedSearch, month, sortBy, sortDir]);

  useEffect(() => {
    setLoading(true);
    fetchEmployees().finally(() => setLoading(false));
  }, [fetchEmployees]);

  async function exportCsv() {
    const res = await fetch(`/api/employees?limit=5000&month=${month}`);
    const data = await res.json();
    const rows: EmpRow[] = data.employees;
    const header =
      'Name,Last Name,Email,Department,Division,Score,Email%,Drive%,Chat%,Meetings%';
    const csv = [
      header,
      ...rows.map(
        (r) =>
          `"${r.name}","${r.lastName}","${r.email}","${r.department}","${r.division}",${r.avgScore},${r.emailRate},${r.driveRate},${r.chatRate},${r.meetingsRate}`,
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees-connectivity-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSort(field: 'name' | 'score') {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500">
            {pagination.totalCount} active employees
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-56 rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-sm text-gray-700 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Month */}
          <div className="relative flex items-center">
            <CalendarDays className="pointer-events-none absolute left-3 h-4 w-4 text-gray-400" />
            <select
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPage(1);
              }}
              className="h-10 appearance-none rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-sm font-medium text-gray-700 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={exportCsv}
            className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Sort bar */}
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
          <span className="text-xs text-gray-400">Sort by:</span>
          {(['name', 'score'] as const).map((field) => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                sortBy === field
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {field === 'name' ? 'Name' : 'Score'}{' '}
              {sortBy === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : employees.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-400">
            No employees found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Department
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    Avg Score
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    Email
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    Drive
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    Chat
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    Meetings
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    Days
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="group cursor-pointer transition hover:bg-gray-50"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/employees/${emp.id}?month=${month}`}
                        className="flex items-center gap-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800 group-hover:text-brand-600">
                            {emp.name} {emp.lastName}
                          </p>
                          <p className="text-xs text-gray-400">{emp.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {emp.department}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-sm font-bold ${scoreColor(emp.avgScore)}`}
                      >
                        {emp.avgScore.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {emp.emailRate}%
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {emp.driveRate}%
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {emp.chatRate}%
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {emp.meetingsRate}%
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-400">
                      {emp.daysTracked}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
            <span className="text-xs text-gray-400">
              Page {pagination.page} of {pagination.totalPages} (
              {pagination.totalCount} total)
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
