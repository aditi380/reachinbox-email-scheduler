import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Loader2,
  MailPlus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { IS_MOCK_MODE } from '../services/api';
import { ActiveTab, EmailRecord, EmailStatus } from '../types/email';

interface EmailQueueTableProps {
  activeTab: ActiveTab;
  scheduledEmails: EmailRecord[];
  sentEmails: EmailRecord[];
  isLoading: boolean;
  error: string | null;
  cancellingId: string | null;
  onTabChange: (tab: ActiveTab) => void;
  onRefresh: () => Promise<void>;
  onCancelScheduled: (id: string) => Promise<void>;
  onInspectEmail: (email: EmailRecord) => void;
  onComposeClick: () => void;
  onMockPresetChange?: (preset: 'empty' | 'sample') => Promise<void>;
}

type StatusFilter = 'ALL' | EmailStatus;

function formatTableDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function getStatusPresentation(status: EmailStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case EmailStatus.SCHEDULED:
      return {
        label: 'Scheduled',
        className: 'text-blue-700 font-medium',
      };
    case EmailStatus.RATE_LIMITED:
      return {
        label: 'Queued (Next Hr)',
        className: 'text-amber-700 font-medium',
      };
    case EmailStatus.SENT:
      return {
        label: 'Delivered',
        className: 'text-emerald-700 font-medium',
      };
    case EmailStatus.FAILED:
      return {
        label: 'Delivery Failed',
        className: 'text-red-700 font-medium',
      };
  }
}

