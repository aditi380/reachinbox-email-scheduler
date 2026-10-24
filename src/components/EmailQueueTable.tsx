
import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MailPlus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X,
  XCircle,
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

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function getStatusPresentation(status: EmailStatus): {
  label: string;
  className: string;
  icon: React.ReactNode;
} {
  switch (status) {
    case EmailStatus.SCHEDULED:
      return {
        label: 'Scheduled',
        className: 'bg-blue-50 text-blue-700 ring-blue-600/20',
        icon: <Clock3 className="h-3.5 w-3.5" />,
      };

    case EmailStatus.RATE_LIMITED:
      return {
        label: 'Next Hour',
        className: 'bg-amber-50 text-amber-700 ring-amber-600/20',
        icon: <Clock3 className="h-3.5 w-3.5" />,
      };

    case EmailStatus.SENT:
      return {
        label: 'Delivered',
        className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      };

    case EmailStatus.FAILED:
      return {
        label: 'Failed',
        className: 'bg-red-50 text-red-700 ring-red-600/20',
        icon: <XCircle className="h-3.5 w-3.5" />,
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

  const baseList =
    activeTab === ActiveTab.SCHEDULED ? scheduledEmails : sentEmails;

  const filteredList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return baseList.filter((record) => {
      const matchesStatus =
        statusFilter === 'ALL' || record.status === statusFilter;

      const matchesSearch =
        !query ||
        record.recipient.toLowerCase().includes(query) ||
        record.subject.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [baseList, searchQuery, statusFilter]);

  const totalRecordsCount = scheduledEmails.length + sentEmails.length;

  const handleSwitchTab = (tab: ActiveTab) => {
    setStatusFilter('ALL');
    onTabChange(tab);
  };

  const handleRefresh = () => {
    void onRefresh();
  };

  const handleCancel = (id: string) => {
    void onCancelScheduled(id);
  };

  const handlePresetChange = () => {
    if (!onMockPresetChange) return;

    void onMockPresetChange(totalRecordsCount > 0 ? 'empty' : 'sample');
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              {activeTab === ActiveTab.SCHEDULED ? (
                <Clock3 className="h-5 w-5" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Email Activity
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Manage and track your email campaigns
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {IS_MOCK_MODE && onMockPresetChange && (
            <button
              type="button"
              onClick={handlePresetChange}
              className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {totalRecordsCount > 0 ? 'Test Empty State' : 'Load Sample Data'}
            </button>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200 px-5 sm:px-6">
        <button
          type="button"
          role="tab"
          id="tab-scheduled"
          aria-selected={activeTab === ActiveTab.SCHEDULED}
          aria-controls="panel-email-queue"
          onClick={() => handleSwitchTab(ActiveTab.SCHEDULED)}
          className={`relative flex items-center gap-2 py-4 text-sm font-semibold transition ${
            activeTab === ActiveTab.SCHEDULED
              ? 'text-blue-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock3 className="h-4 w-4" />
          Scheduled
          <span
            className={`rounded-md px-2 py-0.5 text-xs ${
              activeTab === ActiveTab.SCHEDULED
                ? 'bg-blue-50 text-blue-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {scheduledEmails.length}
          </span>

          {activeTab === ActiveTab.SCHEDULED && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-blue-600" />
          )}
        </button>

        <button
          type="button"
          role="tab"
          id="tab-sent"
          aria-selected={activeTab === ActiveTab.SENT}
          aria-controls="panel-email-queue"
          onClick={() => handleSwitchTab(ActiveTab.SENT)}
          className={`relative flex items-center gap-2 py-4 text-sm font-semibold transition ${
            activeTab === ActiveTab.SENT
              ? 'text-blue-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Send className="h-4 w-4" />
          Sent
          <span
            className={`rounded-md px-2 py-0.5 text-xs ${
              activeTab === ActiveTab.SENT
                ? 'bg-blue-50 text-blue-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {sentEmails.length}
          </span>

          {activeTab === ActiveTab.SENT && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-blue-600" />
          )}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 bg-slate-50/70 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="Search emails by recipient or subject"
            placeholder="Search emails..."
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div
          role="group"
          aria-label="Filter emails by status"
          className="flex flex-wrap items-center gap-1.5"
        >
          <span className="mr-1 text-xs font-medium text-slate-500">
            Status:
          </span>

          {(
            [
              { label: 'All', value: 'ALL' },
              ...(activeTab === ActiveTab.SCHEDULED
                ? [
                    { label: 'Scheduled', value: EmailStatus.SCHEDULED },
                    { label: 'Next Hour', value: EmailStatus.RATE_LIMITED },
                  ]
                : [
                    { label: 'Delivered', value: EmailStatus.SENT },
                    { label: 'Failed', value: EmailStatus.FAILED },
                  ]),
            ] as { label: string; value: StatusFilter }[]
          ).map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              aria-pressed={statusFilter === filter.value}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                statusFilter === filter.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div
        id="panel-email-queue"
        role="tabpanel"
        aria-labelledby={
          activeTab === ActiveTab.SCHEDULED ? 'tab-scheduled' : 'tab-sent'
        }
      >
        {/* Error */}
        {error && (
          <div
            role="alert"
            className="m-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:m-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-800">
                  Unable to load email activity
                </p>
                <p className="mt-1 break-words text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </button>
          </div>
        )}

        {/* Loading */}
        {isLoading && !error ? (
          <div
            aria-busy="true"
            aria-label="Loading email records"
            className="space-y-0 divide-y divide-slate-100"
          >
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex animate-pulse items-center gap-4 px-5 py-5 sm:px-6"
              >
                <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-40 max-w-full rounded bg-slate-200" />
                  <div className="h-3 w-28 max-w-full rounded bg-slate-100" />
                </div>
                <div className="hidden h-6 w-20 rounded-full bg-slate-100 sm:block" />
                <div className="hidden h-4 w-28 rounded bg-slate-100 md:block" />
              </div>
            ))}
          </div>
        ) : !error && filteredList.length === 0 ? (
          /* Empty State */
          <div className="px-5 py-16 text-center sm:px-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              {baseList.length === 0 ? (
                <Mail className="h-7 w-7" />
              ) : (
                <Search className="h-7 w-7" />
              )}
            </div>

            <h3 className="mt-5 text-base font-bold text-slate-900">
              {baseList.length === 0
                ? activeTab === ActiveTab.SCHEDULED
                  ? 'No scheduled emails yet'
                  : 'No sent emails yet'
                : 'No matching emails'}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {baseList.length === 0
                ? activeTab === ActiveTab.SCHEDULED
                  ? 'Your scheduled campaigns will appear here. Create a campaign to start organizing your email delivery.'
                  : 'When email jobs finish processing, their records will appear here.'
                : 'Try another search term or change the status filter to find your emails.'}
            </p>

            {baseList.length === 0 ? (
              <button
                type="button"
                onClick={onComposeClick}
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              >
                <MailPlus className="h-4 w-4" />
                Create Campaign
              </button>
            ) : (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : !error ? (
          /* Email Table */
          <div className="overflow-x-auto">
            <table className="min-w-[850px] w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-white">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Recipient
                  </th>
                  <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Subject
                  </th>
                  <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {activeTab === ActiveTab.SCHEDULED
                      ? 'Scheduled For'
                      : 'Sent At'}
                  </th>
                  <th className="px-4 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Rate Policy
                  </th>
                  <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item) => {
                  const statusMeta = getStatusPresentation(item.status);
                  const isCancelling = cancellingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onInspectEmail(item)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          onInspectEmail(item);
                        }
                      }}
                      tabIndex={0}
                      className="group cursor-pointer transition-colors hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-blue-100 group-hover:text-blue-700">
                            <Mail className="h-4 w-4" />
                          </div>
                          <span className="max-w-[190px] truncate text-sm font-medium text-slate-800">
                            {item.recipient}
                          </span>
                        </div>
                      </td>

                      <td className="max-w-[240px] px-4 py-4">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {item.subject || '(No subject)'}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Email campaign
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                        {formatTableDateTime(
                          activeTab === ActiveTab.SENT && item.sentAt
                            ? item.sentAt
                            : item.scheduledAt
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                          {item.delaySeconds}s
                          <span className="mx-1 text-slate-300">·</span>
                          {item.hourlyLimit}/hr
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-semibold ring-1 ring-inset ${statusMeta.className}`}
                        >
                          {statusMeta.icon}
                          {statusMeta.label}
                        </span>
                      </td>

                      <td
                        className="whitespace-nowrap px-6 py-4 text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onInspectEmail(item)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            Details
                          </button>

                          {activeTab === ActiveTab.SCHEDULED && (
                            <button
                              type="button"
                              onClick={() => handleCancel(item.id)}
                              disabled={isCancelling}
                              aria-label={`Cancel scheduled email to ${item.recipient}`}
                              title="Cancel scheduled email"
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isCancelling ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
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
        ) : null}

        {/* Footer */}
        {!isLoading && !error && filteredList.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs text-slate-500">
              Showing{' '}
              <span className="font-semibold text-slate-700">
                {filteredList.length}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-slate-700">
                {baseList.length}
              </span>{' '}
              emails
            </p>

            <p className="text-xs text-slate-400">
              {activeTab === ActiveTab.SCHEDULED
                ? 'Scheduled email queue'
                : 'Email activity history'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
