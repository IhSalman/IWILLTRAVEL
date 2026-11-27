'use client';

import { useState } from 'react';

export interface ProposedPatchPreview {
  day: number;
  triggerType?: string;
  summary: string;
  beforeActivities?: Array<{ time: string; title: string }>;
  afterActivities?: Array<{ time: string; title: string }>;
}

export interface DisruptionAlert {
  id: string;
  flight_iata: string;
  status: string;
  delay_minutes: number;
  severity: 'low' | 'medium' | 'high';
  trigger_type?: string;
  ai_proposal: string;
  alternative_options: string[] | null;
  proposed_patch?: ProposedPatchPreview | null;
  created_at: string;
}

interface Props {
  alert: DisruptionAlert;
  onResolve: (alertId: string, action: 'approved' | 'declined', updatedItinerary?: any) => void;
}

const SEVERITY_STYLES = {
  low:    { bar: 'bg-yellow-400', badge: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20', icon: '⚠️' },
  medium: { bar: 'bg-orange-400', badge: 'bg-orange-400/10 text-orange-400 border-orange-400/20', icon: '🌦️' },
  high:   { bar: 'bg-red-500',    badge: 'bg-red-500/10 text-red-400 border-red-500/20',          icon: '🚨' },
};

/**
 * DisruptionAlertCard — HITL (Human-in-the-Loop) notification & schedule patch card.
 * Shown when Agent 9 (Live Sentinel) detects a flight delay, severe weather/AQI, or venue closure.
 * Displays a concrete Before/After schedule diff; never mutates the trip without traveler approval.
 */
export function DisruptionAlertCard({ alert, onResolve }: Props) {
  const [loading, setLoading] = useState<'approved' | 'declined' | null>(null);
  const severityKey = alert.severity && alert.severity in SEVERITY_STYLES ? alert.severity : 'medium';
  const style = SEVERITY_STYLES[severityKey];
  const options = Array.isArray(alert.alternative_options)
    ? alert.alternative_options.filter((o) => typeof o === 'string' && !o.startsWith('__PATCH__:'))
    : [];
  const patch = alert.proposed_patch;

  const handleAction = async (action: 'approved' | 'declined') => {
    setLoading(action);
    try {
      const res = await fetch('/api/disruption/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId: alert.id, action }),
      });
      const data = await res.json().catch(() => ({}));
      onResolve(alert.id, action, data?.itinerary ?? null);
    } finally {
      setLoading(null);
    }
  };

  const headerTitle =
    alert.trigger_type === 'weather'
      ? `Live Weather Advisory (${alert.flight_iata})`
      : alert.trigger_type === 'aqi'
      ? `Air Quality Advisory (${alert.flight_iata})`
      : alert.trigger_type === 'venue_closure'
      ? `Venue Hours Alert (${alert.flight_iata})`
      : `Flight ${alert.flight_iata || 'Update'}`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md">
      <div className={`h-1 w-full ${style.bar}`} />

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{style.icon}</span>
            <div>
              <p className="font-semibold text-white text-sm">{headerTitle}</p>
              <p className="text-xs text-white/40">
                {alert.created_at
                  ? new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Just now'}
              </p>
            </div>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${style.badge}`}>
            {(alert.trigger_type || alert.status || 'ALERT').toUpperCase()}
            {(alert.delay_minutes || 0) > 0 && ` · ${alert.delay_minutes}m`}
          </span>
        </div>

        <p className="text-sm text-white/80 leading-relaxed">{alert.ai_proposal || 'No details available.'}</p>

        {/* Concrete Before / After Schedule Patch Preview */}
        {patch && (
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.05] p-3 space-y-2">
            <p className="text-[11px] font-mono uppercase tracking-wider text-sky-300">
              Proposed Day {patch.day} Schedule Patch · {patch.summary}
            </p>
            {Array.isArray(patch.afterActivities) && patch.afterActivities.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-black/25 p-2 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-rose-300/80">Before</span>
                  {(patch.beforeActivities || []).slice(0, 4).map((b, i) => (
                    <div key={i} className="text-white/50 truncate">
                      {b.time}: {b.title}
                    </div>
                  ))}
                </div>
                <div className="rounded-lg bg-emerald-500/[0.07] p-2 space-y-1 border border-emerald-500/15">
                  <span className="text-[10px] font-mono uppercase text-emerald-300">After (API-Verified)</span>
                  {patch.afterActivities.slice(0, 4).map((a, i) => (
                    <div key={i} className="text-emerald-100/90 truncate">
                      {a.time}: {a.title}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!patch && options.length > 0 && (
          <div className="rounded-xl bg-white/5 p-3 space-y-1">
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">Options</p>
            {options.map((opt, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-white/60">
                <span className="text-sky-400 mt-0.5">→</span>
                <span>{opt}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => handleAction('approved')}
            disabled={!!loading}
            className="flex-1 rounded-xl bg-sky-600 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
          >
            {loading === 'approved'
              ? 'Applying...'
              : patch
              ? '✓ Approve & Update Itinerary'
              : '✓ Acknowledge Options'}
          </button>
          <button
            onClick={() => handleAction('declined')}
            disabled={!!loading}
            className="flex-1 rounded-xl bg-white/10 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/15 disabled:opacity-50"
          >
            {loading === 'declined' ? '...' : 'Keep Original Plan'}
          </button>
        </div>

        <p className="text-center text-[11px] text-white/30">
          HITL Protected · Rollback snapshot saved automatically before patching
        </p>
      </div>
    </div>
  );
}
