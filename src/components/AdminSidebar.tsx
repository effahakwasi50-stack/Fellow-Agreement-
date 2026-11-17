import React, { useState } from 'react';
import { Lock, Plus, Trash2, Unlock, Upload, X } from 'lucide-react';
import { FellowRecord } from '../utils/verification';

interface AdminSidebarProps {
  fellows: readonly FellowRecord[];
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  adminPin: string | null;
  onUnlock: (pin: string) => Promise<boolean>;
  onLock: () => void;
  onAddFellow: (fullName: string) => Promise<string | null>;
  onRemoveFellow: (id: number) => Promise<string | null>;
  onImportFellows: (
    content: string,
    filename: string,
    replaceExisting: boolean,
  ) => Promise<{ inserted: number; detected: number } | string>;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  fellows,
  isOpenMobile,
  onCloseMobile,
  adminPin,
  onUnlock,
  onLock,
  onAddFellow,
  onRemoveFellow,
  onImportFellows,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [newFellowName, setNewFellowName] = useState('');
  const [removeId, setRemoveId] = useState<string>('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  const isUnlocked = Boolean(adminPin);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setBusy(true);
    const ok = await onUnlock(pinInput.trim());
    setBusy(false);
    if (!ok) {
      setPinError('Incorrect Admin PIN. Please try again.');
    } else {
      setPinInput('');
      setFeedback(null);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFellowName.trim()) {
      setFeedback({ type: 'error', text: 'Enter a Fellow full name to add.' });
      return;
    }
    setBusy(true);
    const err = await onAddFellow(newFellowName.trim());
    setBusy(false);
    if (err) {
      setFeedback({ type: 'error', text: err });
    } else {
      setFeedback({ type: 'success', text: `Added "${newFellowName.trim()}" to directory.` });
      setNewFellowName('');
    }
  };

  const handleRemove = async () => {
    const idNum = Number(removeId);
    if (!idNum) {
      setFeedback({ type: 'error', text: 'Select a Fellow to remove.' });
      return;
    }
    const target = fellows.find((f) => f.id === idNum);
    setBusy(true);
    const err = await onRemoveFellow(idNum);
    setBusy(false);
    if (err) {
      setFeedback({ type: 'error', text: err });
    } else {
      setFeedback({
        type: 'success',
        text: `Removed "${target?.full_name ?? 'Fellow'}" from directory.`,
      });
      setRemoveId('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        content: typeof reader.result === 'string' ? reader.result : '',
      });
    };
    reader.readAsText(file);
  };

  const handleApplyImport = async () => {
    if (!selectedFile) return;
    setBusy(true);
    const res = await onImportFellows(selectedFile.content, selectedFile.name, replaceExisting);
    setBusy(false);
    if (typeof res === 'string') {
      setFeedback({ type: 'error', text: res });
    } else {
      setFeedback({
        type: 'success',
        text: `Directory updated (${res.inserted} new Fellow(s) added from ${res.detected} detected).`,
      });
      setSelectedFile(null);
    }
  };

  const sidebarContent = (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Hall Registry
          </p>
          <h2 className="font-serif text-xl font-bold text-[#0B1F3A] mt-0.5">
            Admin / Manage Fellows
          </h2>
          <p className="text-xs text-slate-600 mt-1 tabular-nums">
            Active Fellows in directory: <strong className="text-[#0B1F3A]">{fellows.length}</strong>
          </p>
        </div>
        {isOpenMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close Manage Fellows panel"
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {!isUnlocked ? (
        <form onSubmit={handlePinSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="sidebar-admin-pin"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Admin PIN
            </label>
            <input
              id="sidebar-admin-pin"
              type="password"
              inputMode="numeric"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Enter PIN (default: 1234)"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A] focus:ring-2 focus:ring-[#C59B27]/30"
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
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0B1F3A] hover:bg-[#132B4C] rounded-lg transition-colors disabled:opacity-60"
          >
            <Unlock className="w-4 h-4 text-[#E2C05B]" aria-hidden="true" />
            <span>Unlock Fellows Manager</span>
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-emerald-700">Directory Unlocked</span>
            <button
              type="button"
              onClick={onLock}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Lock</span>
            </button>
          </div>

          {feedback && (
            <p
              role="status"
              className={`text-xs font-medium px-3 py-2 rounded-lg border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {feedback.text}
            </p>
          )}

          {/* Add Fellow */}
          <form onSubmit={handleAddSubmit} className="space-y-2.5 border-t border-slate-200 pt-4">
            <label
              htmlFor="add-fellow-name"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
            >
              Add Fellow Name
            </label>
            <input
              id="add-fellow-name"
              type="text"
              value={newFellowName}
              onChange={(e) => setNewFellowName(e.target.value)}
              placeholder="e.g. Dr. Kwame Mensah"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#132B4C] rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#E2C05B]" aria-hidden="true" />
              <span>Add Name</span>
            </button>
          </form>

          {/* Remove Fellow */}
          <div className="space-y-2.5 border-t border-slate-200 pt-4">
            <label
              htmlFor="remove-fellow-select"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
            >
              Remove Fellow
            </label>
            <select
              id="remove-fellow-select"
              value={removeId}
              onChange={(e) => setRemoveId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
            >
              <option value="">Select Fellow to remove</option>
              {fellows.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.full_name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy || !removeId}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Remove Selected</span>
            </button>
          </div>

          {/* Upload .csv / .txt */}
          <div className="space-y-2.5 border-t border-slate-200 pt-4">
            <label
              htmlFor="upload-fellows-file"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
            >
              Upload .csv / .txt Directory
            </label>
            <input
              id="upload-fellows-file"
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 file:text-xs file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
            />
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="rounded border-slate-300 text-[#0B1F3A] focus:ring-[#C59B27]"
              />
              <span>Replace existing directory list</span>
            </label>
            <button
              type="button"
              onClick={handleApplyImport}
              disabled={busy || !selectedFile}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0B1F3A] bg-[#F9F8F4] hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Apply Uploaded List</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar Rail */}
      <aside aria-label="Admin Fellows Sidebar" className="hidden lg:block w-80 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 lg:hidden flex justify-end bg-slate-950/40"
          role="dialog"
          aria-modal="true"
          aria-label="Manage Fellows"
        >
          <div className="w-full max-w-sm h-full overflow-y-auto bg-[#F9F8F4] p-4 shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
