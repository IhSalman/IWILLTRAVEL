'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Props {
  userId: string;
  itineraryId?: string; // Optional — can link to a specific trip or create a new "Floating Event"
  onSuccess?: () => void;
}

/**
 * ManualFlightEntry — Component for linking external bookings.
 * ─────────────────────────────────────────────────────────────
 * Enables the "Superapp" capability for non-platform bookings.
 * Once a flight is manually linked, the Disruption Sentinel
 * starts its real-time monitoring automatically.
 */
export function ManualFlightEntry({ userId, itineraryId, onSuccess }: Props) {
  const [flightIata, setFlightIata] = useState('');
  const [flightDate, setFlightDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flightIata || !flightDate) return;

    setLoading(true);
    setError(null);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) throw new Error('Supabase config missing');
      
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Clean the input (e.g., "TK 123" -> "TK123")
      const cleanIata = flightIata.replace(/\s/g, '').toUpperCase();

      // Update the itinerary's flight_data or create a monitoring record
      // This allows the Sentinel (which searches on flight_data) to find it.
      const { error: updateError } = await supabase
        .from('itineraries')
        .update({ 
          flight_data: `[MANUAL_LINK] ${cleanIata} | Date: ${flightDate}`,
          updated_at: new Date().toISOString()
        })
        .match({ id: itineraryId, user_id: userId });

      if (updateError) throw updateError;

      setSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message ?? 'Failed to link flight');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-xl bg-violet-600/20 p-2 text-xl">✈️</div>
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-tight">Protect My External Flight</h3>
          <p className="text-xs text-white/40">Link a booking from another site to activate Sentinel coverage.</p>
        </div>
      </div>

      {success ? (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="mb-2 text-3xl">✅</div>
          <p className="text-sm text-emerald-400 font-semibold">Sentinal Active for {flightIata}</p>
          <p className="text-xs text-white/40 mt-1">We are now monitoring this flight 24/7.</p>
          <button 
            onClick={() => setSuccess(false)}
            className="mt-4 text-xs font-bold text-violet-400 hover:text-violet-300"
          >
            Link another?
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Flight IATA</label>
              <input
                type="text"
                placeholder="e.g. TK123"
                value={flightIata}
                onChange={(e) => setFlightIata(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-violet-500/50 focus:bg-white/10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Departure Date</label>
              <input
                type="date"
                value={flightDate}
                onChange={(e) => setFlightDate(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-all focus:border-violet-500/50 focus:bg-white/10 [color-scheme:dark]"
              />
            </div>
          </div>

          {error && (
            <p className="text-center text-[10px] text-red-400 bg-red-400/10 rounded-lg py-1.5">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-xs font-black text-white shadow-lg shadow-violet-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] ${loading ? 'opacity-50' : ''}`}
          >
            {loading ? 'SYNCING...' : 'ACTIVATE PROTECTION →'}
          </button>
        </form>
      )}
    </div>
  );
}
