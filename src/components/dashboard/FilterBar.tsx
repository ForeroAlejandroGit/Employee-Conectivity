'use client';

import { useEffect, useState, useRef } from 'react';
import { Filter, X, Search } from 'lucide-react';
import { clsx } from 'clsx';

interface FilterOption {
  id: string;
  name: string;
}

interface FilterState {
  divisionId: string;
  departmentId: string;
  category: string;
  employeeName: string;
}

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function FilterBar({ filters, onChange }: Props) {
  const [divisions, setDivisions] = useState<FilterOption[]>([]);
  const [departments, setDepartments] = useState<FilterOption[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState(filters.employeeName);
  const [expanded, setExpanded] = useState(false);

  // Sync nameInput if parent clears filters externally
  const prevEmployeeName = useRef(filters.employeeName);
  useEffect(() => {
    if (filters.employeeName !== prevEmployeeName.current) {
      setNameInput(filters.employeeName);
      prevEmployeeName.current = filters.employeeName;
    }
  }, [filters.employeeName]);

  useEffect(() => {
    fetch('/api/filters')
      .then((r) => r.json())
      .then((data) => {
        setDivisions(data.divisions);
        setDepartments(data.departments);
        setCategories(data.categories);
      });
  }, []);

  // Debounce — fire 400 ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (nameInput !== filters.employeeName) {
        onChange({ ...filters, employeeName: nameInput });
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameInput]);

  const hasActiveFilters =
    filters.divisionId || filters.departmentId || filters.category || filters.employeeName;

  const activeCount = [
    filters.divisionId,
    filters.departmentId,
    filters.category,
    filters.employeeName,
  ].filter(Boolean).length;

  function clearAll() {
    setNameInput('');
    onChange({ divisionId: '', departmentId: '', category: '', employeeName: '' });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Toggle bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-3"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </div>
        <svg
          className={clsx(
            'h-4 w-4 text-gray-400 transition-transform',
            expanded && 'rotate-180',
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Filter controls */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Division */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">
                Division
              </label>
              <select
                value={filters.divisionId}
                onChange={(e) =>
                  onChange({ ...filters, divisionId: e.target.value })
                }
                className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                <option value="">All Divisions</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">
                Department
              </label>
              <select
                value={filters.departmentId}
                onChange={(e) =>
                  onChange({ ...filters, departmentId: e.target.value })
                }
                className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) =>
                  onChange({ ...filters, category: e.target.value })
                }
                className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Name search — dynamic, no submit needed */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">
                Employee
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search name or email…"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-7 text-sm text-gray-700 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
                {nameInput && (
                  <button
                    type="button"
                    onClick={() => setNameInput('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="mt-3 flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              <X className="h-3 w-3" />
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
