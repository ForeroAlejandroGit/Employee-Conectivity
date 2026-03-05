'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, RotateCcw, Info, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface CoefficientSet {
  id: string;
  name: string;
  emailWeight: number;
  emailLastUse: number;
  filesEdited: number;
  filesViewed: number;
  driveLastUse: number;
  filesCreated: number;
  chatWeight: number;
  meetingsWeight: number;
}

type FormValues = Omit<CoefficientSet, 'id' | 'name'>;

const FIELD_LABELS: { key: keyof FormValues; label: string; description: string }[] = [
  { key: 'emailWeight', label: 'Email Sent Weight', description: 'Score contribution when employee sends emails' },
  { key: 'emailLastUse', label: 'Email Login Weight', description: 'Score contribution for last account login' },
  { key: 'filesEdited', label: 'Files Edited Weight', description: 'Score contribution for editing Drive files' },
  { key: 'filesViewed', label: 'Files Viewed Weight', description: 'Score contribution for viewing Drive files' },
  { key: 'driveLastUse', label: 'Drive Login Weight', description: 'Score contribution for Drive activity' },
  { key: 'filesCreated', label: 'Files Created Weight', description: 'Score contribution for creating new Drive files' },
  { key: 'chatWeight', label: 'Chat Messages Weight', description: 'Score contribution for sending Chat messages' },
  { key: 'meetingsWeight', label: 'Meetings Weight', description: 'Score contribution for attending Google Meet meetings' },
];

function sumWeights(vals: FormValues) {
  return Object.values(vals).reduce((s, v) => s + Number(v), 0);
}
interface SyncStatus {
  state: 'idle' | 'syncing' | 'done' | 'error';
  message?: string;
  datesWithNewData?: number;
  fromDate?: string;
  lastDbDate?: string | null;
  durationMs?: number;
}

