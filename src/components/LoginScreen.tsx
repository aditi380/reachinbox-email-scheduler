import React from 'react';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { API_BASE_URL, AUTH_ENDPOINTS, IS_MOCK_MODE } from '../services/api';

interface LoginScreenProps {
  onGoogleLogin: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onGoogleLogin,
  isLoading,
  error,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar following strict 3-zone contract */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            ReachInbox
          </a>

          <nav
            aria-label="Product overview"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <a
              href="#capabilities"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Capabilities
            </a>
            <a
              href="#rate-control"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Rate Control
            </a>
            <a
              href="#recipient-parsing"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              CSV Parsing
            </a>
            <a
              href="#api-contract"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              API Contract
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onGoogleLogin}
              disabled={isLoading}
              className="px-4 py-2 min-h-10 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Split */}
      <main
        id="top"
        className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start"
      >
        {/* Left Editorial Overview */}
        <section className="lg:col-span-7 space-y-8">
          <div className="space-y-4">
            <p className="text-xs font-medium text-slate-500">
              Outbound Campaign Infrastructure · BullMQ &amp; SMTP Ready
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight [text-wrap:balance]">
              Outbound email scheduling with deterministic rate control.
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
              Upload recipient lists via CSV or plain text, configure inter-message
              delays and rolling hourly quotas, and monitor scheduled and delivered
              dispatches from a unified workspace.
            </p>
          </div>

          <div
            id="capabilities"
            className="border-t border-b border-slate-200 divide-y divide-slate-200"
          >
            <div id="recipient-parsing" className="py-5">
              <h2 className="text-base font-semibold text-slate-900">
                01. Bulk CSV &amp; Text Recipient Parsing
              </h2>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                Paste comma- or newline-delimited addresses or upload structured CSV
                files. Automatic RFC syntax validation deduplicates entries and
                isolates malformed addresses before scheduling.
              </p>
            </div>

            <div id="rate-control" className="py-5">
              <h2 className="text-base font-semibold text-slate-900">
                02. Per-Email Pacing &amp; Rolling Hourly Quotas
              </h2>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                Define exact second-level intervals between consecutive sends alongside
                strict hourly maximums. Excess recipients automatically roll into the
                next available hourly window.
              </p>
            </div>

            <div id="api-contract" className="py-5">
              <h2 className="text-base font-semibold text-slate-900">
                03. Backend-Ready Authentication &amp; Queue Hooks
              </h2>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                Pre-wired service endpoints for Google OAuth 2.0 session verification,
                delayed job creation, and delivery ledger synchronization at{' '}
                <code className="font-mono text-xs text-slate-800">{API_BASE_URL}</code>.
              </p>
            </div>
          </div>
        </section>

        {/* Right Authentication Surface */}
        <section className="lg:col-span-5 w-full">
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Sign in to ReachInbox
              </h2>
              <p className="text-sm text-slate-600">
                Authenticate with your Google account to manage scheduled campaigns
                and review delivery history.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-800"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <button
                type="button"
                onClick={onGoogleLogin}
                disabled={isLoading}
                className="w-full min-h-11 px-4 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-900 font-semibold text-sm border border-slate-300 rounded-lg transition-colors flex items-center justify-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-600" aria-hidden="true" />
                    <span>Connecting session...</span>
                  </>
                ) : (
                  <>
                    {/* Standard Google 4-color mark */}
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.49 12.275c0-.85-.075-1.675-.215-2.475H12v4.69h6.45c-.28 1.49-1.125 2.755-2.395 3.605v2.995h3.875c2.265-2.085 3.56-5.16 3.56-8.815z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.955-1.075 7.94-2.91l-3.875-2.995c-1.075.72-2.45 1.15-4.065 1.15-3.125 0-5.77-2.11-6.715-4.945H1.28v3.09C3.255 21.31 7.31 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.285 14.3c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3V6.61H1.28C.465 8.23 0 10.06 0 12s.465 3.77 1.28 5.39l4.005-3.09z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.76 0 3.34.605 4.585 1.795l3.435-3.435C17.95 1.185 15.235 0 12 0 7.31 0 3.255 2.69 1.28 6.61l4.005 3.09c.945-2.835 3.59-4.95 6.715-4.95z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>

            <div className="pt-5 border-t border-slate-200 space-y-2 text-xs text-slate-500">
              {IS_MOCK_MODE ? (
                <>
                  <p className="font-medium text-slate-700">
                    Frontend Preview Mode Active
                  </p>
                  <p className="leading-relaxed">
                    Real Google OAuth is wired to{' '}
                    <code className="font-mono text-slate-700">
                      {AUTH_ENDPOINTS.googleLogin}
                    </code>
                    . Set <code className="font-mono text-slate-700">VITE_USE_MOCK_API=false</code>{' '}
                    in <code className="font-mono text-slate-700">.env</code> once your
                    Express backend is running. Clicking above opens a local preview
                    session.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-slate-700">
                    Live Backend OAuth Mode
                  </p>
                  <p className="leading-relaxed">
                    Redirects directly to{' '}
                    <code className="font-mono text-slate-700">
                      {AUTH_ENDPOINTS.googleLogin}
                    </code>{' '}
                    for Google OAuth 2.0 consent and session creation.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>ReachInbox Email Scheduler</span>
          <span>React · TypeScript · Tailwind CSS</span>
        </div>
      </footer>
    </div>
  );
};
