'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  date: string;
  score: number;
}

interface Props {
  data: DataPoint[];
}

export function TrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-medium text-gray-500">Connectivity Trend</h3>
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">
          No trend data available yet. Run a sync to populate data.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="mb-4 text-sm font-medium text-gray-500">
        Connectivity Trend (Last 30 Days)
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={(v: string) => {
              const d = new Date(v);
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }}
          />
          <YAxis
            domain={[0, 1]}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={(v: number) => v.toFixed(1)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
            }}
            formatter={(value: number) => [value.toFixed(3), 'Avg Score']}
            labelFormatter={(label: string) =>
              new Date(label).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })
            }
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#scoreGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
