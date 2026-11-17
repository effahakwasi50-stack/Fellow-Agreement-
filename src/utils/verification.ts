import { HALL_TUTOR_WHATSAPP } from '../data/fellowsSeed';

export interface FellowRecord {
  id: number;
  full_name: string;
}

export interface SubmissionRecord {
  id: number;
  full_name: string;
  staff_id: string;
  signature_data_url: string;
  timestamp: string;
}

export interface ValidationInput {
  fullName: string | null;
  staffId: string;
  hasSignature: boolean;
}

export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

export function filterFellows<T extends { full_name: string }>(
  fellows: readonly T[],
  query: string,
): T[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [...fellows];
  }
  return fellows.filter((f) => f.full_name.toLowerCase().includes(normalized));
}

export function validateSubmission(input: ValidationInput): ValidationResult {
  if (!input.fullName || !input.fullName.trim()) {
    return {
      valid: false,
      error: 'Please select a Fellow name in Step 1.',
    };
  }
  if (!input.staffId.trim()) {
    return {
      valid: false,
      error: 'Please enter your Staff ID Number in Step 2.',
    };
  }
  if (!input.hasSignature) {
    return {
      valid: false,
      error: 'Please draw your signature on the signature pad before confirming.',
    };
  }
  return { valid: true, error: null };
}

export function sanitizeFilenameSegment(value: string): string {
  const cleaned = value.trim().replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || 'Record';
}

export function buildPdfFilename(staffId: string, fullName: string): string {
  return `Republic_Hall_${sanitizeFilenameSegment(staffId)}_${sanitizeFilenameSegment(fullName)}.pdf`;
}

export function buildWhatsAppMessage(fullName: string, staffId: string): string {
  return (
    `Hello Hall Tutor, I have completed my agreement form. ` +
    `Please find attached my signed PDF document. ` +
    `Fellow Name: ${fullName.trim()} | Staff ID: ${staffId.trim()}`
  );
}

export function buildWhatsAppUrl(
  fullName: string,
  staffId: string,
  phone: string = HALL_TUTOR_WHATSAPP,
): string {
  const message = buildWhatsAppMessage(fullName, staffId);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function parseFellowsUpload(content: string, filename: string): string[] {
  const stripped = content.replace(/^\uFEFF/, '');
  const isCsv = filename.toLowerCase().endsWith('.csv');
  const lines = stripped.split(/\r?\n/);
  const seen = new Set<string>();
  const result: string[] = [];

  const headerTokens = new Set([
    'full_name',
    'fullname',
    'name',
    'fellow',
    'fellow_name',
  ]);

  lines.forEach((rawLine, index) => {
    const trimmedLine = rawLine.trim();
    if (!trimmedLine) return;

    let candidate = trimmedLine;
    if (isCsv) {
      // Handle quoted first CSV column or plain comma-separated column
      if (trimmedLine.startsWith('"')) {
        const match = trimmedLine.match(/^"((?:[^"]|"")*)"/);
        candidate = match ? match[1].replace(/""/g, '"').trim() : trimmedLine.split(',')[0].trim();
      } else {
        candidate = trimmedLine.split(',')[0].trim();
      }
    }

    if (!candidate) return;
    if (index === 0 && headerTokens.has(candidate.toLowerCase())) {
      return;
    }
    if (!seen.has(candidate)) {
      seen.add(candidate);
      result.push(candidate);
    }
  });

  return result;
}

export function generateSubmissionsCsv(records: readonly SubmissionRecord[]): string {
  const escapeCell = (val: string | number) => {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = ['id', 'full_name', 'staff_id', 'timestamp'].join(',');
  const rows = records.map((r) =>
    [r.id, r.full_name, r.staff_id, r.timestamp].map(escapeCell).join(','),
  );
  return [header, ...rows].join('\n');
}