export default function SettingsPage() {
  const [sets, setSets] = useState<CoefficientSet[]>([]);
  const [forms, setForms] = useState<Record<string, FormValues>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string>>({});
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: 'idle' });

  useEffect(() => {
    fetch('/api/settings/coefficients')
      .then((r) => r.json())
      .then((data) => {
        setSets(data.coefficients);
        const initial: Record<string, FormValues> = {};
        for (const s of data.coefficients) {
          initial[s.name] = {
            emailWeight: s.emailWeight,
            emailLastUse: s.emailLastUse,
            filesEdited: s.filesEdited,
            filesViewed: s.filesViewed,
            driveLastUse: s.driveLastUse,
            filesCreated: s.filesCreated,
            chatWeight: s.chatWeight,
            meetingsWeight: s.meetingsWeight,
          };
        }
        setForms(initial);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleChange(setName: string, field: keyof FormValues, value: string) {
    setForms((prev) => ({
      ...prev,
      [setName]: { ...prev[setName], [field]: value },
    }));
    setSaved((prev) => ({ ...prev, [setName]: false }));
    setError((prev) => ({ ...prev, [setName]: '' }));
  }

  function resetForm(setName: string) {
    const original = sets.find((s) => s.name === setName);
    if (!original) return;
    setForms((prev) => ({
      ...prev,
      [setName]: {
        emailWeight: original.emailWeight,
        emailLastUse: original.emailLastUse,
        filesEdited: original.filesEdited,
        filesViewed: original.filesViewed,
        driveLastUse: original.driveLastUse,
        filesCreated: original.filesCreated,
        chatWeight: original.chatWeight,
        meetingsWeight: original.meetingsWeight,
      },
    }));
    setSaved((prev) => ({ ...prev, [setName]: false }));
    setError((prev) => ({ ...prev, [setName]: '' }));
  }

  async function save(setName: string) {
    const vals = forms[setName];
    setSaving((prev) => ({ ...prev, [setName]: true }));
    setError((prev) => ({ ...prev, [setName]: '' }));

    try {
      const res = await fetch('/api/settings/coefficients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: setName, ...vals }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError((prev) => ({ ...prev, [setName]: data.error ?? 'Save failed' }));
      } else {
        const data = await res.json();
        setSets((prev) => prev.map((s) => (s.name === setName ? data.coefficient : s)));
        setSaved((prev) => ({ ...prev, [setName]: true }));
      }
    } finally {
      setSaving((prev) => ({ ...prev, [setName]: false }));
    }
  }
  async function runIncrementalSync() {
    setSyncStatus({ state: 'syncing' });
    try {
      const res = await fetch('/api/sync/incremental', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setSyncStatus({ state: 'error', message: data.error ?? 'Sync failed' });
      } else {
        setSyncStatus({
          state: 'done',
          datesWithNewData: data.datesWithNewData ?? 0,
          fromDate: data.fromDate,
          lastDbDate: data.lastDbDate,
          durationMs: data.durationMs,
        });
      }
    } catch (e: any) {
      setSyncStatus({ state: 'error', message: e.message });
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Score Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure the weight coefficients used to calculate the daily connectivity score for each employee category.
          Scores are binary (0 or 1 per activity) multiplied by these weights, then summed and capped at 1.0.
        </p>
      </div>

      {/* Data Synchronization */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Data Synchronization</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            Fetch missing Google Workspace data (email, Drive, Chat, Meet) starting from the last
            date already in the database.
          </p>
        </div>
        <div className="px-6 py-5">
          {syncStatus.lastDbDate !== undefined && syncStatus.state !== 'idle' && (
            <p className="mb-3 text-xs text-gray-500">
              Last date in database:{' '}
              <span className="font-medium text-gray-700">
                {syncStatus.lastDbDate ?? 'none — will fetch last 7 days'}
              </span>
              {syncStatus.fromDate && (
                <>
                  {' '}· Fetching from:{' '}
                  <span className="font-medium text-gray-700">{syncStatus.fromDate}</span>
                </>
              )}
            </p>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={runIncrementalSync}
              disabled={syncStatus.state === 'syncing'}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {syncStatus.state === 'syncing' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {syncStatus.state === 'syncing' ? 'Synchronizing…' : 'Synchronize Now'}
            </button>

            {syncStatus.state === 'done' && (
              <div className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  Done — {syncStatus.datesWithNewData} new date
                  {syncStatus.datesWithNewData !== 1 ? 's' : ''} processed
                  {syncStatus.durationMs
                    ? ` in ${(syncStatus.durationMs / 1000).toFixed(1)}s`
                    : ''}
                </span>
              </div>
            )}

            {syncStatus.state === 'error' && (
              <div className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{syncStatus.message}</span>
              </div>
            )}
          </div>

          {syncStatus.state === 'syncing' && (
            <p className="mt-3 text-xs text-gray-400">
              This may take several minutes depending on the date range. Do not close this page.
            </p>
          )}
        </div>
      </div>

      {/* How scoring works */}
      <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold">How the score is calculated</p>
          <p className="mt-1">
            Each day, each metric is converted to a <strong>binary flag</strong> (1 if active, 0 if not).
            Flags are multiplied by their weights and summed. The result is capped at <strong>1.0</strong>.
          </p>
          <p className="mt-1">
            <strong>Management</strong> applies to employees categorised as Dirección, Gerencia, Vicepresidencia,
            or Presidencia. <strong>Others</strong> applies to everyone else.
          </p>
          <p className="mt-1 font-medium">
            After saving, go to Dashboard → run a manual sync or wait for the nightly worker to
            recalculate scores with the new weights.
          </p>
        </div>
      </div>
      {sets.map((set) => {
        const vals = forms[set.name] ?? {};
        const total = sumWeights(vals);

        return (
          <div key={set.name} className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold capitalize text-gray-900">
                {set.name === 'management' ? 'Management' : 'Others'} Coefficients
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Applied to: {set.name === 'management'
                  ? 'Dirección, Gerencia, Vicepresidencia, Presidencia'
                  : 'All other employee categories'}
              </p>
            </div>

            <div className="px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {FIELD_LABELS.map(({ key, label, description }) => (
                  <div key={key}>
                    <label
                      className="mb-1 block text-xs font-medium text-gray-700"
                      title={description}
                    >
                      {label}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={vals[key] ?? 0}
                      onChange={(e) => handleChange(set.name, key, e.target.value)}
                      className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    />
                    <p className="mt-0.5 text-[10px] text-gray-400">{description}</p>
                  </div>
                ))}
              </div>
              {/* Weight sum indicator */}
              <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-xs text-gray-500">
                  Sum of weights:{' '}
                  <span className={total > 1.0 ? 'font-bold text-amber-600' : 'font-bold text-gray-700'}>
                    {total.toFixed(4)}
                  </span>
                  {total > 1.0 && (
                    <span className="ml-2 text-amber-600">
                      (exceeds 1.0 — scores will be capped at 1.0)
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => resetForm(set.name)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                  <button
                    onClick={() => save(set.name)}
                    disabled={saving[set.name]}
                    className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
                  >
                    {saving[set.name] ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    {saving[set.name] ? 'Saving…' : 'Save'}
                  </button>
                  {saved[set.name] && (
                    <span className="text-xs font-medium text-emerald-600">✓ Saved</span>
                  )}
                </div>
              </div>

              {error[set.name] && (
                <p className="mt-2 text-xs text-red-600">{error[set.name]}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
