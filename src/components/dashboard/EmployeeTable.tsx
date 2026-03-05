'use client';

import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface EmployeeRow {
  id: string;
  name: string;
  lastName: string;
  email: string;
  department: string;
  avgScore: number;
  emailRate: number;
  driveRate: number;
  chatRate: number;
  meetingsRate: number;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

interface Props {
  employees: EmployeeRow[];
  pagination: Pagination;
  onPageChange: (page: number) => void;
  onSearch: (query: string) => void;
}

function scoreBadge(score: number) {
  if (score >= 0.7) return 'score-badge score-high';
  if (score >= 0.4) return 'score-badge score-medium';
  return 'score-badge score-low';
}

function rateColor(rate: number) {
  if (rate >= 70) return 'text-emerald-600';
  if (rate >= 40) return 'text-amber-600';
  return 'text-red-500';
}

export function EmployeeTable({
  employees,
  pagination,
  onPageChange,
  onSearch,
}: Props) {
  const [searchInput, setSearchInput] = useState('');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    onSearch(searchInput);
  }

  return (
    <div className="card overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h3 className="text-sm font-medium text-gray-500">Employees</h3>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 w-64 rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </form>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-6 py-3 font-medium text-gray-500">Employee</th>
              <th className="px-4 py-3 font-medium text-gray-500">Department</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Score</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Drive</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Chat</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Meetings</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                  No employees found.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="border-b border-gray-50 transition hover:bg-gray-50/50"
                >
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-900">
                      {emp.name} {emp.lastName}
                    </p>
                    <p className="text-xs text-gray-400">{emp.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{emp.department}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={scoreBadge(emp.avgScore)}>
                      {emp.avgScore.toFixed(2)}
                    </span>
                  </td>
                  <td className={clsx('px-4 py-3 text-center font-medium', rateColor(emp.emailRate))}>
                    {emp.emailRate}%
                  </td>
                  <td className={clsx('px-4 py-3 text-center font-medium', rateColor(emp.driveRate))}>
                    {emp.driveRate}%
                  </td>
                  <td className={clsx('px-4 py-3 text-center font-medium', rateColor(emp.chatRate))}>
                    {emp.chatRate}%
                  </td>
                  <td className={clsx('px-4 py-3 text-center font-medium', rateColor(emp.meetingsRate))}>
                    {emp.meetingsRate}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
          <p className="text-xs text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.totalCount)}{' '}
            of {pagination.totalCount}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
