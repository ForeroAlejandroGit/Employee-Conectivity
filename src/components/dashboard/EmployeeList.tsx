'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, ChevronLeft, ChevronRight, ArrowUpDown, User } from 'lucide-react';
import Link from 'next/link';

interface EmpRow {
  id: string;
  name: string;
  lastName: string;
  email: string;
  department: string;
  avgScore: number;
  daysTracked: number;
}

interface FilterState {
  divisionId: string;
  departmentId: string;
  category: string;
  employeeName: string;
}

interface Props {
  month: string;
  filters: FilterState;
  selectedScoreRange?: string | null;
  selectedEmployeeId?: string | null;
  onEmployeeClick?: (emp: { id: string; name: string; lastName: string }) => void;
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
export function EmployeeList({
  month,
  filters,
  selectedScoreRange,
  selectedEmployeeId,
  onEmployeeClick,
}: Props) {
  const [employees, setEmployees] = useState<EmpRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState<'name' | 'score'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);

  const fetchEmployees = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      limit: '20',
      month,
      sortBy,
      sortDir,
    });
    if (filters.divisionId) params.set('divisionId', filters.divisionId);
    if (filters.departmentId) params.set('departmentId', filters.departmentId);
    if (filters.category) params.set('category', filters.category);
    if (filters.employeeName) params.set('search', filters.employeeName);
    if (selectedScoreRange) params.set('scoreRange', selectedScoreRange);

    const res = await fetch(`/api/employees?${params}`);
    const data = await res.json();
    setEmployees(data.employees ?? []);
    setTotalPages(data.pagination?.totalPages ?? 1);
    setTotalCount(data.pagination?.totalCount ?? 0);
  }, [page, month, sortBy, sortDir, filters, selectedScoreRange]);

  useEffect(() => {
    setPage(1);
  }, [month, filters, selectedScoreRange, sortBy, sortDir]);

  useEffect(() => {
    setLoading(true);
    fetchEmployees().finally(() => setLoading(false));
  }, [fetchEmployees]);

  function toggleSort(field: 'name' | 'score') {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  }

  const SortIcon = ({ field }: { field: 'name' | 'score' }) => (
    <ArrowUpDown
      className={`h-3 w-3 ${sortBy === field ? 'text-brand-600' : 'text-gray-300'}`}
    />
  );
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Employees List</h3>
          <p className="mt-0.5 text-xs text-gray-400">
            {totalCount} employees
            {selectedScoreRange ? ` in range ${selectedScoreRange}` : ''}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => toggleSort('name')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
              sortBy === 'name'
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Name <SortIcon field="name" />
          </button>
          <button
            onClick={() => toggleSort('score')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
              sortBy === 'score'
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Score <SortIcon field="score" />
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
        </div>
      ) : employees.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-400">
          No employees found
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {employees.map((emp) => {
            const isSelected = selectedEmployeeId === emp.id;
            const fullName = `${emp.name} ${emp.lastName}`;
            return (
              <div
                key={emp.id}
                className={`flex items-center gap-3 px-5 py-3 transition ${
                  onEmployeeClick
                    ? 'cursor-pointer hover:bg-gray-50'
                    : ''
                } ${isSelected ? 'bg-brand-50' : ''}`}
                onClick={() => onEmployeeClick?.({ id: emp.id, name: emp.name, lastName: emp.lastName })}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {fullName}
                  </p>
                  <p className="truncate text-[11px] text-gray-400">{emp.department}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreBg(emp.avgScore)} ${scoreColor(emp.avgScore)}`}
                  >
                    {emp.avgScore.toFixed(2)}
                  </span>
                  <Link
                    href={`/employees/${emp.id}?month=${month}`}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="View detail"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
          <span className="text-xs text-gray-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
