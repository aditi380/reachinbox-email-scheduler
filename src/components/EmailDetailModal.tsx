import React, { useEffect } from 'react';
import { AlertCircle, Loader2, Trash2, X } from 'lucide-react';
import { EmailRecord, EmailStatus } from '../types/email';

interface EmailDetailModalProps {
  email: EmailRecord | null;
  cancellingId: string | null;
  onClose: () => void;
  onCancelScheduled: (id: string) => Promise<void>;
}

function formatFullTimestamp(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: false,
  }).format(date);
}

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({
  email,
  cancellingId,
  onClose,
  onCancelScheduled,
}) => {
  useEffect(() => {
    if (!email) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [email, onClose]);

  if (!email) return null;

  const isScheduled =
    email.status === EmailStatus.SCHEDULED || email.status === EmailStatus.RATE_LIMITED;
  const isCancelling = cancellingId === email.id;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-detail-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 bg-slate-900/40"
      />

      <div className="relative z-10 w-full max-w-2xl bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="email-detail-heading"
              className="text-base font-bold text-slate-900 truncate"
            >
              {email.subject}
            </h2>
            <p className="text-xs text-slate-500 font-mono truncate mt-0.5">
              Job ID: {email.id} · Campaign: {email.campaignId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close email details"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {email.errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-900"
            >
              <AlertCircle
                className="w-4 h-4 text-red-700 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">Delivery Error</p>
                <p className="font-mono mt-0.5">{email.errorMessage}</p>
              </div>
            </div>
          )}

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs border-b border-slate-200 pb-5">
            <div>
              <dt className="text-slate-500">Sender</dt>
              <dd className="font-mono text-slate-900 mt-0.5">{email.senderEmail}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Recipient</dt>
              <dd className="font-mono text-slate-900 mt-0.5">{email.recipient}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Scheduled Release</dt>
              <dd className="font-mono text-slate-900 tabular-nums mt-0.5">
                {formatFullTimestamp(email.scheduledAt)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Delivered At</dt>
              <dd className="font-mono text-slate-900 tabular-nums mt-0.5">
                {formatFullTimestamp(email.sentAt)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Rate Configuration</dt>
              <dd className="font-mono text-slate-900 tabular-nums mt-0.5">
                {email.delaySeconds}s delay · {email.hourlyLimit} emails/hr
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="font-semibold text-slate-900 mt-0.5">{email.status}</dd>
            </div>
          </dl>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-600">Message Body</h3>
            <pre className="p-4 rounded-lg bg-slate-50 border border-slate-200 font-sans text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {email.body}
            </pre>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          {isScheduled ? (
            <button
              type="button"
              disabled={isCancelling}
              onClick={async () => {
                await onCancelScheduled(email.id);
                onClose();
              }}
              className="min-h-9 px-3.5 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-300 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {isCancelling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>Cancel Scheduled Send</span>
            </button>
          ) : (
            <span className="text-xs text-slate-500">Completed job record</span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="min-h-9 px-4 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
