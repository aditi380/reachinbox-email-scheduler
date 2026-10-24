import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileUp,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import { ScheduleCampaignPayload } from '../types/email';
import {
  computeDispatchSchedule,
  parseEmailInput,
  readRecipientsFile,
  toLocalDateTimeInputValue,
} from '../utils/emailParser';

interface ComposeEmailFormProps {
  senderEmail: string;
  onScheduleSubmit: (payload: ScheduleCampaignPayload) => Promise<{ scheduledCount: number }>;
  onNavigateToScheduled: () => void;
}

interface ValidationErrors {
  subject?: string;
  body?: string;
  recipients?: string;
  startTime?: string;
  delaySeconds?: string;
  hourlyLimit?: string;
  file?: string;
  submit?: string;
}

const SAMPLE_CSV_CONTENT = `name,email,company
Ananya Deshmukh,ananya.deshmukh@cloudpulse.io,CloudPulse
Liam O'Connor,liam.oconnor@vertextech.com,Vertex Tech
Kenji Takahashi,kenji@kumoanalytics.jp,Kumo Analytics
 Clara Weber , clara.weber@nordicgrid.de , NordicGrid
maya.patel@finbridge.co,Maya Patel,FinBridge`;

function formatPreviewTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export const ComposeEmailForm: React.FC<ComposeEmailFormProps> = ({
  senderEmail,
  onScheduleSubmit,
  onNavigateToScheduled,
}) => {
  const defaultStart = useMemo(
    () => toLocalDateTimeInputValue(new Date(Date.now() + 15 * 60_000)),
    []
  );

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientText, setRecipientText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(defaultStart);
  const [delaySeconds, setDelaySeconds] = useState<string>('30');
  const [hourlyLimit, setHourlyLimit] = useState<string>('50');

  const [showParsedList, setShowParsedList] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const parsedRecipients = useMemo(
    () => parseEmailInput(recipientText),
    [recipientText]
  );

  const numericDelay = Number(delaySeconds);
  const numericHourlyLimit = Number(hourlyLimit);

  const dispatchPreview = useMemo(() => {
    if (
      parsedRecipients.validEmails.length === 0 ||
      Number.isNaN(numericDelay) ||
      numericDelay < 0 ||
      Number.isNaN(numericHourlyLimit) ||
      numericHourlyLimit < 1
    ) {
      return [];
    }
    const isoStart = startTime ? new Date(startTime).toISOString() : new Date().toISOString();
    return computeDispatchSchedule(
      parsedRecipients.validEmails.length,
      isoStart,
      numericDelay,
      numericHourlyLimit
    );
  }, [parsedRecipients.validEmails.length, startTime, numericDelay, numericHourlyLimit]);

  const deferredByHourlyCapCount = useMemo(() => {
    if (dispatchPreview.length === 0 || !startTime) return 0;
    const baseMs = new Date(startTime).getTime();
    if (Number.isNaN(baseMs)) return 0;
    const safeDelay = Math.max(0, numericDelay || 0);
    return dispatchPreview.filter((date, idx) => {
      const unthrottled = baseMs + idx * safeDelay * 1000;
      return date.getTime() - unthrottled >= 60_000;
    }).length;
  }, [dispatchPreview, startTime, numericDelay]);

  const processUploadedFile = async (file: File) => {
    setErrors((prev) => ({ ...prev, file: undefined, recipients: undefined }));
    setSuccessMessage(null);
    setIsReadingFile(true);
    try {
      const content = await readRecipientsFile(file);
      setUploadedFileName(file.name);
      setRecipientText((prev) => (prev.trim() ? `${prev.trim()}\n${content}` : content));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to read the selected file.';
      setErrors((prev) => ({ ...prev, file: message }));
    } finally {
      setIsReadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processUploadedFile(file);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingFile(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await processUploadedFile(file);
  };

  const handleRemoveSingleValidEmail = (emailToRemove: string) => {
    const remaining = parsedRecipients.validEmails.filter((e) => e !== emailToRemove);
    const invalidPart =
      parsedRecipients.invalidEntries.length > 0
        ? `\n${parsedRecipients.invalidEntries.join('\n')}`
        : '';
    setRecipientText(`${remaining.join('\n')}${invalidPart}`.trim());
  };

  const handleStripInvalidEntries = () => {
    setRecipientText(parsedRecipients.validEmails.join('\n'));
    setErrors((prev) => ({ ...prev, recipients: undefined }));
  };

  const validateForm = (): ValidationErrors => {
    const nextErrors: ValidationErrors = {};

    if (!subject.trim()) {
      nextErrors.subject = 'Enter an email subject line.';
    } else if (subject.trim().length > 200) {
      nextErrors.subject = 'Subject must be 200 characters or fewer.';
    }

    if (!body.trim()) {
      nextErrors.body = 'Enter the email message body.';
    }

    if (parsedRecipients.validEmails.length === 0) {
      nextErrors.recipients =
        'Provide at least one valid recipient email address via text or CSV/TXT upload.';
    }

    if (!startTime) {
      nextErrors.startTime = 'Select a start date and time.';
    } else {
      const startMs = new Date(startTime).getTime();
      if (Number.isNaN(startMs)) {
        nextErrors.startTime = 'Invalid date/time format.';
      } else if (startMs < Date.now() - 60_000) {
        nextErrors.startTime = 'Start date and time cannot be in the past.';
      }
    }

    if (
      delaySeconds.trim() === '' ||
      Number.isNaN(numericDelay) ||
      !Number.isFinite(numericDelay) ||
      numericDelay < 0
    ) {
      nextErrors.delaySeconds = 'Delay must be 0 seconds or greater.';
    } else if (numericDelay > 86_400) {
      nextErrors.delaySeconds = 'Delay cannot exceed 86,400 seconds (24 hours).';
    }

    if (
      hourlyLimit.trim() === '' ||
      Number.isNaN(numericHourlyLimit) ||
      !Number.isInteger(numericHourlyLimit) ||
      numericHourlyLimit < 1
    ) {
      nextErrors.hourlyLimit = 'Hourly limit must be a whole number of at least 1.';
    } else if (numericHourlyLimit > 10_000) {
      nextErrors.hourlyLimit = 'Hourly limit cannot exceed 10,000 emails/hour.';
    }

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const payload: ScheduleCampaignPayload = {
        subject: subject.trim(),
        body,
        recipients: parsedRecipients.validEmails,
        startTime: new Date(startTime).toISOString(),
        delaySeconds: Math.floor(numericDelay),
        hourlyLimit: Math.floor(numericHourlyLimit),
      };

      const result = await onScheduleSubmit(payload);
      setSuccessMessage(
        `Scheduled ${result.scheduledCount} ${
          result.scheduledCount === 1 ? 'email' : 'emails'
        } starting ${formatPreviewTimestamp(new Date(payload.startTime))}.`
      );
      setSubject('');
      setBody('');
      setRecipientText('');
      setUploadedFileName(null);
      setShowParsedList(false);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to schedule emails. Verify your backend server connection.';
      setErrors({ submit: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
      {/* Main Compose Form Surface */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="xl:col-span-8 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6"
      >
        <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Compose Scheduled Campaign
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sending from <span className="font-mono text-slate-700">{senderEmail}</span>
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {parsedRecipients.validEmails.length} valid{' '}
            {parsedRecipients.validEmails.length === 1 ? 'recipient' : 'recipients'}
          </span>
        </div>

        {/* Submission Success Banner */}
        {successMessage && (
          <div
            role="status"
            className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-2.5 text-sm text-emerald-900">
              <CheckCircle2
                className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>{successMessage}</span>
            </div>
            <button
              type="button"
              onClick={onNavigateToScheduled}
              className="px-3 py-1.5 min-h-9 text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-100 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              <span>View Scheduled Emails</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* API / Top-Level Submit Error */}
        {errors.submit && (
          <div
            role="alert"
            className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-sm text-red-900"
          >
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errors.submit}</span>
          </div>
        )}

        {/* Subject Field */}
        <div className="space-y-1.5">
          <label
            htmlFor="campaign-subject"
            className="block text-sm font-semibold text-slate-900"
          >
            Subject
          </label>
          <input
            id="campaign-subject"
            type="text"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              if (errors.subject) setErrors((prev) => ({ ...prev, subject: undefined }));
            }}
            placeholder="e.g., Scaling outbound deliverability for your growth team"
            aria-invalid={Boolean(errors.subject)}
            aria-describedby={errors.subject ? 'campaign-subject-error' : undefined}
            className={`w-full min-h-10 px-3.5 py-2 text-sm bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
              errors.subject ? 'border-red-400' : 'border-slate-300'
            }`}
          />
          {errors.subject && (
            <p id="campaign-subject-error" role="alert" className="text-xs text-red-600">
              {errors.subject}
            </p>
          )}
        </div>

        {/* Email Body Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="campaign-body"
              className="block text-sm font-semibold text-slate-900"
            >
              Email Body
            </label>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {body.length} chars
            </span>
          </div>
          <textarea
            id="campaign-body"
            rows={6}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (errors.body) setErrors((prev) => ({ ...prev, body: undefined }));
            }}
            placeholder="Write the plain-text message body to dispatch to each recipient..."
            aria-invalid={Boolean(errors.body)}
            aria-describedby={errors.body ? 'campaign-body-error' : undefined}
            className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600 ${
              errors.body ? 'border-red-400' : 'border-slate-300'
            }`}
          />
          {errors.body && (
            <p id="campaign-body-error" role="alert" className="text-xs text-red-600">
              {errors.body}
            </p>
          )}
        </div>

        {/* Recipients Text + CSV/TXT Upload */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="campaign-recipients"
              className="block text-sm font-semibold text-slate-900"
            >
              Recipients (Text or CSV / TXT Upload)
            </label>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  setRecipientText(SAMPLE_CSV_CONTENT);
                  setUploadedFileName('sample_leads.csv');
                  setErrors((prev) => ({ ...prev, recipients: undefined, file: undefined }));
                }}
                className="font-medium text-blue-600 hover:text-blue-800 hover:underline underline-offset-4 whitespace-nowrap"
              >
                Load sample CSV
              </button>
              {recipientText.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setRecipientText('');
                    setUploadedFileName(null);
                    setShowParsedList(false);
                  }}
                  className="font-medium text-slate-500 hover:text-slate-900 whitespace-nowrap"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Accessible File Dropzone & Picker */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={handleDrop}
            className={`p-3.5 rounded-lg border border-dashed transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isDraggingFile
                ? 'border-blue-600 bg-blue-50/50'
                : 'border-slate-300 bg-slate-50'
            }`}
          >
            <div className="text-xs text-slate-600">
              {uploadedFileName ? (
                <span>
                  Loaded file:{' '}
                  <strong className="font-mono text-slate-900">{uploadedFileName}</strong>
                </span>
              ) : (
                <span>
                  Drag and drop a <code className="font-mono">.csv</code> or{' '}
                  <code className="font-mono">.txt</code> recipient list here, or browse from
                  disk.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={fileInputRef}
                id="recipient-file-upload"
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                onChange={handleFileChange}
                className="sr-only"
              />
              <label
                htmlFor="recipient-file-upload"
                className="min-h-9 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap focus-within:ring-2 focus-within:ring-blue-600"
              >
                {isReadingFile ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <FileUp className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>Upload CSV / TXT</span>
              </label>
            </div>
          </div>

          {errors.file && (
            <p role="alert" className="text-xs text-red-600">
              {errors.file}
            </p>
          )}

          <textarea
            id="campaign-recipients"
            rows={4}
            value={recipientText}
            onChange={(e) => {
              setRecipientText(e.target.value);
              if (errors.recipients) {
                setErrors((prev) => ({ ...prev, recipients: undefined }));
              }
            }}
            placeholder="Paste emails separated by commas, spaces, or newlines (e.g., founder@acme.io, cto@veridian.ai)"
            aria-invalid={Boolean(errors.recipients)}
            aria-describedby="recipient-parse-summary"
            className={`w-full px-3.5 py-2.5 text-sm font-mono bg-white border rounded-lg text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
              errors.recipients ? 'border-red-400' : 'border-slate-300'
            }`}
          />

          {/* Live Parsed Recipients Count & Inspection Bar */}
          <div
            id="recipient-parse-summary"
            aria-live="polite"
            className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-0.5"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
              <span className="font-semibold text-slate-900">
                <span className="font-mono">{parsedRecipients.validEmails.length}</span> valid
                email{' '}
                {parsedRecipients.validEmails.length === 1
                  ? 'address'
                  : 'addresses'}{' '}
                parsed
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <span className="font-mono">{parsedRecipients.duplicateCount}</span>{' '}
                {parsedRecipients.duplicateCount === 1 ? 'duplicate' : 'duplicates'} removed
              </span>
              {parsedRecipients.invalidEntries.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-700 font-medium">
                    <span className="font-mono">
                      {parsedRecipients.invalidEntries.length}
                    </span>{' '}
                    invalid {parsedRecipients.invalidEntries.length === 1 ? 'entry' : 'entries'}{' '}
                    skipped
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              {parsedRecipients.invalidEntries.length > 0 && (
                <button
                  type="button"
                  onClick={handleStripInvalidEntries}
                  className="text-amber-800 hover:underline underline-offset-4 font-medium whitespace-nowrap"
                >
                  Remove invalid tokens
                </button>
              )}
              {parsedRecipients.validEmails.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowParsedList((prev) => !prev)}
                  className="text-blue-600 hover:text-blue-800 hover:underline underline-offset-4 font-medium whitespace-nowrap"
                >
                  {showParsedList ? 'Hide parsed list' : 'Inspect parsed emails'}
                </button>
              )}
            </div>
          </div>

          {errors.recipients && (
            <p role="alert" className="text-xs text-red-600">
              {errors.recipients}
            </p>
          )}

          {/* Expandable Clean Monospace Recipient Inspection Table */}
          {showParsedList && parsedRecipients.validEmails.length > 0 && (
            <div className="border border-slate-200 rounded-lg max-h-44 overflow-y-auto divide-y divide-slate-100">
              {parsedRecipients.validEmails.map((email, index) => (
                <div
                  key={email}
                  className="px-3 py-1.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50"
                >
                  <span className="font-mono text-slate-700 truncate">
                    <span className="text-slate-400 mr-2 tabular-nums">
                      {String(index + 1).padStart(2, '0')}.
                    </span>
                    {email}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSingleValidEmail(email)}
                    aria-label={`Remove ${email}`}
                    className="p-1 text-slate-400 hover:text-red-600 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {parsedRecipients.invalidEntries.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-semibold">
                Skipped malformed entries (not included in scheduled batch):
              </p>
              <p className="font-mono break-all text-amber-800">
                {parsedRecipients.invalidEntries.slice(0, 8).join(', ')}
                {parsedRecipients.invalidEntries.length > 8
                  ? ` (+${parsedRecipients.invalidEntries.length - 8} more)`
                  : ''}
              </p>
            </div>
          )}
        </div>

        {/* Scheduling & Rate-Limiting Fields */}
        <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Start Date/Time */}
          <div className="space-y-1.5">
            <label
              htmlFor="campaign-start-time"
              className="block text-sm font-semibold text-slate-900"
            >
              Start Date &amp; Time
            </label>
            <input
              id="campaign-start-time"
              type="datetime-local"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                if (errors.startTime) {
                  setErrors((prev) => ({ ...prev, startTime: undefined }));
                }
              }}
              aria-invalid={Boolean(errors.startTime)}
              aria-describedby={errors.startTime ? 'start-time-error' : undefined}
              className={`w-full min-h-10 px-3 py-2 text-sm font-mono tabular-nums bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                errors.startTime ? 'border-red-400' : 'border-slate-300'
              }`}
            />
            {errors.startTime ? (
              <p id="start-time-error" role="alert" className="text-xs text-red-600">
                {errors.startTime}
              </p>
            ) : (
              <p className="text-xs text-slate-500">Initial queue release timestamp</p>
            )}
          </div>

          {/* Delay Between Emails */}
          <div className="space-y-1.5">
            <label
              htmlFor="campaign-delay"
              className="block text-sm font-semibold text-slate-900"
            >
              Delay Between Emails (s)
            </label>
            <input
              id="campaign-delay"
              type="number"
              min={0}
              max={86400}
              step={1}
              value={delaySeconds}
              onChange={(e) => {
                setDelaySeconds(e.target.value);
                if (errors.delaySeconds) {
                  setErrors((prev) => ({ ...prev, delaySeconds: undefined }));
                }
              }}
              aria-invalid={Boolean(errors.delaySeconds)}
              aria-describedby={errors.delaySeconds ? 'delay-error' : undefined}
              className={`w-full min-h-10 px-3 py-2 text-sm font-mono tabular-nums bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                errors.delaySeconds ? 'border-red-400' : 'border-slate-300'
              }`}
            />
            {errors.delaySeconds ? (
              <p id="delay-error" role="alert" className="text-xs text-red-600">
                {errors.delaySeconds}
              </p>
            ) : (
              <p className="text-xs text-slate-500">Minimum gap between consecutive sends</p>
            )}
          </div>

          {/* Hourly Sending Limit */}
          <div className="space-y-1.5">
            <label
              htmlFor="campaign-hourly-limit"
              className="block text-sm font-semibold text-slate-900"
            >
              Hourly Sending Limit
            </label>
            <input
              id="campaign-hourly-limit"
              type="number"
              min={1}
              max={10000}
              step={1}
              value={hourlyLimit}
              onChange={(e) => {
                setHourlyLimit(e.target.value);
                if (errors.hourlyLimit) {
                  setErrors((prev) => ({ ...prev, hourlyLimit: undefined }));
                }
              }}
              aria-invalid={Boolean(errors.hourlyLimit)}
              aria-describedby={errors.hourlyLimit ? 'hourly-limit-error' : undefined}
              className={`w-full min-h-10 px-3 py-2 text-sm font-mono tabular-nums bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                errors.hourlyLimit ? 'border-red-400' : 'border-slate-300'
              }`}
            />
            {errors.hourlyLimit ? (
              <p id="hourly-limit-error" role="alert" className="text-xs text-red-600">
                {errors.hourlyLimit}
              </p>
            ) : (
              <p className="text-xs text-slate-500">Max dispatches per rolling 60 min</p>
            )}
          </div>
        </div>

        {/* Submit Footer */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setSubject('');
              setBody('');
              setRecipientText('');
              setUploadedFileName(null);
              setErrors({});
              setSuccessMessage(null);
            }}
            disabled={isSubmitting}
            className="min-h-10 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset Form</span>
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-60 whitespace-nowrap"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Scheduling Emails...</span>
              </>
            ) : (
              <>
                <CalendarClock className="w-4 h-4" aria-hidden="true" />
                <span>Schedule Emails</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Right Column: Live Dispatch Pacing & Window Preview */}
      <aside className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="space-y-1">
          <h3 className="text-base font-bold tracking-tight text-slate-900">
            Dispatch Pacing Preview
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Calculated release slots based on your start time, inter-email delay, and
            rolling hourly sending quota.
          </p>
        </div>

        <dl className="divide-y divide-slate-200 border-t border-b border-slate-200 text-xs">
          <div className="py-3 flex items-center justify-between gap-4">
            <dt className="text-slate-600">Valid Recipients</dt>
            <dd className="font-mono font-semibold text-slate-900 tabular-nums">
              {parsedRecipients.validEmails.length}
            </dd>
          </div>
          <div className="py-3 flex items-center justify-between gap-4">
            <dt className="text-slate-600">Pacing Interval</dt>
            <dd className="font-mono text-slate-900 tabular-nums">
              {Number.isFinite(numericDelay) && numericDelay >= 0 ? `${numericDelay}s` : '—'}
            </dd>
          </div>
          <div className="py-3 flex items-center justify-between gap-4">
            <dt className="text-slate-600">Hourly Cap</dt>
            <dd className="font-mono text-slate-900 tabular-nums">
              {Number.isInteger(numericHourlyLimit) && numericHourlyLimit >= 1
                ? `${numericHourlyLimit} / hr`
                : '—'}
            </dd>
          </div>
          <div className="py-3 flex items-center justify-between gap-4">
            <dt className="text-slate-600">Hourly Window Deferrals</dt>
            <dd className="font-mono text-slate-900 tabular-nums">
              {deferredByHourlyCapCount}
            </dd>
          </div>
          <div className="py-3 flex items-center justify-between gap-4">
            <dt className="text-slate-600">Final Dispatch Slot</dt>
            <dd className="font-mono text-slate-900 tabular-nums">
              {dispatchPreview.length > 0
                ? formatPreviewTimestamp(dispatchPreview[dispatchPreview.length - 1])
                : '—'}
            </dd>
          </div>
        </dl>

        {dispatchPreview.length > 0 ? (
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-900">
              Upcoming Recipient Slots
            </p>
            <div className="divide-y divide-slate-100 text-xs">
              {parsedRecipients.validEmails.slice(0, 5).map((email, idx) => (
                <div
                  key={email}
                  className="py-2 flex items-center justify-between gap-3"
                >
                  <span className="font-mono text-slate-700 truncate">{email}</span>
                  <span className="font-mono text-slate-500 tabular-nums whitespace-nowrap shrink-0">
                    {formatPreviewTimestamp(dispatchPreview[idx])}
                  </span>
                </div>
              ))}
              {parsedRecipients.validEmails.length > 5 && (
                <p className="pt-2 text-xs text-slate-500 font-mono tabular-nums">
                  +{parsedRecipients.validEmails.length - 5} additional scheduled{' '}
                  {parsedRecipients.validEmails.length - 5 === 1
                    ? 'recipient'
                    : 'recipients'}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 leading-relaxed">
            Add recipient addresses via text input or CSV/TXT upload to preview exact
            job execution timestamps.
          </p>
        )}
      </aside>
    </div>
  );
};
