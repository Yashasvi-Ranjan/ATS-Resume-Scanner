import mammoth from 'mammoth';

export type ExtractFailureReason =
  | 'EMPTY'
  | 'CORRUPTED'
  | 'ENCRYPTED'
  | 'NO_TEXT_LAYER'
  | 'UNSUPPORTED';

const MESSAGES: Record<ExtractFailureReason, string> = {
  EMPTY: 'The file is empty or contains no text.',
  CORRUPTED: 'The file appears to be corrupted or is not a valid PDF/DOCX document.',
  ENCRYPTED: 'The PDF is password-protected/encrypted. Please upload an unprotected copy.',
  NO_TEXT_LAYER:
    'The PDF contains no selectable text (it looks like a scanned/image-only document). OCR is not supported; please upload a text-based PDF or a DOCX.',
  UNSUPPORTED: 'Unsupported file type. Only text-based PDF and DOCX resumes can be parsed.'
};

export class ResumeExtractionError extends Error {
  constructor(public readonly reason: ExtractFailureReason) {
    super(MESSAGES[reason]);
    this.name = 'ResumeExtractionError';
    Object.setPrototypeOf(this, ResumeExtractionError.prototype);
  }
  /** Safe to show to users and persist as parseError. */
  get publicMessage(): string {
    return MESSAGES[this.reason];
  }
}

export interface ExtractedText {
  text: string;
  pageCount?: number;
  warnings: string[];
}

export const MAX_EXTRACTED_CHARS = 200_000;
export const MAX_PDF_PAGES = 30;
/** Fewer meaningful characters than this means "no real text layer". */
const MIN_TEXT_CHARS = 20;

const LIGATURES: Record<string, string> = {
  'ﬀ': 'ff', 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬃ': 'ffi', 'ﬄ': 'ffl'
};

/** Normalise extracted text: whitespace, bullets, ligatures, soft/line-break hyphenation. */
export function normalizeExtractedText(raw: string): string {
  let t = String(raw ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ﬀ-ﬄ]/g, (c) => LIGATURES[c] ?? c)
    .replace(/­/g, '') // soft hyphen
    .replace(/[  -   　\t\f\v]/g, ' ')
    .replace(/[​-‍﻿]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000e-\u001f\u007f]/g, '');
  // De-hyphenate words broken across lines: "develop-\nment" -> "development" (only before a lowercase continuation).
  t = t.replace(/([A-Za-z]{2,})-[ ]*\n[ ]*([a-z]{2,})/g, '$1$2');
  t = t
    .split('\n')
    .map((l) => l.replace(/[ ]{2,}/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return t;
}

function startsWith(buf: Buffer, sig: string, within = 0): boolean {
  if (within > 0) return buf.subarray(0, within).toString('latin1').includes(sig);
  return buf.subarray(0, sig.length).toString('latin1') === sig;
}

type Kind = 'pdf' | 'docx';

function detectKind(buffer: Buffer, mimeType: string, filename: string): Kind {
  const ext = (filename.match(/\.[^.]+$/)?.[0] ?? '').toLowerCase();
  const declaredPdf = mimeType === 'application/pdf' || ext === '.pdf';
  const declaredDocx =
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx';
  if (startsWith(buffer, '%PDF', 1024)) return 'pdf';
  if (startsWith(buffer, 'PK')) {
    if (declaredPdf && !declaredDocx) throw new ResumeExtractionError('CORRUPTED');
    if (declaredDocx || declaredPdf) return 'docx';
    throw new ResumeExtractionError('UNSUPPORTED');
  }
  if (declaredPdf || declaredDocx) throw new ResumeExtractionError('CORRUPTED');
  // legacy .doc / unknown
  throw new ResumeExtractionError('UNSUPPORTED');
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
  data: Buffer,
  options?: { max?: number }
) => Promise<{ text: string; numpages: number }>;

async function extractPdf(buffer: Buffer): Promise<ExtractedText> {
  const warnings: string[] = [];
  let result: { text: string; numpages: number };
  try {
    // The bundled pdf.js misreads small/pooled Node Buffers (it ignores byteOffset), reporting valid
    // files as corrupt. Hand it a private plain Uint8Array copy instead.
    result = await pdfParse(new Uint8Array(buffer) as unknown as Buffer, { max: MAX_PDF_PAGES });
  } catch (err) {
    const name = (err as { name?: string })?.name ?? '';
    const msg = String((err as { message?: string })?.message ?? '');
    if (name === 'PasswordException' || /password|encrypt/i.test(msg)) {
      throw new ResumeExtractionError('ENCRYPTED');
    }
    throw new ResumeExtractionError('CORRUPTED');
  }
  if (result.numpages > MAX_PDF_PAGES) {
    warnings.push(`PDF has ${result.numpages} pages; only the first ${MAX_PDF_PAGES} were read.`);
  }
  const text = normalizeExtractedText(result.text);
  if (text.replace(/\s/g, '').length < MIN_TEXT_CHARS) {
    throw new ResumeExtractionError('NO_TEXT_LAYER');
  }
  return { text, pageCount: result.numpages, warnings };
}

async function extractDocx(buffer: Buffer): Promise<ExtractedText> {
  const warnings: string[] = [];
  let value: string;
  try {
    const r = await mammoth.extractRawText({ buffer });
    value = r.value;
    if (r.messages?.length) warnings.push('Some DOCX elements could not be read and were skipped.');
  } catch {
    throw new ResumeExtractionError('CORRUPTED');
  }
  const text = normalizeExtractedText(value);
  if (text.length === 0) throw new ResumeExtractionError('EMPTY');
  return { text, warnings };
}

/**
 * Extract plain text from a PDF or DOCX resume. Throws ResumeExtractionError with a typed reason.
 * OCR is intentionally NOT supported: image-only PDFs fail with NO_TEXT_LAYER.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ExtractedText> {
  if (!buffer || buffer.length === 0) throw new ResumeExtractionError('EMPTY');
  const kind = detectKind(buffer, mimeType, filename);
  const out = kind === 'pdf' ? await extractPdf(buffer) : await extractDocx(buffer);
  if (out.text.length > MAX_EXTRACTED_CHARS) {
    out.text = out.text.slice(0, MAX_EXTRACTED_CHARS);
    out.warnings.push(`Extracted text was truncated to ${MAX_EXTRACTED_CHARS} characters.`);
  }
  return out;
}
