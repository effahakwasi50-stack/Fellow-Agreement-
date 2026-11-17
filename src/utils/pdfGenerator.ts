import { jsPDF } from 'jspdf';
import { buildPdfFilename } from './verification';

export interface PdfReceiptInput {
  recordId: number;
  fullName: string;
  staffId: string;
  timestamp: string;
  signatureDataUrl: string;
  logoDataUrl?: string | null;
}

function sanitizePdfText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-');
}

export function generateOfficialPdfBlob(input: PdfReceiptInput): {
  blob: Blob;
  filename: string;
} {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Outer Navy Border
  doc.setDrawColor(11, 31, 58); // #0B1F3A
  doc.setLineWidth(1.2);
  doc.rect(10, 10, 190, 277);

  // Inner Gold Border
  doc.setDrawColor(197, 155, 39); // #C59B27
  doc.setLineWidth(0.5);
  doc.rect(13, 13, 184, 271);

  // Top Republic Hall Navy Header Banner
  doc.setFillColor(11, 31, 58);
  doc.rect(13, 13, 184, 38, 'F');

  if (input.logoDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.circle(31, 32, 13, 'F');
    doc.addImage(input.logoDataUrl, 'PNG', 19, 20, 24, 24, undefined, 'FAST');
  }

  const headerCenterX = input.logoDataUrl ? 115 : 105;

  doc.setTextColor(226, 192, 91);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('OFFICIAL FELLOW AGREEMENT RECORD', headerCenterX, 22, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('REPUBLIC HALL', headerCenterX, 32.5, { align: 'center' });

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    'Office of the Hall Tutor  |  Fellows Directory & Electronic Attestation',
    headerCenterX,
    41.5,
    { align: 'center' },
  );

  // Gold Rule below Header
  doc.setFillColor(197, 155, 39);
  doc.rect(13, 51, 184, 1.5, 'F');

  // Document Reference Row
  const refCode = `RH-AGR-${String(input.recordId).padStart(5, '0')}`;
  doc.setTextColor(82, 96, 113);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`DOCUMENT REF: ${refCode}`, 22, 63);
  doc.text(`ISSUED: ${sanitizePdfText(input.timestamp)}`, 188, 63, { align: 'right' });

  // Attestation Statement
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const statement =
    'This official agreement receipt certifies that the Fellow named below has confirmed their institutional profile and affixed their electronic signature to the Republic Hall Fellows Agreement.';
  const wrappedStatement = doc.splitTextToSize(statement, 166);
  doc.text(wrappedStatement, 22, 76);

  // Fellow Agreement Details Card
  const boxTop = 98;
  doc.setFillColor(249, 248, 244);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.rect(22, boxTop, 166, 56, 'FD');

  const rows: Array<[string, string]> = [
    ['Fellow Full Name', sanitizePdfText(input.fullName)],
    ['Staff ID Number', sanitizePdfText(input.staffId)],
    ['Date & Time of Signing', sanitizePdfText(input.timestamp)],
    ['Agreement Status', 'Confirmed & Electronically Signed'],
  ];

  let rowY = boxTop + 12;
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(label, 28, rowY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(11, 31, 58);
    doc.text(value, 82, rowY);
    rowY += 12;
  }

  // Dedicated Signature Box
  const sigTop = 168;
  doc.setTextColor(11, 31, 58);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('FELLOW ELECTRONIC SIGNATURE', 22, sigTop);

  doc.setDrawColor(11, 31, 58);
  doc.setLineWidth(0.5);
  doc.setFillColor(255, 255, 255);
  doc.rect(22, sigTop + 5, 166, 62, 'FD');

  if (input.signatureDataUrl) {
    // Center signature image cleanly inside the signature box
    doc.addImage(input.signatureDataUrl, 'PNG', 40, sigTop + 10, 130, 44, undefined, 'FAST');
  }

  // Signature baseline & caption
  doc.setDrawColor(197, 155, 39);
  doc.setLineWidth(0.4);
  doc.line(42, sigTop + 57, 168, sigTop + 57);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    sanitizePdfText(`Signed electronically by ${input.fullName} (${input.staffId})`),
    105,
    sigTop + 62.5,
    { align: 'center' },
  );

  // Handoff Notice
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const notice =
    'Submission Notice: Please submit this signed PDF receipt directly to the Hall Tutor via WhatsApp (+233 50 675 9271) for official filing.';
  doc.text(doc.splitTextToSize(notice, 166), 105, 254, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(155, 120, 22);
  doc.text('REPUBLIC HALL  •  FELLOWS AGREEMENT REGISTRY', 105, 273, { align: 'center' });

  const blob = doc.output('blob');
  const filename = buildPdfFilename(input.staffId, input.fullName);
  return { blob, filename };
}

export function triggerPdfDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
