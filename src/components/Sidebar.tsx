import React, { useEffect, useState } from 'react';
import { Clock, LogOut, MailPlus, Send, X } from 'lucide-react';
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

  const parts = safeName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return 'U';

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

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
      if (event.key === 'Escape') {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  const showAvatarImage = Boolean(user.avatarUrl) && !avatarLoadFailed;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64 shrink-0">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
        <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
          ReachInbox
        </span>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-2 -mr-2 text-slate-500 hover:text-slate-900 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Primary Compose Action */}
      <div className="p-4">
        <button
          type="button"
          onClick={() => {
            onSelectCompose();
            onCloseMobile();
          }}
          className="w-full min-h-10 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 whitespace-nowrap"
        >
          <MailPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Compose Emails</span>
        </button>
      </div>

      {/* Workspace Navigation */}
      <nav aria-label="Email scheduler navigation" className="flex-1 px-3 py-2 space-y-1">
        <button
          type="button"
          onClick={() => {
            onSelectQueueTab(ActiveTab.SCHEDULED);
            onCloseMobile();
          }}
          className={`w-full min-h-10 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
            workspaceView === WorkspaceView.QUEUE && activeTab === ActiveTab.SCHEDULED
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2.5 whitespace-nowrap">
            <Clock className="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true" />
            <span>Scheduled Emails</span>
          </span>
          <span className="font-mono text-xs tabular-nums text-slate-500">
            {scheduledCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectQueueTab(ActiveTab.SENT);
            onCloseMobile();
          }}
          className={`w-full min-h-10 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
            workspaceView === WorkspaceView.QUEUE && activeTab === ActiveTab.SENT
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2.5 whitespace-nowrap">
            <Send className="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true" />
            <span>Sent Emails</span>
          </span>
          <span className="font-mono text-xs tabular-nums text-slate-500">
            {sentCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectCompose();
            onCloseMobile();
          }}
          className={`w-full min-h-10 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
            workspaceView === WorkspaceView.COMPOSE
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2.5 whitespace-nowrap">
            <MailPlus className="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true" />
            <span>New Campaign</span>
          </span>
        </button>
      </nav>

      {/* User Profile Area with Name, Email, Avatar Placeholder, and Logout Button */}
      <div className="p-4 border-t border-slate-200 space-y-3">
        <div className="flex items-center gap-3 min-w-0">
          {showAvatarImage ? (
            <img
              src={user.avatarUrl}
              alt={`${user.name} profile avatar`}
              referrerPolicy="no-referrer"
              onError={() => setAvatarLoadFailed(true)}
              className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div
              aria-hidden="true"
              className="w-10 h-10 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center shrink-0 select-none"
            >
              {getInitials(user?.name)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p
              title={user?.name || 'ReachInbox User'}
              className="text-sm font-semibold text-slate-900 truncate"
            >
              {user?.name || 'ReachInbox User'}
            </p>
            <p
              title={user.email}
              className="text-xs text-slate-500 truncate"
            >
              {user.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className="w-full min-h-10 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-60 whitespace-nowrap"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{isLoggingOut ? 'Signing out...' : 'Log out'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block shrink-0">{sidebarContent}</aside>

      {/* Mobile Slide-Over Sidebar */}
      {isMobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-0 z-40 lg:hidden flex"
        >
          <div
            onClick={onCloseMobile}
            aria-hidden="true"
            className="fixed inset-0 bg-slate-900/40"
          />
          <div className="relative z-10 flex h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
