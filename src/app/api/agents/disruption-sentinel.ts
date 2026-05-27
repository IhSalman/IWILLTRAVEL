/**
 * Disruption Sentinel Agent
 * ─────────────────────────────────────────────────────────────
 * Receives Aviationstack webhook events (flight status changes)
 * and orchestrates an autonomous mitigation proposal.
 *
 * Architecture (HITL — Human-in-the-Loop):
 *   1. Parse incoming webhook payload
 *   2. Find all active itineraries containing this flight
 *   3. Run centralized LLM to draft a mitigation plan (hotel / alt flight)
 *   4. Save the proposal to `disruption_alerts` in Supabase
 *   5. Supabase Realtime pushes the card to the user's dashboard
 *   6. User approves / declines — AI NEVER books autonomously
 */

import { createClient } from '@supabase/supabase-js';
import { generateContent, logAiUsage } from '@/utils/ai-config';

// ── Types ────────────────────────────────────────────────────

export interface FlightStatusPayload {
  flight_iata: string;      // e.g. "TK123"
  airline_name: string;
  departure_airport: string;
  arrival_airport: string;
  status: 'active' | 'landed' | 'cancelled' | 'delayed' | 'diverted';
  delay_minutes?: number;
  scheduled_departure: string; // ISO 8601
  estimated_departure?: string;
}

export interface DisruptionMitigation {
  itinerary_id: string;
  user_id: string;
  flight_iata: string;
  status: string;
  delay_minutes: number;
  ai_proposal: string;        // Natural language proposal from LLM
  alternative_options: string; // JSON string of alternatives
  severity: 'low' | 'medium' | 'high';
  created_at: string;
  resolved: boolean;
}

// ── Helpers ──────────────────────────────────────────────────

function classifySeverity(
  status: string,
  delayMinutes: number
): 'low' | 'medium' | 'high' {
  if (status === 'cancelled' || status === 'diverted') return 'high';
  if (delayMinutes >= 120) return 'high';
  if (delayMinutes >= 45) return 'medium';
  return 'low';
}

// ── Core Sentinel Logic ──────────────────────────────────────

export async function runDisruptionSentinel(
  payload: FlightStatusPayload
): Promise<{ success: boolean; alertsCreated: number; message: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { success: false, alertsCreated: 0, message: 'Missing environment configuration.' };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const delayMinutes = payload.delay_minutes ?? 0;
  const severity = classifySeverity(payload.status, delayMinutes);

  // ── Step 1: Only act on meaningful disruptions ──
  if (severity === 'low' && payload.status === 'active') {
    return { success: true, alertsCreated: 0, message: 'No disruption — sentinel monitoring.' };
  }

  // ── Step 2: Find affected itineraries in Supabase ──
  const { data: affectedItineraries, error: dbError } = await supabase
    .from('itineraries')
    .select('id, user_id, title')
    .ilike('flight_data', `%${payload.flight_iata}%`)
    .eq('status', 'active');

  if (dbError || !affectedItineraries?.length) {
    return { success: true, alertsCreated: 0, message: 'No active itineraries affected.' };
  }

  // ── Step 3: Run the Centralized Disruption Agent ──
  const disruptionContext = `
You are an expert travel concierge AI. A flight disruption has been detected.

Flight: ${payload.flight_iata} (${payload.airline_name})
Route: ${payload.departure_airport} → ${payload.arrival_airport}
Status: ${payload.status.toUpperCase()}
Delay: ${delayMinutes} minutes
Scheduled: ${payload.scheduled_departure}

Write a SHORT (2-3 sentence), calm, human-sounding notification message for the traveler.
Then, on a new line starting with "OPTIONS:", list 2-3 concrete mitigation options they could take.
Example options: book next available flight, find a hotel for overnight, request airline voucher.
DO NOT suggest any specific prices or booking links. Keep it helpful and reassuring.
  `.trim();

  let aiProposal = 'We detected an issue with your flight. Please check with your airline for the latest updates.';
  let alternativeOptions = '[]';

  try {
    const { text, usage, model } = await generateContent(disruptionContext, {
        role: 'analytical'
    });
    
    const [proposal, optionsRaw] = text.split('OPTIONS:');
    aiProposal = proposal?.trim() ?? aiProposal;

    // Parse options into structured JSON
    if (optionsRaw) {
      const options = optionsRaw
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((o) => o.replace(/^[-•*]\s*/, '').trim())
        .filter((o) => o.length > 0);
      alternativeOptions = JSON.stringify(options);
    }

    // Log usage (using first affected user as reference for the log, or "system")
    if (affectedItineraries.length > 0) {
        logAiUsage({
            userId: affectedItineraries[0].user_id,
            featureType: 'disruption-sentinel',
            ...usage,
            model,
        }).catch(() => {});
    }
  } catch (aiError) {
    console.error('[DisruptionSentinel] AI error:', aiError);
  }

  // ── Step 4: Save alerts to Supabase for each affected user ──
  let alertsCreated = 0;

  for (const itinerary of affectedItineraries) {
    const alert: Omit<DisruptionMitigation, 'created_at'> = {
      itinerary_id: itinerary.id,
      user_id: itinerary.user_id,
      flight_iata: payload.flight_iata,
      status: payload.status,
      delay_minutes: delayMinutes,
      ai_proposal: aiProposal,
      alternative_options: alternativeOptions,
      severity,
      resolved: false,
    };

    const { error: insertError } = await supabase
      .from('disruption_alerts')
      .insert(alert);

    if (!insertError) alertsCreated++;
  }

  return {
    success: true,
    alertsCreated,
    message: `Sentinel processed ${payload.flight_iata}: ${alertsCreated} alert(s) created.`,
  };
}
