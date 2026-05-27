'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * GlobalErrorBoundary — wraps the entire app.
 * Catches runtime errors in the React tree and shows a graceful fallback
 * instead of a blank white screen.  Pairs with the layout.tsx wrapper.
 */
export class GlobalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Non-blocking: log to console (replace with Sentry/Vercel Logs in prod)
    console.error('[IWILLTRAVEL] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0f] px-6 text-center">
          <div className="max-w-md">
            <div className="mb-6 text-6xl">✈️</div>
            <h1 className="mb-3 text-2xl font-bold text-white">
              Something went off-course
            </h1>
            <p className="mb-8 text-sm text-white/60">
              Our agents hit an unexpected turbulence. Don&apos;t worry — your
              itinerary data is safe. Try refreshing the page.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              Reload App
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="mt-6 max-h-40 overflow-auto rounded-lg bg-white/5 p-4 text-left text-xs text-red-400">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
