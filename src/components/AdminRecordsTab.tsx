import React, { useMemo, useState } from 'react';
import JSZip from 'jszip';
import { Archive, FileSpreadsheet, Lock, Search, Unlock } from 'lucide-react';
import {
  generateSubmissionsCsv,
  sanitizeFilenameSegment,
  SubmissionRecord,
} from '../utils/verification';

interface AdminRecordsTabProps {
  adminPin: string | null;
  submissions: readonly SubmissionRecord[];
  onUnlock: (pin: string) => Promise<boolean>;
  onLock: () => void;
  onGoToVerify: () => void;
}

export const AdminRecordsTab: React.FC<AdminRecordsTabProps> = ({
  adminPin,
  submissions,
  onUnlock,
  onLock,
  onGoToVerify,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const isUnlocked = Boolean(adminPin);

  const filteredSubmissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.staff_id.toLowerCase().includes(q),
    );
  }, [submissions, searchQuery]);

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setBusy(true);
    const ok = await onUnlock(pinInput.trim());
    setBusy(false);
    if (!ok) {
      setPinError('Invalid Admin PIN. Please try again.');
    } else {
      setPinInput('');
    }
  };

  const handleDownloadCsv = () => {
    const csv = generateSubmissionsCsv(submissions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'republic_hall_submissions.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const sigFolder = zip.folder('signatures');
    const csvHeader = 'id,full_name,staff_id,timestamp,signature_file';
    const csvRows: string[] = [csvHeader];

    for (const row of submissions) {
      const sigName = `sig_${String(row.id).padStart(4, '0')}_${sanitizeFilenameSegment(
        row.staff_id,
      )}_${sanitizeFilenameSegment(row.full_name)}.png`;

      const base64Part = row.signature_data_url.split(',')[1] ?? '';
      if (sigFolder && base64Part) {
        sigFolder.file(sigName, base64Part, { base64: true });
      }

      const escapedName = row.full_name.includes(',')
        ? `"${row.full_name.replace(/"/g, '""')}"`
        : row.full_name;
      csvRows.push([row.id, escapedName, row.staff_id, row.timestamp, `signatures/${sigName}`].join(','));
    }

    zip.file('submissions.csv', csvRows.join('\n'));
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'republic_hall_backup.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!isUnlocked) {
    return (
      <section className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#9B7816]">
          Restricted Access
        </p>
        <h2 className="font-serif text-2xl font-bold text-[#0B1F3A] mt-1">
          Admin Records Archive
        </h2>
        <p className="text-sm text-slate-600 mt-2 mb-5">
          Enter the Hall Administrator PIN to inspect completed Fellow submissions, rendered signatures, and backup exports.
        </p>

        <form onSubmit={handleUnlockSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="records-admin-pin"
              className="block text-sm font-semibold text-slate-700 mb-1.5"
            >
              Admin PIN
            </label>
            <input
              id="records-admin-pin"
              type="password"
              inputMode="numeric"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Enter PIN (default: 1234)"
              className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A] focus:ring-2 focus:ring-[#C59B27]/30"
            />
          </div>

          {pinError && (
            <p role="alert" className="text-xs font-medium text-red-700">
              {pinError}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0B1F3A] hover:bg-[#132B4C] rounded-lg transition-colors"
          >
            <Unlock className="w-4 h-4 text-[#E2C05B]" aria-hidden="true" />
            <span>Unlock Admin Records</span>
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9B7816]">
            Hall Tutor Registry
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#0B1F3A] mt-0.5">
            Completed Agreement Records
          </h2>
          <p className="text-sm text-slate-600 mt-1 tabular-nums">
            Total recorded submissions: <strong className="text-[#0B1F3A]">{submissions.length}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={submissions.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0B1F3A] bg-[#F9F8F4] hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
            <span>Download CSV</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={submissions.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#132B4C] border border-[#C59B27]/60 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Archive className="w-4 h-4 text-[#E2C05B]" aria-hidden="true" />
            <span>Download ZIP</span>
          </button>

          <button
            type="button"
            onClick={onLock}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <p className="text-base font-semibold text-[#0B1F3A]">
            No completed Fellow agreements yet
          </p>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Completed submissions with captured electronic signatures will appear here once Fellows complete the agreement workflow.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onGoToVerify}
              className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-[#0B1F3A] hover:bg-[#132B4C] rounded-lg transition-colors"
            >
              Go to Fellow Agreement
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative max-w-sm">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter records by name or Staff ID"
              aria-label="Filter submitted records"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
            />
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F9F8F4] border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Ref</th>
                  <th className="py-3 px-4">Fellow Full Name</th>
                  <th className="py-3 px-4">Staff ID</th>
                  <th className="py-3 px-4">Date &amp; Time Signed</th>
                  <th className="py-3 px-4">Electronic Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredSubmissions.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                      RH-AGR-{String(record.id).padStart(5, '0')}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#0B1F3A]">
                      {record.full_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {record.staff_id}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                      {record.timestamp}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-40 h-14 bg-white border border-slate-200 rounded p-1 flex items-center justify-center">
                        <img
                          src={record.signature_data_url}
                          alt={`Signature of ${record.full_name}`}
                          className="max-h-12 w-auto object-contain"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};
