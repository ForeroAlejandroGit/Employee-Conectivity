'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { X } from 'lucide-react';

interface DistBucket {
  range: string;
  count: number;
}

interface Props {
  data: DistBucket[];
  totalEmployees: number;
  selectedRange?: string | null;
  onRangeSelect?: (range: string | null) => void;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
const COLORS_DIM = ['#fca5a5', '#fdba74', '#fde047', '#86efac', '#6ee7b7'];

export function ScoreDistribution({ data, totalEmployees, selectedRange, onRangeSelect }: Props) {
  if (data.length === 0 || totalEmployees === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Score Distribution</h3>
        <div className="flex h-48 items-center justify-center text-sm text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  const withPct = data.map((d) => ({
    ...d,
    pct: Math.round((d.count / totalEmployees) * 100),
  }));

  function handleBarClick(entry: any) {
    if (!onRangeSelect) return;
    const clicked = entry?.activePayload?.[0]?.payload?.range ?? null;
    onRangeSelect(selectedRange === clicked ? null : clicked);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Score Distribution</h3>
          <p className="mt-0.5 text-xs text-gray-400">
            {selectedRange
              ? `Showing range: ${selectedRange}`
              : 'Click a bar to filter'}
          </p>
        </div>
        {selectedRange && onRangeSelect && (
          <button
            onClick={() => onRangeSelect(null)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={withPct}
          margin={{ top: 20, right: 5, left: -20, bottom: 5 }}
          onClick={onRangeSelect ? handleBarClick : undefined}
          style={onRangeSelect ? { cursor: 'pointer' } : undefined}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="range"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
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
            formatter={(value: number, _: string, props: any) => [
              `${props.payload.count} employees (${value}%)`,
              'Count',
            ]}
          />
          <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {withPct.map((d, i) => {
              const isSelected = !selectedRange || selectedRange === d.range;
              return (
                <Cell
                  key={i}
                  fill={isSelected ? (COLORS[i] ?? COLORS[4]) : (COLORS_DIM[i] ?? COLORS_DIM[4])}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {withPct.map((d, i) => (
          <button
            key={d.range}
            onClick={() => onRangeSelect?.(selectedRange === d.range ? null : d.range)}
            className={`flex items-center gap-1.5 text-[10px] transition ${
              onRangeSelect ? 'hover:opacity-80' : 'cursor-default'
            } ${selectedRange && selectedRange !== d.range ? 'opacity-40' : 'text-gray-500'}`}
          >
            <div
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: COLORS[i] }}
            />
            {d.range}: {d.count}
          </button>
        ))}
      </div>
    </div>
  );
}
