import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, MailPlus, Menu, X } from 'lucide-react';
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

  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>(WorkspaceView.QUEUE);
  const [activeTab, setActiveTab] = useState<ActiveTab>(ActiveTab.SCHEDULED);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [scheduledEmails, setScheduledEmails] = useState<EmailRecord[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailRecord[]>([]);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [inspectedEmail, setInspectedEmail] = useState<EmailRecord | null>(null);
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
        err instanceof Error ? err.message : 'Google authentication failed.';
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
      const message = err instanceof Error ? err.message : 'Failed to log out.';
      setQueueError(message);
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const handleScheduleSubmit = async (payload: ScheduleCampaignPayload) => {
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
      setScheduledEmails((prev) => prev.filter((item) => item.id !== id));
      setBannerNotice('Cancelled scheduled email job.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to cancel scheduled email.';
      setQueueError(message);
    } finally {
      setCancellingId(null);
    }
  };

  const handleMockPresetChange = async (preset: 'empty' | 'sample') => {
    await setMockQueuePreset(preset);
    await loadEmailQueues();
    setBannerNotice(
      preset === 'empty'
        ? 'Cleared local preview records to demonstrate empty states.'
        : 'Restored sample scheduled and sent email records.'
    );
  };

  const deliveredCount = useMemo(
    () => sentEmails.filter((e) => e.status === EmailStatus.SENT).length,
    [sentEmails]
  );

  const failedCount = useMemo(
    () => sentEmails.filter((e) => e.status === EmailStatus.FAILED).length,
    [sentEmails]
  );

  const nextReleaseTimestamp = useMemo(() => {
    if (scheduledEmails.length === 0) return undefined;
    return scheduledEmails[0].scheduledAt;
  }, [scheduledEmails]);

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" aria-hidden="true" />
          <span>Verifying session...</span>
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Persistent Desktop & Drawer Mobile Sidebar */}
      <Sidebar
        user={user}
        workspaceView={workspaceView}
        activeTab={activeTab}
        scheduledCount={scheduledEmails.length}
        sentCount={sentEmails.length}
        isLoggingOut={isAuthActionLoading}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onSelectCompose={() => setWorkspaceView(WorkspaceView.COMPOSE)}
        onSelectQueueTab={(tab) => {
          setActiveTab(tab);
          setWorkspaceView(WorkspaceView.QUEUE);
        }}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* SaaS Top Bar: Contextual Breadcrumb Left + Single Primary Action Right */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-8 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
              <button
                type="button"
                onClick={() => setWorkspaceView(WorkspaceView.QUEUE)}
                className="text-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
              >
                Workspace
              </button>
              <span aria-hidden="true" className="text-slate-300">
                /
              </span>
              <span className="font-semibold text-slate-900 truncate">
                {currentSectionLabel}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {workspaceView === WorkspaceView.COMPOSE ? (
              <button
                type="button"
                onClick={() => setWorkspaceView(WorkspaceView.QUEUE)}
                className="min-h-10 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Back to Queue</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setWorkspaceView(WorkspaceView.COMPOSE)}
                className="min-h-10 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                <MailPlus className="w-4 h-4" aria-hidden="true" />
                <span>Compose Emails</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Viewport Container */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-6">
          {/* Mock Mode Transparency Notice */}
          {IS_MOCK_MODE && (
            <div className="px-4 py-2.5 rounded-lg bg-slate-100 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span>
                Local preview mode enabled. Connect your Express + BullMQ backend by
                setting <code className="font-mono text-slate-800">VITE_USE_MOCK_API=false</code>.
              </span>
              <span className="font-mono text-slate-500">
                Account: {user.email}
              </span>
            </div>
          )}

          {/* Dismissible Action Feedback Notice */}
          {bannerNotice && (
            <div
              role="status"
              className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-sm text-emerald-900"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2
                  className="w-4 h-4 text-emerald-700 shrink-0"
                  aria-hidden="true"
                />
                <span>{bannerNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setBannerNotice(null)}
                aria-label="Dismiss notification"
                className="p-1 text-emerald-700 hover:text-emerald-950 rounded"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Structured 4-Column Metric Strip */}
          <section
            aria-label="Queue summary metrics"
            className="bg-white border border-slate-200 rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 sm:divide-x divide-slate-200"
          >
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500">Scheduled Queue</p>
              <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
                {scheduledEmails.length}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500">Next Dispatch</p>
              <p className="mt-1.5 text-lg font-bold font-mono tabular-nums text-slate-900 truncate">
                {formatShortTime(nextReleaseTimestamp)}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500">Delivered Total</p>
              <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
                {deliveredCount}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500">Failed Dispatches</p>
              <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
                {failedCount}
              </p>
            </div>
          </section>

          {/* Primary Workspace Body */}
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
        </main>
      </div>

      {/* Email Record Inspection Modal */}
      <EmailDetailModal
        email={inspectedEmail}
        cancellingId={cancellingId}
        onClose={() => setInspectedEmail(null)}
        onCancelScheduled={handleCancelScheduled}
      />
    </div>
  );
}