export const EmailQueueTable: React.FC<EmailQueueTableProps> = ({
  activeTab,
  scheduledEmails,
  sentEmails,
  isLoading,
  error,
  cancellingId,
  onTabChange,
  onRefresh,
  onCancelScheduled,
  onInspectEmail,
  onComposeClick,
  onMockPresetChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const handleSwitchTab = (tab: ActiveTab) => {
    setStatusFilter('ALL');
    onTabChange(tab);
  };

  const baseList =
    activeTab === ActiveTab.SCHEDULED ? scheduledEmails : sentEmails;

  const filteredList = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return baseList.filter((record) => {
      if (statusFilter !== 'ALL' && record.status !== statusFilter) {
        return false;
      }
      if (!normalizedQuery) return true;
      return (
        record.recipient.toLowerCase().includes(normalizedQuery) ||
        record.subject.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [baseList, searchQuery, statusFilter]);

  const totalRecordsCount = scheduledEmails.length + sentEmails.length;

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Tabs Header Bar */}
      <div className="px-6 pt-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Email queue views"
          className="flex items-center gap-6 -mb-px"
        >
          <button
            type="button"
            role="tab"
            id="tab-scheduled"
            aria-selected={activeTab === ActiveTab.SCHEDULED}
            aria-controls="panel-email-queue"
            onClick={() => handleSwitchTab(ActiveTab.SCHEDULED)}
            className={`pb-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              activeTab === ActiveTab.SCHEDULED
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Scheduled Emails{' '}
            <span className="ml-1 font-mono text-xs tabular-nums">
              ({scheduledEmails.length})
            </span>
          </button>

          <button
            type="button"
            role="tab"
            id="tab-sent"
            aria-selected={activeTab === ActiveTab.SENT}
            aria-controls="panel-email-queue"
            onClick={() => handleSwitchTab(ActiveTab.SENT)}
            className={`pb-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              activeTab === ActiveTab.SENT
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Sent Emails{' '}
            <span className="ml-1 font-mono text-xs tabular-nums">
              ({sentEmails.length})
            </span>
          </button>
        </div>

        <div className="pb-3 sm:pb-3.5 flex items-center gap-2">
          {IS_MOCK_MODE && onMockPresetChange && (
            <button
              type="button"
              onClick={() =>
                onMockPresetChange(totalRecordsCount > 0 ? 'empty' : 'sample')
              }
              className="min-h-9 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              {totalRecordsCount > 0 ? 'Test Empty State' : 'Load Sample Data'}
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="min-h-9 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Filter emails by recipient or subject"
            placeholder="Search recipient address or subject..."
            className="w-full min-h-9 pl-9 pr-8 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search query"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Interactive Segmented Status Filter */}
        <div
          role="group"
          aria-label="Filter by dispatch status"
          className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start md:self-auto"
        >
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          {activeTab === ActiveTab.SCHEDULED ? (
            <>
              <button
                type="button"
                onClick={() => setStatusFilter(EmailStatus.SCHEDULED)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === EmailStatus.SCHEDULED
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Scheduled
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter(EmailStatus.RATE_LIMITED)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === EmailStatus.RATE_LIMITED
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Next Hour Window
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStatusFilter(EmailStatus.SENT)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === EmailStatus.SENT
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Delivered
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter(EmailStatus.FAILED)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === EmailStatus.FAILED
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Failed
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Panel Body */}
      <div
        id="panel-email-queue"
        role="tabpanel"
        aria-labelledby={
          activeTab === ActiveTab.SCHEDULED ? 'tab-scheduled' : 'tab-sent'
        }
      >
        {/* Error State */}
        {error && (
          <div
            role="alert"
            className="m-6 p-4 rounded-lg bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-2.5 text-sm text-red-900">
              <AlertCircle
                className="w-4 h-4 text-red-700 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              className="px-3 py-1.5 min-h-9 text-xs font-semibold text-red-900 bg-white border border-red-300 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              Retry Request
            </button>
          </div>
        )}

        {/* Loading Skeleton State */}
        {isLoading && !error ? (
          <div aria-busy="true" aria-label="Loading email records" className="divide-y divide-slate-200">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="px-6 h-12 flex items-center justify-between gap-6 animate-pulse"
              >
                <div className="h-3.5 w-44 bg-slate-200 rounded" />
                <div className="h-3.5 flex-1 max-w-xs bg-slate-200 rounded hidden sm:block" />
                <div className="h-3.5 w-36 bg-slate-200 rounded" />
                <div className="h-3.5 w-20 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : filteredList.length === 0 && !error ? (
          /* Empty State */
          <div className="px-6 py-16 text-center max-w-md mx-auto space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                {baseList.length === 0
                  ? activeTab === ActiveTab.SCHEDULED
                    ? 'No scheduled emails in queue'
                    : 'No sent emails recorded yet'
                  : 'No matching email records'}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {baseList.length === 0
                  ? activeTab === ActiveTab.SCHEDULED
                    ? 'Create a campaign with recipient addresses, send delay, and hourly rate limits to populate your dispatch schedule.'
                    : 'Once scheduled jobs reach their release timestamp and complete SMTP delivery, they will appear in this ledger.'
                  : 'Adjust your search query or status filter to view matching dispatches.'}
              </p>
            </div>
            {baseList.length === 0 ? (
              <button
                type="button"
                onClick={onComposeClick}
                className="min-h-10 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap"
              >
                <MailPlus className="w-4 h-4" aria-hidden="true" />
                <span>Compose Emails</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="min-h-9 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          /* High-Density Data Grid */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th scope="col" className="py-3 pl-6 pr-4">
                    Recipient
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Subject
                  </th>
                  <th scope="col" className="py-3 px-4 whitespace-nowrap">
                    {activeTab === ActiveTab.SCHEDULED ? 'Scheduled For' : 'Sent Timestamp'}
                  </th>
                  <th scope="col" className="py-3 px-4 text-right whitespace-nowrap">
                    Rate Policy
                  </th>
                  <th scope="col" className="py-3 px-4 whitespace-nowrap">
                    Status
                  </th>
                  <th scope="col" className="py-3 pl-4 pr-6 text-right whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm bg-white">
                {filteredList.map((item) => {
                  const statusMeta = getStatusPresentation(item.status);
                  const isCancelling = cancellingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onInspectEmail(item)}
                      className="h-11 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 pl-6 pr-4 font-mono text-xs text-slate-900 whitespace-nowrap">
                        {item.recipient}
                      </td>
                      <td className="py-2.5 px-4 max-w-xs">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {item.subject}
                        </p>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {formatTableDateTime(
                          activeTab === ActiveTab.SENT && item.sentAt
                            ? item.sentAt
                            : item.scheduledAt
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-500 tabular-nums text-right whitespace-nowrap">
                        {item.delaySeconds}s · {item.hourlyLimit}/hr
                      </td>
                      <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                        <span className={statusMeta.className}>{statusMeta.label}</span>
                      </td>
                      <td
                        className="py-2.5 pl-4 pr-6 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onInspectEmail(item)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          >
                            Details
                          </button>
                          {activeTab === ActiveTab.SCHEDULED && (
                            <button
                              type="button"
                              onClick={() => onCancelScheduled(item.id)}
                              disabled={isCancelling}
                              aria-label={`Cancel scheduled email to ${item.recipient}`}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            >
                              {isCancelling ? (
                                <Loader2
                                  className="w-3.5 h-3.5 animate-spin text-red-600"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
