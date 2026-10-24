
import React, { useEffect, useState } from 'react';
import {
  CalendarClock,
  ChevronRight,
  Clock,
  LogOut,
  Mail,
  MailPlus,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { ActiveTab, UserProfile, WorkspaceView } from '../types/email';

interface SidebarProps {
  user: UserProfile;
  workspaceView: WorkspaceView;
  activeTab: ActiveTab;
  scheduledCount: number;
  sentCount: number;
  isLoggingOut: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onSelectCompose: () => void;
  onSelectQueueTab: (tab: ActiveTab) => void;
  onLogout: () => Promise<void>;
}

function getInitials(name?: string): string {
  const safeName = name || 'ReachInbox User';
  const parts = safeName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  workspaceView,
  activeTab,
  scheduledCount,
  sentCount,
  isLoggingOut,
  isMobileOpen,
  onCloseMobile,
  onSelectCompose,
  onSelectQueueTab,
  onLogout,
}) => {
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user.avatarUrl]);

  useEffect(() => {
    if (!isMobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseMobile();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  const showAvatarImage = Boolean(user.avatarUrl) && !avatarLoadFailed;

  const isScheduledActive =
    workspaceView === WorkspaceView.QUEUE &&
    activeTab === ActiveTab.SCHEDULED;

  const isSentActive =
    workspaceView === WorkspaceView.QUEUE &&
    activeTab === ActiveTab.SENT;

  const isComposeActive = workspaceView === WorkspaceView.COMPOSE;

  const navItemClass = (active: boolean) =>
    `group flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
      active
        ? 'bg-blue-50 font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
    }`;

  const iconClass = (active: boolean) =>
    `h-[18px] w-[18px] shrink-0 transition-colors ${
      active
        ? 'text-blue-600'
        : 'text-slate-400 group-hover:text-slate-600'
    }`;

  const sidebarContent = (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white">
      {/* Brand */}
      <div className="flex h-[72px] items-center justify-between border-b border-slate-100 px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20">
            <Mail className="h-5 w-5" aria-hidden="true" />
          </div>

          <div>
            <p className="text-[17px] font-extrabold tracking-tight text-slate-950">
              ReachInbox
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Email workspace
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:hidden"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Compose Button */}
      <div className="px-4 pb-5 pt-5">
        <button
          type="button"
          onClick={() => {
            onSelectCompose();
            onCloseMobile();
          }}
          className="group flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition duration-200 hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <MailPlus className="h-[18px] w-[18px]" aria-hidden="true" />
          Compose email
          <Sparkles
            className="ml-auto h-4 w-4 text-blue-100 transition group-hover:rotate-12"
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Navigation */}
      <nav
        aria-label="Email scheduler navigation"
        className="flex-1 space-y-6 overflow-y-auto px-3"
      >
        <div>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Workspace
          </p>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                onSelectQueueTab(ActiveTab.SCHEDULED);
                onCloseMobile();
              }}
              aria-current={isScheduledActive ? 'page' : undefined}
              className={navItemClass(isScheduledActive)}
            >
              <span className="flex min-w-0 items-center gap-3">
                <CalendarClock
                  className={iconClass(isScheduledActive)}
                  aria-hidden="true"
                />
                <span>Scheduled emails</span>
              </span>

              <span
                className={`min-w-7 rounded-lg px-2 py-1 text-center text-xs font-bold tabular-nums ${
                  isScheduledActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                }`}
              >
                {scheduledCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectQueueTab(ActiveTab.SENT);
                onCloseMobile();
              }}
              aria-current={isSentActive ? 'page' : undefined}
              className={navItemClass(isSentActive)}
            >
              <span className="flex min-w-0 items-center gap-3">
                <Send
                  className={iconClass(isSentActive)}
                  aria-hidden="true"
                />
                <span>Sent emails</span>
              </span>

              <span
                className={`min-w-7 rounded-lg px-2 py-1 text-center text-xs font-bold tabular-nums ${
                  isSentActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                }`}
              >
                {sentCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectCompose();
                onCloseMobile();
              }}
              aria-current={isComposeActive ? 'page' : undefined}
              className={navItemClass(isComposeActive)}
            >
              <span className="flex min-w-0 items-center gap-3">
                <MailPlus
                  className={iconClass(isComposeActive)}
                  aria-hidden="true"
                />
                <span>New campaign</span>
              </span>

              <ChevronRight
                className={`h-4 w-4 ${
                  isComposeActive ? 'text-blue-500' : 'text-slate-300'
                }`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {/* Queue information */}
        <div>
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Queue overview
          </p>

          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-white p-2 shadow-sm">
                <Clock className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              </div>
              <p className="text-xs font-semibold text-slate-700">
                Email activity
              </p>
            </div>

            <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">
              {scheduledCount + sentCount}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Scheduled and sent records in your workspace.
            </p>
          </div>
        </div>
      </nav>

      {/* Account */}
      <div className="mt-5 border-t border-slate-100 p-4">
        <p className="mb-3 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Account
        </p>

        <div className="flex min-w-0 items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50">
          {showAvatarImage ? (
            <img
              src={user.avatarUrl}
              alt={`${user.name || 'User'} profile avatar`}
              referrerPolicy="no-referrer"
              onError={() => setAvatarLoadFailed(true)}
              className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 text-sm font-bold text-white shadow-sm"
            >
              {getInitials(user.name)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p
              title={user.name || 'ReachInbox User'}
              className="truncate text-sm font-semibold text-slate-900"
            >
              {user.name || 'ReachInbox User'}
            </p>
            <p
              title={user.email}
              className="mt-0.5 truncate text-xs text-slate-500"
            >
              {user.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void onLogout()}
          disabled={isLoggingOut}
          className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>{isLoggingOut ? 'Signing out...' : 'Log out'}</span>
        </button>

        <p className="mt-4 text-center text-[10px] text-slate-400">
          ReachInbox · Email scheduler
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden shrink-0 lg:block">{sidebarContent}</aside>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-0 z-40 flex lg:hidden"
        >
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={onCloseMobile}
            className="fixed inset-0 cursor-default bg-slate-950/40 backdrop-blur-[2px]"
          />

          <div className="relative z-10 flex h-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
