import { ParsedRecipientsResult } from '../types/email';

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const HEADER_KEYWORDS = new Set([
  'email',
  'emails',
  'e-mail',
  'email_address',
  'emailaddress',
  'recipient',
  'recipients',
  'to',
  'contact_email',
]);

function splitCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeCandidate(raw: string): string {
  const trimmed = raw.trim().replace(/^["']+|["']+$/g, '');
  const angleMatch = trimmed.match(/<([^<>]+)>/);
  if (angleMatch && angleMatch[1]) {
    return angleMatch[1].trim();
  }
  return trimmed;
}

/**
 * Parses raw recipient text or CSV/TXT file contents into deduplicated valid emails,
 * invalid tokens, and duplicate counts.
 */
export function parseEmailInput(rawText: string): ParsedRecipientsResult {
  if (!rawText.trim()) {
    return { validEmails: [], invalidEntries: [], duplicateCount: 0 };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { validEmails: [], invalidEntries: [], duplicateCount: 0 };
  }

  const candidates: string[] = [];

  // Check if the first row is a structured CSV header containing an email column
  const firstRowCols = splitCsvRow(lines[0]).map((col) =>
    col.toLowerCase().replace(/^["']+|["']+$/g, '').trim()
  );
  const emailColIndex = firstRowCols.findIndex((col) => HEADER_KEYWORDS.has(col));
  const firstRowHasAtSymbol = lines[0].includes('@');

  if (emailColIndex !== -1 && !firstRowHasAtSymbol && lines.length > 1) {
    for (let i = 1; i < lines.length; i += 1) {
      const cols = splitCsvRow(lines[i]);
      const cell = cols[emailColIndex] ?? '';
      if (cell.trim()) {
        candidates.push(normalizeCandidate(cell));
      }
    }
  } else {
    const startLineIndex =
      !firstRowHasAtSymbol &&
      firstRowCols.some((col) => ['name', 'first_name', 'company', 'email'].includes(col))
        ? 1
        : 0;

    for (let i = startLineIndex; i < lines.length; i += 1) {
      const tokens = lines[i]
        .split(/[,;\s]+/)
        .map((token) => normalizeCandidate(token))
        .filter((token) => token.length > 0);
      candidates.push(...tokens);
    }
  }

  const seen = new Set<string>();
  const validEmails: string[] = [];
  const invalidEntries: string[] = [];
  let duplicateCount = 0;

  for (const candidate of candidates) {
    if (EMAIL_REGEX.test(candidate)) {
      const lower = candidate.toLowerCase();
      if (seen.has(lower)) {
        duplicateCount += 1;
      } else {
        seen.add(lower);
        validEmails.push(lower);
      }
    } else {
      invalidEntries.push(candidate);
    }
  }

  return {
    validEmails,
    invalidEntries,
    duplicateCount,
  };
}

/**
 * Reads a .csv or .txt file from an HTML file input or drag-and-drop event.
 */
export async function readRecipientsFile(file: File): Promise<string> {
  const allowedExtensions = ['.csv', '.txt'];
  const lowerName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some((ext) => lowerName.endsWith(ext));

  if (!hasValidExtension && file.type !== 'text/csv' && file.type !== 'text/plain') {
    throw new Error('Unsupported file format. Please upload a .csv or .txt file.');
  }

  const maxBytes = 5 * 1024 * 1024; // 5 MB safety limit
  if (file.size > maxBytes) {
    throw new Error('File exceeds the 5 MB limit. Please upload a smaller recipient list.');
  }

  return file.text();
}

/**
 * Computes exact per-email dispatch timestamps enforcing both minimum inter-email delay
 * and rolling 60-minute hourly sending limit.
 */
export function computeDispatchSchedule(
  recipientCount: number,
  startTimeIso: string,
  delaySeconds: number,
  hourlyLimit: number
): Date[] {
  if (recipientCount <= 0) return [];

  const parsedStart = new Date(startTimeIso).getTime();
  const baseStartMs = Number.isNaN(parsedStart) ? Date.now() + 60_000 : parsedStart;
  const safeDelayMs = Math.max(0, delaySeconds) * 1000;
  const safeHourlyLimit = Math.max(1, Math.floor(hourlyLimit));
  const oneHourMs = 3_600_000;

  const scheduleMs: number[] = [];
  let windowStartIdx = 0;

  for (let i = 0; i < recipientCount; i += 1) {
    let candidateMs = i === 0 ? baseStartMs : scheduleMs[i - 1] + safeDelayMs;

    while (
      windowStartIdx < scheduleMs.length &&
      candidateMs - scheduleMs[windowStartIdx] >= oneHourMs
    ) {
      windowStartIdx += 1;
    }

    const activeInWindow = scheduleMs.length - windowStartIdx;
    if (activeInWindow >= safeHourlyLimit) {
      const oldestInWindowMs = scheduleMs[windowStartIdx];
      candidateMs = Math.max(candidateMs, oldestInWindowMs + oneHourMs);

      while (
        windowStartIdx < scheduleMs.length &&
        candidateMs - scheduleMs[windowStartIdx] >= oneHourMs
      ) {
        windowStartIdx += 1;
      }
    }

    scheduleMs.push(candidateMs);
  }

  return scheduleMs.map((ms) => new Date(ms));
}

/**
 * Formats a Date for an HTML datetime-local input in the user's local timezone.
 */
export function toLocalDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
