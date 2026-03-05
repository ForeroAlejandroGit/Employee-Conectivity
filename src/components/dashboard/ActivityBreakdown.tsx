'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Mail, HardDrive, MessageSquare, Video, X } from 'lucide-react';

interface Props {
  activityRates: {
    email: number;
    drive: number;
    chat: number;
    meetings: number;
  };
  selectedActivity?: string | null;
  onActivitySelect?: (activity: string | null) => void;
}

const ACTIVITIES = [
  { key: 'email' as const, label: 'Email', icon: Mail, color: '#3b82f6', bg: 'bg-blue-50 text-blue-700', ring: 'ring-blue-400' },
  { key: 'drive' as const, label: 'Drive', icon: HardDrive, color: '#8b5cf6', bg: 'bg-violet-50 text-violet-700', ring: 'ring-violet-400' },
  { key: 'chat' as const, label: 'Chat', icon: MessageSquare, color: '#10b981', bg: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-400' },
  { key: 'meetings' as const, label: 'Meetings', icon: Video, color: '#f59e0b', bg: 'bg-amber-50 text-amber-700', ring: 'ring-amber-400' },
];

export function ActivityBreakdown({ activityRates, selectedActivity, onActivitySelect }: Props) {
  const radarData = ACTIVITIES.map((a) => ({
    subject: a.label,
    rate: activityRates[a.key],
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Activity Participation
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">
            {selectedActivity
              ? `Filtering by: ${selectedActivity}`
              : '% of employee-days with activity detected'}
          </p>
        </div>
        {selectedActivity && onActivitySelect && (
          <button
            onClick={() => onActivitySelect(null)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      <div className="mt-2">
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <PolarRadiusAxis
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: '#94a3b8' }}
              tickCount={5}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${value}%`, 'Participation']}
            />
            <Radar
              dataKey="rate"
              stroke="#2563eb"
              strokeWidth={2}
              fill="#2563eb"
              fillOpacity={0.15}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Rate cards -- clickable */}
      <div className="mt-1 grid grid-cols-2 gap-2">
        {ACTIVITIES.map((a) => {
          const isSelected = selectedActivity === a.key;
          const isDimmed = selectedActivity && !isSelected;
          return (
            <button
              key={a.key}
              onClick={() => onActivitySelect?.(isSelected ? null : a.key)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${
                onActivitySelect ? 'hover:shadow-sm' : 'cursor-default'
              } ${
                isSelected
                  ? `border-current ring-1 ${a.ring} bg-white`
                  : `border-gray-100 ${isDimmed ? 'opacity-40' : ''}`
              }`}
            >
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${a.bg}`}>
                <a.icon className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400">{a.label}</p>
                <p className="text-sm font-bold text-gray-800">
                  {activityRates[a.key]}%
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
