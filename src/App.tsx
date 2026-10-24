
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MailPlus,
  Menu,
  X,
  CalendarClock,
  Send,
  AlertTriangle,
  Clock3,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

import { ComposeEmailForm } from './components/ComposeEmailForm';
import { EmailDetailModal } from './components/EmailDetailModal';
import { EmailQueueTable } from './components/EmailQueueTable';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';

import {
  cancelScheduledEmail,
  captureOAuthTokenFromUrl,
  fetchCurrentUser,
  fetchScheduledEmails,
  fetchSentEmails,
  initiateGoogleOAuth,
  IS_MOCK_MODE,
  logoutCurrentUser,
  scheduleEmailBatch,
  setMockQueuePreset,
} from './services/api';

import {
  ActiveTab,
  EmailRecord,
  EmailStatus,
  ScheduleCampaignPayload,
  UserProfile,
  WorkspaceView,
} from './types/email';

function formatShortTime(iso?: string): string {
  if (!iso) return '—';

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthActionLoading, setIsAuthActionLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>(
    WorkspaceView.QUEUE
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    ActiveTab.SCHEDULED
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [scheduledEmails, setScheduledEmails] = useState<EmailRecord[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailRecord[]>([]);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [inspectedEmail, setInspectedEmail] = useState<EmailRecord | null>(
    null
  );
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const loadEmailQueues = useCallback(async () => {
    setIsQueueLoading(true);
    setQueueError(null);

    try {
      const [scheduled, sent] = await Promise.all([
        fetchScheduledEmails(),
        fetchSentEmails(),
      ]);

      setScheduledEmails(scheduled);
      setSentEmails(sent);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to fetch email queues from the server.';

      setQueueError(message);
    } finally {
      setIsQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      captureOAuthTokenFromUrl();

      try {
        const activeUser = await fetchCurrentUser();

        if (isMounted) {
          setUser(activeUser);
        }
      } catch (err) {
        if (isMounted) {
          const message =
            err instanceof Error
              ? err.message
              : 'Could not verify existing authentication session.';

          setAuthError(message);
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    };

    bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadEmailQueues();
    }
  }, [user, loadEmailQueues]);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setIsAuthActionLoading(true);

    try {
      const authenticatedUser = await initiateGoogleOAuth();

      if (authenticatedUser) {
        setUser(authenticatedUser);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Google authentication failed.';

      setAuthError(message);
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsAuthActionLoading(true);

    try {
      await logoutCurrentUser();

      setUser(null);
      setScheduledEmails([]);
      setSentEmails([]);
      setWorkspaceView(WorkspaceView.QUEUE);
      setActiveTab(ActiveTab.SCHEDULED);
      setBannerNotice(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to log out.';

      setQueueError(message);
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const handleScheduleSubmit = async (
    payload: ScheduleCampaignPayload
  ) => {
    const response = await scheduleEmailBatch(payload);

    await loadEmailQueues();

    setBannerNotice(
      `Scheduled ${response.scheduledCount} ${
        response.scheduledCount === 1 ? 'email' : 'emails'
      } into the dispatch queue.`
    );

    return { scheduledCount: response.scheduledCount };
  };

  const handleCancelScheduled = async (id: string) => {
    setCancellingId(id);

    try {
      await cancelScheduledEmail(id);

      setScheduledEmails((prev) =>
        prev.filter((item) => item.id !== id)
      );

      setBannerNotice('Cancelled scheduled email job.');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to cancel scheduled email.';

      setQueueError(message);
    } finally {
      setCancellingId(null);
    }
  };

  const handleMockPresetChange = async (
    preset: 'empty' | 'sample'
  ) => {
    try {
      await setMockQueuePreset(preset);
      await loadEmailQueues();

      setBannerNotice(
        preset === 'empty'
          ? 'Cleared local preview records to demonstrate empty states.'
          : 'Restored sample scheduled and sent email records.'
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to update preview records.';

      setQueueError(message);
    }
  };

  const deliveredCount = useMemo(
    () =>
      sentEmails.filter((email) => email.status === EmailStatus.SENT)
        .length,
    [sentEmails]
  );

  const failedCount = useMemo(
    () =>
      sentEmails.filter((email) => email.status === EmailStatus.FAILED)
        .length,
    [sentEmails]
  );

  const nextReleaseTimestamp = useMemo(() => {
    if (scheduledEmails.length === 0) return undefined;

    return scheduledEmails[0].scheduledAt;
  }, [scheduledEmails]);

  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
          <Loader2
            className="h-5 w-5 animate-spin text-blue-600"
            aria-hidden="true"
          />
          <span>Verifying your session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        onGoogleLogin={handleGoogleLogin}
        isLoading={isAuthActionLoading}
        error={authError}
      />
    );
  }

  const currentSectionLabel =
    workspaceView === WorkspaceView.COMPOSE
      ? 'Compose Campaign'
      : activeTab === ActiveTab.SCHEDULED
        ? 'Scheduled Emails'
        : 'Sent Emails';

  return (
    <div className="flex min-h-screen bg-[#f6f8fc] text-slate-900">
      <Sidebar
        user={user}
        workspaceView={workspaceView}
        activeTab={activeTab}
        scheduledCount={scheduledEmails.length}
        sentCount={sentEmails.length}
        isLoggingOut={isAuthActionLoading}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onSelectCompose={() => {
          setWorkspaceView(WorkspaceView.COMPOSE);
          setIsMobileSidebarOpen(false);
        }}
        onSelectQueueTab={(tab) => {
          setActiveTab(tab);
          setWorkspaceView(WorkspaceView.QUEUE);
          setIsMobileSidebarOpen(false);
        }}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            <nav
              aria-label="Breadcrumb"
              className="flex min-w-0 items-center gap-2 text-sm"
            >
              <span className="hidden text-slate-400 sm:inline">
                Workspace
              </span>
              <span
                aria-hidden="true"
                className="hidden text-slate-300 sm:inline"
              >
                /
              </span>
              <span className="truncate font-semibold text-slate-800">
                {currentSectionLabel}
              </span>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {workspaceView === WorkspaceView.COMPOSE ? (
              <button
                type="button"
                onClick={() => setWorkspaceView(WorkspaceView.QUEUE)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-4"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Back to Queue</span>
                <span className="sm:hidden">Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setWorkspaceView(WorkspaceView.COMPOSE)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:px-4"
              >
                <MailPlus className="h-4 w-4" aria-hidden="true" />
                <span>Compose Emails</span>
              </button>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-7 px-4 py-7 sm:px-8 sm:py-9">
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Email workspace
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {workspaceView === WorkspaceView.COMPOSE
                  ? 'Create a campaign'
                  : 'Email dashboard'}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                {workspaceView === WorkspaceView.COMPOSE
                  ? 'Prepare your message and choose when it should be scheduled.'
                  : 'Manage your scheduled emails and keep track of your dispatch queue.'}
              </p>
            </div>

            <button
              type="button"
              onClick={loadEmailQueues}
              disabled={isQueueLoading}
              className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
            >
              <RefreshCw
                className={`h-4 w-4 ${isQueueLoading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              Refresh data
            </button>
          </section>

          {IS_MOCK_MODE && (
            <div className="flex flex-col justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center">
              <div>
                <p className="font-semibold">Preview mode is enabled</p>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  Connect your backend by setting{' '}
                  <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono">
                    VITE_USE_MOCK_API=false
                  </code>{' '}
                  in your frontend environment.
                </p>
              </div>

              <span className="break-all text-xs text-amber-800">
                {user.email}
              </span>
            </div>
          )}

          {bannerNotice && (
            <div
              role="status"
              className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-900"
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
                <span>{bannerNotice}</span>
              </div>

              <button
                type="button"
                onClick={() => setBannerNotice(null)}
                aria-label="Dismiss notification"
                className="rounded-lg p-1 text-emerald-700 transition hover:bg-emerald-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {queueError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-800"
            >
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-rose-600"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Unable to update your email queue</p>
                <p className="mt-1 break-words">{queueError}</p>
              </div>
              <button
                type="button"
                onClick={() => setQueueError(null)}
                aria-label="Dismiss error"
                className="rounded-lg p-1 hover:bg-rose-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          <section
            aria-label="Queue summary metrics"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <div className="group rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">
                  Scheduled Emails
                </p>
                <div className="rounded-xl bg-blue-50 p-3 transition group-hover:bg-blue-100">
                  <CalendarClock className="h-5 w-5 text-blue-600" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                {scheduledEmails.length}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Emails waiting to be dispatched
              </p>
            </div>

            <div className="group rounded-2xl border border-violet-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">
                  Next Dispatch
                </p>
                <div className="rounded-xl bg-violet-50 p-3 transition group-hover:bg-violet-100">
                  <Clock3 className="h-5 w-5 text-violet-600" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-4 text-xl font-bold tracking-tight text-slate-950">
                {formatShortTime(nextReleaseTimestamp)}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Next scheduled send time
              </p>
            </div>

            <div className="group rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">
                  Delivered
                </p>
                <div className="rounded-xl bg-emerald-50 p-3 transition group-hover:bg-emerald-100">
                  <Send className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                {deliveredCount}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Emails marked as sent
              </p>
            </div>

            <div className="group rounded-2xl border border-rose-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">
                  Failed
                </p>
                <div className="rounded-xl bg-rose-50 p-3 transition group-hover:bg-rose-100">
                  <AlertTriangle className="h-5 w-5 text-rose-600" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                {failedCount}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Emails that need attention
              </p>
            </div>
          </section>

          <section className="min-w-0 rounded-2xl">
            {workspaceView === WorkspaceView.COMPOSE ? (
              <ComposeEmailForm
                senderEmail={user.email}
                onScheduleSubmit={handleScheduleSubmit}
                onNavigateToScheduled={() => {
                  setActiveTab(ActiveTab.SCHEDULED);
                  setWorkspaceView(WorkspaceView.QUEUE);
                }}
              />
            ) : (
              <EmailQueueTable
                activeTab={activeTab}
                scheduledEmails={scheduledEmails}
                sentEmails={sentEmails}
                isLoading={isQueueLoading}
                error={queueError}
                cancellingId={cancellingId}
                onTabChange={setActiveTab}
                onRefresh={loadEmailQueues}
                onCancelScheduled={handleCancelScheduled}
                onInspectEmail={setInspectedEmail}
                onComposeClick={() => setWorkspaceView(WorkspaceView.COMPOSE)}
                onMockPresetChange={handleMockPresetChange}
              />
            )}
          </section>

          <footer className="flex flex-col justify-between gap-2 border-t border-slate-200/80 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center">
            <p>ReachInbox · Email scheduling workspace</p>
            <p>Organize your outreach, one email at a time.</p>
          </footer>
        </main>
      </div>

      <EmailDetailModal
        email={inspectedEmail}
        cancellingId={cancellingId}
        onClose={() => setInspectedEmail(null)}
        onCancelScheduled={handleCancelScheduled}
      />
    </div>
  );
}
