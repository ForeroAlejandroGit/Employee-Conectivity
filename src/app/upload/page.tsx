'use client';

import { useState } from 'react';
import { Upload, FileText, Table2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface UploadResult {
  type: string;
  rowsProcessed: number;
  employeesMatched: number;
  employeesUnmatched: number;
  datesAffected: number;
  scoresRecalculated: number;
}

export default function UploadPage() {
  const [chatFile, setChatFile] = useState<File | null>(null);
  const [meetingFile, setMeetingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<'chats' | 'meetings' | null>(null);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(type: 'chats' | 'meetings') {
    const file = type === 'chats' ? chatFile : meetingFile;
    if (!file) return;

    setUploading(type);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upload failed');
        return;
      }

      setResults((prev) => [data, ...prev]);
      if (type === 'chats') setChatFile(null);
      else setMeetingFile(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Upload</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload Chat and Meeting data files to complete the connectivity score
          calculation. These data sources supplement Google Workspace email and
          drive activity.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Chat Upload Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Google Chat Data</h3>
              <p className="text-xs text-gray-400">CSV format</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
            <input
              type="file"
              accept=".csv"
              id="chatFile"
              className="hidden"
              onChange={(e) => setChatFile(e.target.files?.[0] ?? null)}
            />
            <label
              htmlFor="chatFile"
              className="cursor-pointer"
            >
              <Upload className="mx-auto h-6 w-6 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                {chatFile ? chatFile.name : 'Click to select CSV file'}
              </p>
              <p className="mt-1 text-[11px] text-gray-400">
                Required columns: Actor, Fecha
              </p>
            </label>
          </div>

          <button
            onClick={() => handleUpload('chats')}
            disabled={!chatFile || uploading === 'chats'}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {uploading === 'chats' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading === 'chats' ? 'Processing…' : 'Upload Chat Data'}
          </button>
        </div>

        {/* Meeting Upload Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Table2 className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Google Meet Data</h3>
              <p className="text-xs text-gray-400">Excel (.xlsx) format</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
            <input
              type="file"
              accept=".xlsx,.xls"
              id="meetingFile"
              className="hidden"
              onChange={(e) => setMeetingFile(e.target.files?.[0] ?? null)}
            />
            <label
              htmlFor="meetingFile"
              className="cursor-pointer"
            >
              <Upload className="mx-auto h-6 w-6 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                {meetingFile ? meetingFile.name : 'Click to select Excel file'}
              </p>
              <p className="mt-1 text-[11px] text-gray-400">
                Required columns: Actor, Fecha
              </p>
            </label>
          </div>

          <button
            onClick={() => handleUpload('meetings')}
            disabled={!meetingFile || uploading === 'meetings'}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            {uploading === 'meetings' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading === 'meetings' ? 'Processing…' : 'Upload Meeting Data'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Upload Results</h3>
          {results.map((r, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div className="text-sm">
                <p className="font-medium text-gray-900">
                  {r.type === 'chats' ? 'Chat' : 'Meeting'} data uploaded
                  successfully
                </p>
                <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-gray-500">
                  <span>Rows processed: <strong>{r.rowsProcessed}</strong></span>
                  <span>Employees matched: <strong>{r.employeesMatched}</strong></span>
                  <span>Unmatched: <strong>{r.employeesUnmatched}</strong></span>
                  <span>Dates affected: <strong>{r.datesAffected}</strong></span>
                  <span>Scores recalculated: <strong>{r.scoresRecalculated}</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">How it works</h3>
        <div className="mt-3 space-y-3 text-sm text-gray-600">
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
              1
            </span>
            <p>
              Export chat data from Google Admin Console as CSV (Reports &gt; Apps &gt;
              Google Chat). The file must have <strong>Actor</strong> (email) and{' '}
              <strong>Fecha</strong> (date) columns.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
              2
            </span>
            <p>
              Export meeting data from Google Admin Console as Excel (Reports &gt; Apps
              &gt; Google Meet). The file must have <strong>Actor</strong> (email) and{' '}
              <strong>Fecha</strong> (date) columns.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
              3
            </span>
            <p>
              Upload both files here. The system will match emails to employees,
              update daily metrics, and recalculate connectivity scores
              automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
