import React from 'react';
import { CheckCircle2, Download, ExternalLink, RotateCcw } from 'lucide-react';
import { buildPdfFilename, buildWhatsAppUrl, SubmissionRecord } from '../utils/verification';

interface CompletionReceiptProps {
  submission: SubmissionRecord;
  onDownloadPdf: () => void;
  onResetWorkflow: () => void;
}

export const CompletionReceipt: React.FC<CompletionReceiptProps> = ({
  submission,
  onDownloadPdf,
  onResetWorkflow,
}) => {
  const pdfFilename = buildPdfFilename(submission.staff_id, submission.full_name);
  const whatsappUrl = buildWhatsAppUrl(submission.full_name, submission.staff_id);
  const referenceCode = `RH-AGR-${String(submission.id).padStart(5, '0')}`;

  return (
    <section
      aria-label="Agreement Complete"
      className="bg-white border-2 border-[#C59B27] rounded-xl p-6 sm:p-8 shadow-sm space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-7 h-7 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#9B7816]">
              Agreement Recorded
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#0B1F3A] mt-0.5">
              Signed Agreement Ready for Submission
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetWorkflow}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#C59B27]"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>New Agreement</span>
        </button>
      </div>

      {/* Verified Summary Metadata (Zero-Pill Unboxed Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <dl className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Fellow Full Name
            </dt>
            <dd className="font-semibold text-[#0B1F3A] mt-1">{submission.full_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Staff ID Number
            </dt>
            <dd className="font-mono tabular-nums font-semibold text-[#0B1F3A] mt-1">
              {submission.staff_id}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Date &amp; Time Signed
            </dt>
            <dd className="font-mono tabular-nums text-slate-700 mt-1">{submission.timestamp}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Document Reference
            </dt>
            <dd className="font-mono tabular-nums text-slate-700 mt-1">{referenceCode}</dd>
          </div>
        </dl>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Captured Signature
          </p>
          <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-center h-24">
            <img
              src={submission.signature_data_url}
              alt={`Electronic signature of ${submission.full_name}`}
              className="max-h-20 w-auto object-contain"
            />
          </div>
        </div>
      </div>

      {/* 2-Step Completion Handoff Box */}
      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-sm font-bold text-[#0B1F3A] mb-4">
          Complete Your Handoff in 2 Steps
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Step A: Download PDF */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onDownloadPdf}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2.5 px-5 py-3 bg-[#0B1F3A] hover:bg-[#132B4C] text-white font-semibold text-sm sm:text-base rounded-lg border border-[#C59B27] transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B27]"
            >
              <Download className="w-4 h-4 text-[#E2C05B] shrink-0" aria-hidden="true" />
              <span>1. Download Your Signed PDF</span>
            </button>
            <p className="text-xs text-slate-500 font-mono truncate" title={pdfFilename}>
              File: {pdfFilename}
            </p>
          </div>

          {/* Step B: Send via WhatsApp */}
          <div className="flex flex-col gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2.5 px-5 py-3 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold text-sm sm:text-base rounded-lg border border-[#1EBE5D] transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#128C7E]"
            >
              <span>2. Send via WhatsApp to Hall Tutor</span>
              <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
            </a>
            <p className="text-xs text-slate-600 leading-relaxed">
              Once WhatsApp opens with your pre-filled details, please attach the downloaded PDF document before pressing send.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
