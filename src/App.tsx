import React, { useCallback, useEffect, useState } from 'react';
import { FileCheck2, ShieldCheck } from 'lucide-react';
import { ActiveTab, TopBar } from './components/TopBar';
import { FellowCombobox } from './components/FellowCombobox';
import { SignaturePad } from './components/SignaturePad';
import { CompletionReceipt } from './components/CompletionReceipt';
import { AdminSidebar } from './components/AdminSidebar';
import { AdminRecordsTab } from './components/AdminRecordsTab';
import { generateOfficialPdfBlob, triggerPdfDownload } from './utils/pdfGenerator';
import {
  FellowRecord,
  SubmissionRecord,
  validateSubmission,
} from './utils/verification';

const CREST_IMAGE_URL = '/assets/aistudio/logo.jpg_982440ba.png';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('verify');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  const [fellows, setFellows] = useState<FellowRecord[]>([]);
  const [loadingFellows, setLoadingFellows] = useState<boolean>(true);
  const [directoryError, setDirectoryError] = useState<string | null>(null);

  // Step-by-step verification workflow state
  const [selectedFellow, setSelectedFellow] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string>('');
  const [hasSignature, setHasSignature] = useState<boolean>(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [canvasResetKey, setCanvasResetKey] = useState<number>(0);

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [completedSubmission, setCompletedSubmission] = useState<SubmissionRecord | null>(null);
  const [crestImgFailed, setCrestImgFailed] = useState<boolean>(false);

  // Admin PIN & Submissions state
  const [adminPin, setAdminPin] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);

  const loadFellows = useCallback(async () => {
    try {
      setLoadingFellows(true);
      setDirectoryError(null);
      const res = await fetch('/api/fellows');
      if (!res.ok) throw new Error('Failed to load Fellows directory');
      const data = (await res.json()) as { fellows: FellowRecord[] };
      setFellows(data.fellows);
    } catch {
      setDirectoryError('Unable to load the Republic Hall Fellows directory.');
    } finally {
      setLoadingFellows(false);
    }
  }, []);

  const loadSubmissions = useCallback(async (pin: string) => {
    const res = await fetch('/api/submissions', {
      headers: { 'x-admin-pin': pin },
    });
    if (!res.ok) return;
    const data = (await res.json()) as { submissions: SubmissionRecord[] };
    setSubmissions(data.submissions);
  }, []);

  useEffect(() => {
    loadFellows();
  }, [loadFellows]);

  const handleUnlockAdmin = async (pin: string): Promise<boolean> => {
    const res = await fetch('/api/admin/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      return false;
    }
    setAdminPin(pin);
    await loadSubmissions(pin);
    return true;
  };

  const handleLockAdmin = () => {
    setAdminPin(null);
    setSubmissions([]);
  };

  const handleAddFellow = async (fullName: string): Promise<string | null> => {
    if (!adminPin) return 'Admin session locked.';
    const res = await fetch('/api/fellows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': adminPin,
      },
      body: JSON.stringify({ fullName }),
    });
    const data = (await res.json()) as { fellow?: FellowRecord; error?: string };
    if (!res.ok) {
      return data.error ?? 'Could not add Fellow.';
    }
    await loadFellows();
    return null;
  };

  const handleRemoveFellow = async (id: number): Promise<string | null> => {
    if (!adminPin) return 'Admin session locked.';
    const res = await fetch(`/api/fellows/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-pin': adminPin },
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      return data.error ?? 'Could not remove Fellow.';
    }
    if (selectedFellow && fellows.find((f) => f.id === id)?.full_name === selectedFellow) {
      setSelectedFellow(null);
    }
    await loadFellows();
    return null;
  };

  const handleImportFellows = async (
    content: string,
    filename: string,
    replaceExisting: boolean,
  ): Promise<{ inserted: number; detected: number } | string> => {
    if (!adminPin) return 'Admin session locked.';
    const res = await fetch('/api/fellows/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': adminPin,
      },
      body: JSON.stringify({ content, filename, replaceExisting }),
    });
    const data = (await res.json()) as {
      inserted?: number;
      detected?: number;
      fellows?: FellowRecord[];
      error?: string;
    };
    if (!res.ok) {
      return data.error ?? 'Import failed.';
    }
    if (data.fellows) {
      setFellows(data.fellows);
    } else {
      await loadFellows();
    }
    return {
      inserted: data.inserted ?? 0,
      detected: data.detected ?? 0,
    };
  };

  const handleConfirmGeneratePdf = async () => {
    setFormError(null);
    const check = validateSubmission({
      fullName: selectedFellow,
      staffId,
      hasSignature: hasSignature && Boolean(signatureDataUrl),
    });

    if (!check.valid) {
      setFormError(check.error);
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: selectedFellow,
          staffId: staffId.trim(),
          signatureDataUrl,
        }),
      });
      const data = (await res.json()) as {
        submission?: SubmissionRecord;
        error?: string;
      };
      if (!res.ok || !data.submission) {
        setFormError(data.error ?? 'Failed to record agreement.');
        return;
      }

      setCompletedSubmission(data.submission);
      if (adminPin) {
        await loadSubmissions(adminPin);
      }
    } catch {
      setFormError('Network error while saving agreement record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadCompletedPdf = async () => {
    if (!completedSubmission) return;
    let logoDataUrl: string | null = null;
    try {
      const resp = await fetch(CREST_IMAGE_URL);
      if (resp.ok) {
        const blob = await resp.blob();
        logoDataUrl = await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () =>
            resolve(typeof reader.result === 'string' ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      }
    } catch {
      logoDataUrl = null;
    }

    const { blob, filename } = generateOfficialPdfBlob({
      recordId: completedSubmission.id,
      fullName: completedSubmission.full_name,
      staffId: completedSubmission.staff_id,
      timestamp: completedSubmission.timestamp,
      signatureDataUrl: completedSubmission.signature_data_url,
      logoDataUrl,
    });
    triggerPdfDownload(blob, filename);
  };

  const handleResetWorkflow = () => {
    setCompletedSubmission(null);
    setSelectedFellow(null);
    setStaffId('');
    setHasSignature(false);
    setSignatureDataUrl(null);
    setFormError(null);
    setCanvasResetKey((prev) => prev + 1);
  };

  const step1Done = Boolean(selectedFellow);
  const step2Done = step1Done && staffId.trim().length > 0;
  const step3Done = step2Done && hasSignature;

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F9F8F4]">
      <TopBar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'records' && adminPin) {
            loadSubmissions(adminPin);
          }
        }}
        onToggleSidebar={() => {
          if (window.innerWidth >= 1024) {
            const pinEl = document.getElementById('sidebar-admin-pin') ?? document.getElementById('add-fellow-name');
            pinEl?.focus();
          } else {
            setMobileSidebarOpen((prev) => !prev);
          }
        }}
        sidebarOpen={mobileSidebarOpen}
      />

      {/* Institutional Banner */}
      <div className="bg-[#0B1F3A] border-b-4 border-[#C59B27] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white p-1 border-2 border-[#C59B27] shrink-0 flex items-center justify-center overflow-hidden shadow-sm">
            {!crestImgFailed ? (
              <img
                src={CREST_IMAGE_URL}
                alt="Republic Hall Official Logo"
                referrerPolicy="no-referrer"
                onError={() => setCrestImgFailed(true)}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <ShieldCheck className="w-10 h-10 text-[#0B1F3A]" aria-hidden="true" />
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E2C05B]">
              Office of the Hall Tutor &middot; Fellows Agreement Registry
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance">
              Republic Hall Fellow Agreement Portal
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
              Confirm your Fellow listing, enter your Staff ID Number, affix your electronic signature, and dispatch your signed PDF agreement to the Hall Tutor.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row items-start gap-8">
          <AdminSidebar
            fellows={fellows}
            isOpenMobile={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
            adminPin={adminPin}
            onUnlock={handleUnlockAdmin}
            onLock={handleLockAdmin}
            onAddFellow={handleAddFellow}
            onRemoveFellow={handleRemoveFellow}
            onImportFellows={handleImportFellows}
          />

          <div className="flex-1 w-full min-w-0">
            {activeTab === 'records' ? (
              <AdminRecordsTab
                adminPin={adminPin}
                submissions={submissions}
                onUnlock={handleUnlockAdmin}
                onLock={handleLockAdmin}
                onGoToVerify={() => setActiveTab('verify')}
              />
            ) : completedSubmission ? (
              <CompletionReceipt
                submission={completedSubmission}
                onDownloadPdf={handleDownloadCompletedPdf}
                onResetWorkflow={handleResetWorkflow}
              />
            ) : (
              <section
                aria-label="Fellow Agreement Workflow"
                className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-8"
              >
                {/* Step Progress Overview */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-200 pb-4 text-xs font-semibold">
                  <span className={step1Done ? 'text-[#0B1F3A]' : 'text-[#9B7816]'}>
                    01. Fellow Selection {step1Done ? '— Confirmed' : ''}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">/</span>
                  <span className={step2Done ? 'text-[#0B1F3A]' : step1Done ? 'text-[#9B7816]' : 'text-slate-400'}>
                    02. Staff ID {step2Done ? '— Entered' : ''}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">/</span>
                  <span className={step3Done ? 'text-[#0B1F3A]' : step2Done ? 'text-[#9B7816]' : 'text-slate-400'}>
                    03. Signature {step3Done ? '— Captured' : ''}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">/</span>
                  <span className={step3Done ? 'text-[#9B7816]' : 'text-slate-400'}>
                    04. Generate PDF
                  </span>
                </div>

                {directoryError && (
                  <div
                    role="alert"
                    className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
                  >
                    {directoryError}
                  </div>
                )}

                {/* Step 1: Search & Select Fellow Name */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#9B7816]">
                    Step 1
                  </p>
                  {loadingFellows ? (
                    <div className="h-12 bg-slate-100 animate-pulse rounded-lg" />
                  ) : (
                    <FellowCombobox
                      fellows={fellows}
                      selectedFellow={selectedFellow}
                      onSelect={(name) => {
                        setSelectedFellow(name);
                        setFormError(null);
                      }}
                    />
                  )}
                </div>

                {/* Step 2: Staff ID Input */}
                {step1Done && (
                  <div className="space-y-2 border-t border-slate-100 pt-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#9B7816]">
                      Step 2
                    </p>
                    <label
                      htmlFor="staff-id-input"
                      className="block text-sm font-semibold text-[#0B1F3A]"
                    >
                      Staff ID Number
                    </label>
                    <input
                      id="staff-id-input"
                      type="text"
                      value={staffId}
                      onChange={(e) => {
                        setStaffId(e.target.value);
                        setFormError(null);
                      }}
                      placeholder="Enter your Staff ID Number (e.g. RH-4082)"
                      className="w-full min-h-[46px] px-4 py-2.5 bg-white border border-slate-300 rounded-lg font-mono text-sm sm:text-base text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:border-[#0B1F3A] focus:ring-2 focus:ring-[#C59B27]/30"
                    />
                  </div>
                )}

                {/* Step 3: Electronic Signature Pad */}
                {step2Done && (
                  <div className="space-y-3 border-t border-slate-100 pt-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#9B7816]">
                      Step 3
                    </p>
                    <SignaturePad
                      resetSignal={canvasResetKey}
                      onSignatureChange={(hasSig, dataUrl) => {
                        setHasSignature(hasSig);
                        setSignatureDataUrl(dataUrl);
                        if (hasSig) setFormError(null);
                      }}
                    />
                  </div>
                )}

                {/* Step 4: Confirm & Generate Signed PDF */}
                {step2Done && (
                  <div className="space-y-4 border-t border-slate-100 pt-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#9B7816]">
                      Step 4
                    </p>

                    {formError && (
                      <p
                        role="alert"
                        className="text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3"
                      >
                        {formError}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleConfirmGeneratePdf}
                      disabled={submitting}
                      className="w-full min-h-[50px] inline-flex items-center justify-center gap-2.5 px-6 py-3 text-base font-semibold text-white bg-[#0B1F3A] hover:bg-[#132B4C] border border-[#C59B27] rounded-lg transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B27]"
                    >
                      <FileCheck2 className="w-5 h-5 text-[#E2C05B]" aria-hidden="true" />
                      <span>
                        {submitting
                          ? 'Recording Agreement...'
                          : 'Confirm & Generate Signed PDF'}
                      </span>
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>Republic Hall &middot; Office of the Hall Tutor</span>
          <span>Fellows Electronic Agreement &amp; Signature Registry</span>
        </div>
      </footer>
    </div>
  );
}
