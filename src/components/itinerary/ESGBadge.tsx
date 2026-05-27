'use client';

import type { ESGReport } from '@/lib/esg-calculator';

interface Props {
  report: ESGReport;
  compact?: boolean;
}

const GRADE_COLORS: Record<ESGReport['grade'], string> = {
  A: 'from-emerald-500 to-green-400',
  B: 'from-green-500 to-teal-400',
  C: 'from-yellow-500 to-amber-400',
  D: 'from-orange-500 to-red-400',
  F: 'from-red-600 to-red-500',
};

const GRADE_BG: Record<ESGReport['grade'], string> = {
  A: 'bg-emerald-500/10 border-emerald-500/20',
  B: 'bg-green-500/10 border-green-500/20',
  C: 'bg-yellow-500/10 border-yellow-500/20',
  D: 'bg-orange-500/10 border-orange-500/20',
  F: 'bg-red-500/10 border-red-500/20',
};

/**
 * ESGBadge — Displays the sustainability score for an itinerary.
 * Compact mode: small inline badge.
 * Full mode: expanded card with details.
 */
export function ESGBadge({ report, compact = false }: Props) {
  if (compact) {
    return (
      <div
        title={`${report.grade_label} — ${report.total_co2_kg}kg CO₂`}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${GRADE_BG[report.grade]}`}
      >
        <span className={`bg-gradient-to-r bg-clip-text text-transparent ${GRADE_COLORS[report.grade]}`}>
          {report.grade}
        </span>
        <span className="text-white/60">{report.total_co2_kg}kg CO₂</span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 ${GRADE_BG[report.grade]} space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider">Sustainability Score</p>
          <p className="text-sm font-semibold text-white">{report.grade_label}</p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-2xl font-black text-white ${GRADE_COLORS[report.grade]}`}
          style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
        >
          {report.grade}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white/5 p-2">
          <p className="text-lg font-bold text-white">{report.total_co2_kg}<span className="text-xs text-white/40">kg</span></p>
          <p className="text-xs text-white/40">CO₂ total</p>
        </div>
        <div className="rounded-xl bg-white/5 p-2">
          <p className="text-lg font-bold text-white">{report.trees_to_offset}</p>
          <p className="text-xs text-white/40">trees offset</p>
        </div>
        <div className="rounded-xl bg-white/5 p-2">
          <p className="text-lg font-bold text-white">{report.total_distance_km}<span className="text-xs text-white/40">km</span></p>
          <p className="text-xs text-white/40">total dist.</p>
        </div>
      </div>

      {/* Car savings */}
      {report.vs_car_savings_kg > 0 && (
        <p className="text-xs text-white/50">
          🌿 Saves <span className="text-emerald-400 font-semibold">{report.vs_car_savings_kg}kg CO₂</span> vs. driving the same distance
        </p>
      )}

      {/* AI Recommendation */}
      <p className="text-xs text-white/60 leading-relaxed border-t border-white/10 pt-2">
        {report.recommendation}
      </p>
    </div>
  );
}
