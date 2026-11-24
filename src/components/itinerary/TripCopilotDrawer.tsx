'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    MessageSquareText,
    X,
    Send,
    Loader2,
    Sparkles,
    RotateCcw,
    CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    mutated?: boolean;
    changeSummary?: string;
}

interface Props {
    itineraryId: string;
    destination: string;
    initialCanRollback?: boolean;
    onItineraryUpdated: (updatedItinerary: any) => void;
}

const QUICK_PROMPTS = [
    'Swap Day 1 afternoon stop for an indoor museum',
    'Add a highly rated local café to Day 1',
    'Make Day 2 pace more relaxed',
    'What is my ESG carbon footprint and top budget tip?',
];

export default function TripCopilotDrawer({
    itineraryId,
    destination,
    initialCanRollback = false,
    onItineraryUpdated,
}: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isRollingBack, setIsRollingBack] = useState(false);
    const [canRollback, setCanRollback] = useState(initialCanRollback);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content: `Hi! I'm your stateful DGIS Trip Co-Pilot for ${destination}. Ask me to swap activities, add verified cafés/restaurants, lighten a day's pace, or check opening hours — every edit is verified live against Google Places & Routes.`,
        },
    ]);

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const sendMessage = async (textToSend?: string) => {
        const msg = (textToSend ?? input).trim();
        if (!msg || isSending) return;

        const nextHistory: ChatMessage[] = [...messages, { role: 'user', content: msg }];
        setMessages(nextHistory);
        if (!textToSend) setInput('');
        setIsSending(true);

        try {
            const res = await fetch(`/api/itineraries/${itineraryId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: msg,
                    history: messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Co-Pilot request failed');
            }

            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: data.reply,
                    mutated: data.mutated,
                    changeSummary: data.changeSummary,
                },
            ]);

            if (typeof data.canRollback === 'boolean') {
                setCanRollback(data.canRollback);
            }

            if (data.mutated && data.itinerary) {
                onItineraryUpdated(data.itinerary);
                toast.success(data.changeSummary || 'Itinerary updated with Google Places verification!');
            }
        } catch (err: any) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: `Sorry, I couldn't complete that update: ${err.message}`,
                },
            ]);
        } finally {
            setIsSending(false);
        }
    };

    const handleRollback = async () => {
        if (isRollingBack) return;
        setIsRollingBack(true);
        try {
            const res = await fetch(`/api/itineraries/${itineraryId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rollback: true }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Rollback failed');

            if (data.itinerary) {
                onItineraryUpdated(data.itinerary);
                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'assistant',
                        content: 'Restored the previous version snapshot of your itinerary.',
                    },
                ]);
                toast.success('Reverted to previous itinerary snapshot');
            }
        } catch (err: any) {
            toast.error(err.message || 'No previous snapshot to restore');
            setCanRollback(false);
        } finally {
            setIsRollingBack(false);
        }
    };

    return (
        <>
            {/* Floating Co-Pilot Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full border border-sky-400/30 bg-slate-900/90 px-5 py-3 text-xs font-medium text-slate-100 shadow-2xl shadow-sky-950/50 backdrop-blur-xl transition-all hover:scale-105 hover:border-sky-400/60 hover:bg-slate-800"
            >
                <Sparkles className="h-4 w-4 text-sky-400" />
                <span>Trip Co-Pilot</span>
                <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 text-[10px] px-1.5 py-0">
                    Live AI
                </Badge>
            </button>

            {/* Slide-Over Co-Pilot Drawer */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
                    <div className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0b0c0f] text-slate-200 shadow-2xl">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                            <div className="flex items-center gap-2.5">
                                <div className="rounded-xl bg-sky-500/15 p-2 border border-sky-500/25">
                                    <MessageSquareText className="h-4 w-4 text-sky-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-white">DGIS Trip Co-Pilot</h3>
                                    <p className="text-[11px] text-slate-400 font-mono">
                                        100% Google Places & Hours Grounded
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {canRollback && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={isRollingBack}
                                        onClick={handleRollback}
                                        title="Undo last schedule change"
                                        className="h-8 px-2.5 text-[11px] text-amber-300 hover:text-amber-200 hover:bg-amber-500/10"
                                    >
                                        {isRollingBack ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <>
                                                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Undo
                                            </>
                                        )}
                                    </Button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Quick Action Chips */}
                        <div className="border-b border-white/5 px-4 py-2.5 flex gap-1.5 overflow-x-auto no-scrollbar">
                            {QUICK_PROMPTS.map((qp) => (
                                <button
                                    key={qp}
                                    disabled={isSending}
                                    onClick={() => sendMessage(qp)}
                                    className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-slate-300 transition hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-white disabled:opacity-40"
                                >
                                    {qp}
                                </button>
                            ))}
                        </div>

                        {/* Messages Scroll Area */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.map((m, idx) => (
                                <div
                                    key={idx}
                                    className={`flex flex-col ${
                                        m.role === 'user' ? 'items-end' : 'items-start'
                                    }`}
                                >
                                    <div
                                        className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                                            m.role === 'user'
                                                ? 'bg-sky-600 text-white'
                                                : 'border border-white/10 bg-white/[0.05] text-slate-200'
                                        }`}
                                    >
                                        {m.content}
                                    </div>
                                    {m.mutated && (
                                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                                            <CheckCircle2 className="h-3 w-3" />
                                            {m.changeSummary || 'Verified schedule patch applied'}
                                        </span>
                                    )}
                                </div>
                            ))}

                            {isSending && (
                                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
                                    <span>Verifying venues & opening hours...</span>
                                </div>
                            )}
                        </div>

                        {/* Chat Input */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                sendMessage();
                            }}
                            className="border-t border-white/10 p-3 flex items-center gap-2"
                        >
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="e.g. Swap Day 1 afternoon for a museum..."
                                disabled={isSending}
                                className="flex-1 bg-white/[0.05] border-white/10 text-xs text-white placeholder:text-slate-500"
                            />
                            <Button
                                type="submit"
                                size="sm"
                                disabled={!input.trim() || isSending}
                                className="bg-sky-600 hover:bg-sky-500 text-white px-3"
                            >
                                <Send className="h-3.5 w-3.5" />
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
