'use client';

import { useState } from 'react';

interface DisruptionAlert {
  id: string;
  flight_iata: string;
  status: string;
  delay_minutes: number;
  severity: 'low' | 'medium' | 'high';
  ai_proposal: string;
  alternative_options: string[] | null;
  created_at: string;
}

interface Props {
  alert: DisruptionAlert;
  onResolve: (alertId: string, action: 'approved' | 'declined') => void;
}

const SEVERITY_STYLES = {
  low:    { bar: 'bg-yellow-400', badge: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20', icon: '⚠️' },
  medium: { bar: 'bg-orange-400', badge: 'bg-orange-400/10 text-orange-400 border-orange-400/20', icon: '🚧' },
  high:   { bar: 'bg-red-500',    badge: 'bg-red-500/10 text-red-400 border-red-500/20',          icon: '🚨' },
};

/**
 * DisruptionAlertCard — HITL (Human-in-the-Loop) notification card.
 * Shown on the dashboard when the Sentinel detects a flight issue.
 * The user must explicitly Approve or Decline — the AI never acts alone.
 */
export function DisruptionAlertCard({ alert, onResolve }: Props) {
  const [loading, setLoading] = useState<'approved' | 'declined' | null>(null);
  // Safely handle unknown severity values from DB
  const severityKey = (alert.severity && alert.severity in SEVERITY_STYLES) ? alert.severity : 'medium';
  const style = SEVERITY_STYLES[severityKey];
  // Ensure alternative_options is always an array — DB may return null
  const options = Array.isArray(alert.alternative_options) ? alert.alternative_options : [];

  const handleAction = async (action: 'approved' | 'declined') => {
    setLoading(action);
    try {
      await fetch('/api/disruption/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId: alert.id, action }),
      });
      onResolve(alert.id, action);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
      {/* Severity indicator bar */}
      <div className={`h-1 w-full ${style.bar}`} />

      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{style.icon}</span>
            <div>
              <p className="font-semibold text-white text-sm">Flight {alert.flight_iata || 'Unknown'}</p>
              <p className="text-xs text-white/40">
                {alert.created_at
                  ? new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </p>
            </div>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${style.badge}`}>
            {(alert.status || 'UNKNOWN').toUpperCase()}
            {(alert.delay_minutes || 0) > 0 && ` · ${alert.delay_minutes}m`}
          </span>
        </div>

        {/* AI Proposal */}
        <p className="text-sm text-white/70 leading-relaxed">{alert.ai_proposal || 'No details available.'}</p>

        {/* Alternative Options — only rendered if non-empty */}
        {options.length > 0 && (
          <div className="rounded-xl bg-white/5 p-3 space-y-1">
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">Options</p>
            {options.map((opt, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-white/60">
                <span className="text-violet-400 mt-0.5">→</span>
                <span>{opt}</span>
              </div>
            ))}
          </div>
        )}

        {/* HITL Action Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => handleAction('approved')}
            disabled={!!loading}
            className="flex-1 rounded-xl bg-violet-600 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
          >
            {loading === 'approved' ? '...' : '✓ Show me options'}
          </button>
          <button
            onClick={() => handleAction('declined')}
            disabled={!!loading}
            className="flex-1 rounded-xl bg-white/10 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/15 disabled:opacity-50"
          >
            {loading === 'declined' ? '...' : "I'll handle it"}
          </button>
        </div>

        <p className="text-center text-xs text-white/20">AI cannot book without your approval</p>
      </div>
    </div>
  );
}
