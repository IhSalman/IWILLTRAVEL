'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface ActivePresence {
  user_id: string;
  display_name: string;
  avatar_color: string;
  last_seen: string;
}

interface Props {
  itineraryId: string;
  currentUserId: string;
  currentUserName: string;
}

// Generates a consistent color from a user_id string
function colorFromId(id: string): string {
  const colors = [
    '#8B5CF6', '#EC4899', '#f3b87f', '#80ad88',
    '#F59E0B', '#EF4444', '#3B82F6', '#84CC16',
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/**
 * CollaborationPulse — Real-time "Who's Viewing" Indicators
 * ──────────────────────────────────────────────────────────
 * Uses Supabase Realtime Presence to show live avatars of
 * every user currently viewing this itinerary.
 *
 * Thesis: Documents real-time state synchronization for
 * multiplayer travel planning (Pillar IV — Superapp Features).
 */
export function CollaborationPulse({ itineraryId, currentUserId, currentUserName }: Props) {
  const [activeUsers, setActiveUsers] = useState<ActivePresence[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const channelName = `itinerary:${itineraryId}:presence`;

    const channel = supabase.channel(channelName, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<ActivePresence>();
        const users: ActivePresence[] = Object.values(state)
          .flat()
          .filter((u) => u.user_id !== currentUserId);
        setActiveUsers(users);
        setSyncing(false);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setSyncing(true);
          await channel.track({
            user_id: currentUserId,
            display_name: currentUserName,
            avatar_color: colorFromId(currentUserId),
            last_seen: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack().then(() => supabase.removeChannel(channel));
    };
  }, [itineraryId, currentUserId, currentUserName]);

  if (activeUsers.length === 0 && !syncing) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Live pulse dot */}
      {syncing ? (
        <span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />
      ) : (
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
      )}

      {/* Co-viewer avatars */}
      <div className="flex -space-x-2">
        {activeUsers.slice(0, 5).map((user) => (
          <div
            key={user.user_id}
            title={`${user.display_name} is viewing`}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#0a0a0f] text-xs font-bold text-white shadow-lg transition-transform hover:scale-110 hover:z-10"
            style={{ backgroundColor: user.avatar_color }}
          >
            {user.display_name.charAt(0).toUpperCase()}
          </div>
        ))}
        {activeUsers.length > 5 && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#0a0a0f] bg-white/10 text-xs text-white/60">
            +{activeUsers.length - 5}
          </div>
        )}
      </div>

      {/* Label */}
      <span className="text-xs text-white/40">
        {activeUsers.length === 1
          ? `${activeUsers[0].display_name} is also viewing`
          : `${activeUsers.length} others viewing`}
      </span>
    </div>
  );
}
