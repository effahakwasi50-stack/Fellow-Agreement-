import test from 'node:test';
import assert from 'node:assert/strict';
import { FELLOWS_SEED, HALL_TUTOR_WHATSAPP } from '../data/fellowsSeed';
import {
  buildPdfFilename,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  filterFellows,
  generateSubmissionsCsv,
  parseFellowsUpload,
  validateSubmission,
} from './verification';

test('FELLOWS_SEED contains all 119 unique Fellows in exact order', () => {
  assert.equal(FELLOWS_SEED.length, 119);
  assert.equal(FELLOWS_SEED[0], 'Dr. Yaw Nsiah-Peprah');
  assert.equal(FELLOWS_SEED[10], 'Prof. Kari’kacha Seid’ ou');
  assert.equal(FELLOWS_SEED[118], 'Mr. Albert Buondau');
  const unique = new Set(FELLOWS_SEED);
  assert.equal(unique.size, 119);
});

test('filterFellows matches case-insensitively and preserves order on empty query', () => {
  const sample = FELLOWS_SEED.map((full_name, idx) => ({ id: idx + 1, full_name }));
  assert.equal(filterFellows(sample, '').length, 119);
  const matches = filterFellows(sample, 'nsiah');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].full_name, 'Dr. Yaw Nsiah-Peprah');
});

test('validateSubmission rejects missing Fellow, empty Staff ID, or missing signature', () => {
  assert.equal(
    validateSubmission({ fullName: null, staffId: 'RH-100', hasSignature: true }).valid,
    false,
  );
  assert.equal(
    validateSubmission({ fullName: 'Dr. Yaw Nsiah-Peprah', staffId: '   ', hasSignature: true }).valid,
    false,
  );
  assert.equal(
    validateSubmission({ fullName: 'Dr. Yaw Nsiah-Peprah', staffId: 'RH-100', hasSignature: false }).valid,
    false,
  );
  assert.equal(
    validateSubmission({ fullName: 'Dr. Yaw Nsiah-Peprah', staffId: 'RH-100', hasSignature: true }).valid,
    true,
  );
});

test('buildPdfFilename formats Republic_Hall_[StaffID]_[FullName].pdf cleanly', () => {
  assert.equal(
    buildPdfFilename('RH-4082', 'Dr. Yaw Nsiah-Peprah'),
    'Republic_Hall_RH-4082_Dr_Yaw_Nsiah-Peprah.pdf',
  );
});

test('buildWhatsAppUrl encodes exact Hall Tutor message and number', () => {
  const url = buildWhatsAppUrl('Dr. Yaw Nsiah-Peprah', 'RH-4082');
  assert.ok(url.startsWith(`https://wa.me/${HALL_TUTOR_WHATSAPP}?text=`));
  const decoded = decodeURIComponent(url.split('?text=')[1]);
  assert.equal(
    decoded,
    buildWhatsAppMessage('Dr. Yaw Nsiah-Peprah', 'RH-4082'),
  );
  assert.equal(
    decoded,
    'Hello Hall Tutor, I have completed my agreement form. Please find attached my signed PDF document. Fellow Name: Dr. Yaw Nsiah-Peprah | Staff ID: RH-4082',
  );
});

test('parseFellowsUpload parses CSV headers, quoted names, and TXT lines cleanly', () => {
  const csv = '\uFEFFfull_name,dept\n"Dr. Linda, A-A Bedu-Addo",Science\nProf. Francis Boakye,Physics\nProf. Francis Boakye,Physics\n';
  assert.deepEqual(parseFellowsUpload(csv, 'fellows.csv'), [
    'Dr. Linda, A-A Bedu-Addo',
    'Prof. Francis Boakye',
  ]);

  const txt = 'Dr. Prince Odame\n\nDr. Samuel Boahen\r\n';
  assert.deepEqual(parseFellowsUpload(txt, 'fellows.txt'), [
    'Dr. Prince Odame',
    'Dr. Samuel Boahen',
  ]);
});

test('generateSubmissionsCsv escapes commas and quotes properly', () => {
  const csv = generateSubmissionsCsv([
    {
      id: 1,
      full_name: 'Dr. Linda, A-A Bedu-Addo',
      staff_id: 'RH-01',
      signature_data_url: 'data:image/png;base64,AAA',
      timestamp: '2026-11-17 15:30:00',
    },
  ]);
  assert.equal(
    csv,
    'id,full_name,staff_id,timestamp\n1,"Dr. Linda, A-A Bedu-Addo",RH-01,2026-11-17 15:30:00',
  );
});
