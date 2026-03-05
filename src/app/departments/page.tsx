'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Building2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

interface DeptRow {
  id: string;
  name: string;
  employeeCount: number;
  avgScore: number;
  emailRate: number;
  driveRate: number;
  chatRate: number;
  meetingsRate: number;
}

interface EmpRow {
  id: string;
  name: string;
  lastName: string;
  email: string;
  avgScore: number;
  emailRate: number;
  driveRate: number;
  chatRate: number;
  meetingsRate: number;
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

export default function DepartmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      }
    >
      <DepartmentsContent />
    </Suspense>
  );
}

function DepartmentsContent() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');

  const [departments, setDepartments] = useState<DeptRow[]>([]);
  const [employees, setEmployees] = useState<EmpRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDepartments = useCallback(async () => {
    const res = await fetch('/api/departments?days=30');
    const data = await res.json();
    setDepartments(data.departments);
  }, []);

  const fetchDeptEmployees = useCallback(async (deptId: string) => {
    const res = await fetch(
      `/api/employees?departmentId=${deptId}&limit=200&days=30`,
    );
    const data = await res.json();
    setEmployees(data.employees);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchDepartments().finally(() => setLoading(false));
  }, [fetchDepartments]);

  useEffect(() => {
    if (selectedId) {
      fetchDeptEmployees(selectedId);
    } else {
      setEmployees([]);
    }
  }, [selectedId, fetchDeptEmployees]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const selectedDept = departments.find((d) => d.id === selectedId);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        {selectedId && (
          <Link
            href="/departments"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {selectedDept ? selectedDept.name : 'Departments'}
          </h1>
          <p className="text-sm text-gray-500">
            {selectedDept
              ? `${selectedDept.employeeCount} employees — Avg score ${selectedDept.avgScore.toFixed(2)}`
              : `${departments.length} departments`}
          </p>
        </div>
      </div>

      {!selectedId ? (
        /* Department grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <Link
              key={dept.id}
              href={`/departments?id=${dept.id}`}
              className="card group transition hover:border-brand-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                    <Building2 className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-brand-600">
                      {dept.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {dept.employeeCount} employees
                    </p>
                  </div>
                </div>
                <span className={scoreBadge(dept.avgScore)}>
                  {dept.avgScore.toFixed(2)}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                {[
                  { label: 'Email', value: dept.emailRate },
                  { label: 'Drive', value: dept.driveRate },
                  { label: 'Chat', value: dept.chatRate },
                  { label: 'Meet', value: dept.meetingsRate },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-gray-400">{item.label}</p>
                    <p className={clsx('font-semibold', rateColor(item.value))}>
                      {item.value}%
                    </p>
                  </div>
                ))}
              </div>
            </Link>
          ))}
          {departments.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-400">
              No departments found. Sync employee data first.
            </div>
          )}
        </div>
      ) : (
        /* Employee list within department */
        <div className="card overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 font-medium text-gray-500">Employee</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Score</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Drive</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Chat</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Meetings</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50"
                >
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-900">
                      {emp.name} {emp.lastName}
                    </p>
                    <p className="text-xs text-gray-400">{emp.email}</p>
                  </td>
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
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No employees in this department.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
