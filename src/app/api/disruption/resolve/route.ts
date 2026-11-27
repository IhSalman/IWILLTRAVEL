/**
 * POST /api/disruption/resolve
 * GET  /api/disruption/resolve?itineraryId=...
 * ──────────────────────────────────────────────────────────────────────────────
 * Human-in-the-Loop (HITL) Resolution Endpoint for Live Itinerary Alerts (§6.6.2).
 * - When `action === 'approved'` and a `proposed_patch` is attached, snapshots the
 *   current itinerary version for 1-click rollback and atomically patches the
 *   affected day's schedule in `public.itineraries`.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/utils/auth';
import { createAdminClient } from '@/utils/supabase/admin';
import type { ProposedSchedulePatch } from '@/app/api/agents/disruption-sentinel';

const ResolveSchema = z.object({
    alertId: z.string().uuid(),
    action: z.enum(['approved', 'declined']),
});

function extractProposedPatch(alertRow: any): ProposedSchedulePatch | null {
    if (alertRow?.proposed_patch && typeof alertRow.proposed_patch === 'object') {
        return alertRow.proposed_patch as ProposedSchedulePatch;
    }
    if (Array.isArray(alertRow?.alternative_options)) {
        const embedded = alertRow.alternative_options.find(
            (item: any) => typeof item === 'string' && item.startsWith('__PATCH__:')
        );
        if (embedded) {
            try {
                return JSON.parse(embedded.slice('__PATCH__:'.length));
            } catch {
                return null;
            }
        }
    }
    return null;
}

export async function GET(req: Request) {
    const auth = await requireAuth();
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const url = new URL(req.url);
    const itineraryId = url.searchParams.get('itineraryId');

    const supabase = createAdminClient();
    let query = supabase
        .from('disruption_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('resolved', false)
        .order('created_at', { ascending: false });

    if (itineraryId) {
        query = query.eq('itinerary_id', itineraryId);
    }

    const { data, error } = await query;
    if (error) {
        return NextResponse.json({ alerts: [], warning: error.message });
    }

    // Normalize any embedded __PATCH__ metadata cleanly for Web & Mobile clients
    const normalized = (data || []).map((row: any) => {
        const patch = extractProposedPatch(row);
        const cleanOptions = Array.isArray(row.alternative_options)
            ? row.alternative_options.filter((o: any) => typeof o === 'string' && !o.startsWith('__PATCH__:'))
            : [];
        return {
            ...row,
            alternative_options: cleanOptions,
            proposed_patch: patch,
        };
    });

    return NextResponse.json({ alerts: normalized });
}

export async function POST(req: Request) {
    const auth = await requireAuth();
    if ('error' in auth) return auth.error;
    const { user } = auth;

    try {
        const body = await req.json();
        const parsed = ResolveSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
        }

        const { alertId, action } = parsed.data;
        const supabase = createAdminClient();

        const { data: alertRow, error: fetchErr } = await supabase
            .from('disruption_alerts')
            .select('*')
            .eq('id', alertId)
            .eq('user_id', user.id)
            .single();

        if (fetchErr || !alertRow) {
            return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
        }

        let updatedItinerary: any = null;
        const patch = extractProposedPatch(alertRow);

        if (action === 'approved' && patch && alertRow.itinerary_id) {
            const { data: itinRow } = await supabase
                .from('itineraries')
                .select('*')
                .eq('id', alertRow.itinerary_id)
                .eq('user_id', user.id)
                .single();

            if (itinRow?.content) {
                const rawContent =
                    typeof itinRow.content === 'string' ? JSON.parse(itinRow.content) : structuredClone(itinRow.content);
                const isWrapped = Boolean(rawContent?.itinerary);
                const itinObj = isWrapped ? rawContent.itinerary : rawContent;

                // 1. Save rollback snapshot (both to itinerary_versions table if migrated, and inline _versions)
                const prevVersions = Array.isArray(rawContent._versions) ? rawContent._versions : [];
                const nextVersionNum = prevVersions.length + 1;
                const snapshotEntry = {
                    version: nextVersionNum,
                    timestamp: new Date().toISOString(),
                    source: 'sentinel_patch',
                    summary: patch.summary,
                    daysSnapshot: structuredClone(itinObj.days),
                };

                await supabase
                    .from('itinerary_versions')
                    .insert({
                        itinerary_id: itinRow.id,
                        user_id: user.id,
                        version_num: nextVersionNum,
                        change_source: 'sentinel_patch',
                        change_summary: patch.summary,
                        snapshot: itinObj,
                    })
                    .then(() => {}); // Non-fatal if migration not yet applied

                // 2. Apply schedule patch to target day
                if (Array.isArray(itinObj.days)) {
                    const dayIdx = itinObj.days.findIndex((d: any) => d.day === patch.day);
                    if (dayIdx !== -1) {
                        itinObj.days[dayIdx] = {
                            ...itinObj.days[dayIdx],
                            activities: patch.afterActivities,
                        };
                    }
                }

                const newContent = isWrapped
                    ? {
                          ...rawContent,
                          itinerary: itinObj,
                          _versions: [...prevVersions.slice(-9), snapshotEntry],
                      }
                    : {
                          ...itinObj,
                          _versions: [...prevVersions.slice(-9), snapshotEntry],
                      };

                const { error: updateItinErr } = await supabase
                    .from('itineraries')
                    .update({ content: newContent })
                    .eq('id', itinRow.id)
                    .eq('user_id', user.id);

                if (!updateItinErr) {
                    updatedItinerary = itinObj;
                }
            }
        }

        // Mark alert resolved
        await supabase
            .from('disruption_alerts')
            .update({
                resolved: true,
                resolved_at: new Date().toISOString(),
                user_action: action,
            })
            .eq('id', alertId)
            .eq('user_id', user.id);

        return NextResponse.json({
            success: true,
            action,
            patchApplied: Boolean(updatedItinerary),
            itinerary: updatedItinerary,
        });
    } catch (err: any) {
        console.error('[Disruption Resolve] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
