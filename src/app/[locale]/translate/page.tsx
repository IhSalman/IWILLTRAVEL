'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Languages, Mic, Type, Image as ImageIcon,
    ArrowRightLeft, Volume2, Copy, History, X, Trash2,
    ChevronDown, Camera, Check, Loader2, Zap,
    RefreshCw, Square, Sparkles, Radio, Activity, AlertTriangle, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

// ── Types & Constants ─────────────────────────────────────────────────────────
interface HistoryEntry {
    id: string;
    timestamp: number;
    mode: 'text' | 'voice' | 'image';
    sourceLang: string;
    targetLang: string;
    originalText: string;
    translatedText: string;
}
interface ConvEntry {
    speaker: 'A' | 'B';
    original: string;
    translated: string;
    voiceName: string;
}
type VoiceStep =
    | 'idle'
    | 'listening-A'
    | 'translating-A'
    | 'speaking-A'
    | 'listening-B'
    | 'translating-B'
    | 'speaking-B';

const COMMON_LANGUAGES = [
    'Auto-Detect', 'English', 'Japanese', 'Spanish', 'French', 'German',
    'Italian', 'Portuguese', 'Chinese (Simplified)', 'Chinese (Traditional)',
    'Korean', 'Arabic', 'Russian', 'Hindi', 'Thai', 'Vietnamese',
];

const TRAVELER_PHRASES = [
    { label: '🚉 Nearest station', text: 'Excuse me, where is the nearest train or metro station?' },
    { label: '🥜 Food allergy', text: 'I have a severe food allergy to nuts and gluten. Does this dish contain either?' },
    { label: '🍜 Local specialty', text: 'What local specialty dish do you recommend here?' },
    { label: '🧾 Check please', text: 'Could we have the bill, please? Can I pay by card?' },
    { label: '🚕 Call a taxi', text: 'Could you please help me call an official taxi to this address?' },
    { label: '🏥 Pharmacy / Help', text: 'Where is the nearest pharmacy or English-speaking clinic?' },
];

const VOICE_MAP: Record<string, string> = {
    'en-US': 'en-US', 'English': 'en-US', 'Japanese': 'ja-JP', 'Spanish': 'es-ES', 'French': 'fr-FR',
    'German': 'de-DE', 'Italian': 'it-IT', 'Portuguese': 'pt-PT', 'Chinese (Simplified)': 'zh-CN', 'Chinese (Traditional)': 'zh-TW',
    'Korean': 'ko-KR', 'Arabic': 'ar-SA', 'Russian': 'ru-RU', 'Hindi': 'hi-IN', 'Thai': 'th-TH', 'Vietnamese': 'vi-VN',
    'Auto-Detect': 'en-US',
};

const VOICE_A = 'Puck';
const VOICE_B = 'Kore';
const HISTORY_KEY = 'linguasphere_history';

// ── Background Components ───────────────────────────────────────────────────
const AmbientStage = () => (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#0b0c0f]">
        <div className="absolute inset-0 bg-[#0b0c0f]" />
        <div className="absolute top-0 right-1/4 w-[540px] h-[540px] bg-sky-500/[0.04] rounded-full blur-[150px]" />
        <div className="absolute bottom-10 left-1/4 w-[520px] h-[520px] bg-indigo-500/[0.04] rounded-full blur-[150px]" />
    </div>
);

const AcousticSphere = ({ active, step }: { active: boolean; step: VoiceStep }) => {
    return (
        <div className="relative w-52 h-52 flex items-center justify-center">
            <motion.div
                animate={{
                    scale: active ? [1, 1.15, 1] : 1,
                    opacity: active ? [0.22, 0.38, 0.22] : 0.1,
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full blur-[48px] bg-sky-400/[0.14]"
            />

            <AnimatePresence>
                {active && (
                    <>
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1.1, opacity: 0.45, rotate: 360 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                            className="absolute inset-2 rounded-full border border-dashed border-white/[0.18]"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1.25, opacity: 0.22, rotate: -360 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                            className="absolute inset-6 rounded-full border border-white/[0.1]"
                        />
                    </>
                )}
            </AnimatePresence>

            <motion.div
                animate={
                    active
                        ? {
                              scale: [1, 1.04, 1],
                              boxShadow: [
                                  '0 0 30px rgba(125,211,252,0.08)',
                                  '0 0 54px rgba(125,211,252,0.18)',
                                  '0 0 30px rgba(125,211,252,0.08)',
                              ],
                          }
                        : { scale: 1 }
                }
                transition={{ duration: 2.5, repeat: Infinity }}
                className="relative w-28 h-28 rounded-full apple-liquid-glass flex items-center justify-center z-10"
            >
                {step.includes('listening') ? (
                    <div className="flex gap-1.5 items-center">
                        {[0, 1, 2, 3].map((i) => (
                            <motion.div
                                key={i}
                                animate={{ height: [6, 22, 6] }}
                                transition={{ duration: 0.75, repeat: Infinity, delay: i * 0.14 }}
                                className="w-1 rounded-full bg-sky-300"
                            />
                        ))}
                    </div>
                ) : step.includes('translating') ? (
                    <RefreshCw className="w-6 h-6 text-sky-200 animate-spin" />
                ) : step.includes('speaking') ? (
                    <Activity className="w-6 h-6 text-emerald-300 animate-pulse" />
                ) : (
                    <Radio className="w-6 h-6 text-slate-400" />
                )}
            </motion.div>
        </div>
    );
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function loadHistory(): HistoryEntry[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
        return [];
    }
}
function saveHistory(entries: HistoryEntry[]) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}
function getLangCode(lang: string): string {
    return VOICE_MAP[lang] || 'en-US';
}
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ── PCM Audio Core ────────────────────────────────────────────────────────────
async function playPCMAudio(base64Data: string, audioCtxRef: React.MutableRefObject<AudioContext | null>): Promise<void> {
    return new Promise(async (resolve) => {
        try {
            if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') await ctx.resume();

            const binary = atob(base64Data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

            const bufferLen = Math.floor(bytes.length / 2);
            const dataInt16 = new Int16Array(bytes.buffer, 0, bufferLen);

            const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
            const channelData = buffer.getChannelData(0);
            for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.onended = () => resolve();
            source.start();
        } catch (err) {
            console.error('PCM Playback Error:', err);
            resolve();
        }
    });
}

// ── UI Components ─────────────────────────────────────────────────────────────
function HistoryPanel({
    open,
    onClose,
    entries,
    onClear,
    onDelete,
    onSelect,
}: {
    open: boolean;
    onClose: () => void;
    entries: HistoryEntry[];
    onClear: () => void;
    onDelete: (id: string) => void;
    onSelect: (entry: HistoryEntry) => void;
}) {
    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/75 backdrop-blur-md z-[60]"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md z-[70] apple-liquid-glass border-l border-white/[0.12] flex flex-col shadow-2xl"
                    >
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08]">
                            <div>
                                <h2 className="text-lg font-serif font-bold text-white">Translation Archive</h2>
                                <p className="text-[11px] font-mono text-slate-400">{entries.length} saved phrases</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {entries.length > 0 && (
                                    <button
                                        onClick={onClear}
                                        className="px-3 py-1.5 rounded-full text-[11px] font-mono text-rose-300 hover:text-white hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                                    >
                                        Clear All
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-white/[0.08] text-slate-300 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-3">
                            {entries.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 py-16">
                                    <History className="w-11 h-11 opacity-35" />
                                    <p className="text-xs font-mono tracking-wider uppercase">No Recent Records</p>
                                </div>
                            ) : (
                                entries.map((entry) => (
                                    <div
                                        key={entry.id}
                                        onClick={() => {
                                            onSelect(entry);
                                            onClose();
                                        }}
                                        className="apple-glass-card rounded-2xl p-4 flex flex-col gap-2 cursor-pointer hover:border-white/25 transition-all group"
                                    >
                                        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
                                            <span>
                                                {entry.sourceLang} → {entry.targetLang}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-500">
                                                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(entry.id);
                                                    }}
                                                    title="Delete entry"
                                                    className="p-1 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-400 line-clamp-2">{entry.originalText}</p>
                                            <p className="text-sm font-medium text-white leading-snug">{entry.translatedText}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function LangSelector({
    value,
    onChange,
    side,
    excludeAuto,
}: {
    value: string;
    onChange: (v: string) => void;
    side: 'left' | 'right';
    excludeAuto?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const langs = excludeAuto ? COMMON_LANGUAGES.filter((l) => l !== 'Auto-Detect') : COMMON_LANGUAGES;
    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-all text-xs font-medium ${
                    open
                        ? 'border-white/[0.25] bg-white/[0.12] text-white'
                        : 'border-white/[0.1] bg-white/[0.05] text-slate-200 hover:text-white hover:border-white/[0.2]'
                }`}
            >
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">{side === 'left' ? 'FROM' : 'TO'}</span>
                <span className="text-white font-semibold">{value}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        className="absolute top-full mt-2 right-0 md:left-0 z-[80] w-56 rounded-2xl overflow-hidden shadow-2xl apple-liquid-glass p-1.5"
                    >
                        <div className="max-h-72 overflow-y-auto space-y-0.5 pr-1">
                            {langs.map((lang) => (
                                <button
                                    key={lang}
                                    type="button"
                                    onClick={() => {
                                        onChange(lang);
                                        setOpen(false);
                                    }}
                                    className={`w-full text-left px-3.5 py-2 rounded-xl text-xs transition-colors ${
                                        value === lang ? 'bg-white text-slate-950 font-semibold' : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
                                    }`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Main Page Component ───────────────────────────────────────────────────────
export default function TranslatePage() {
    const [mode, setMode] = useState<'text' | 'voice' | 'image'>('text');
    const [sourceLang, setSourceLang] = useState('English');
    const [targetLang, setTargetLang] = useState('Japanese');
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [copied, setCopied] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [requiresAuth, setRequiresAuth] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const supabase = createClient();

    const sourceLangRef = useRef(sourceLang);
    const targetLangRef = useRef(targetLang);
    useEffect(() => {
        sourceLangRef.current = sourceLang;
    }, [sourceLang]);
    useEffect(() => {
        targetLangRef.current = targetLang;
    }, [targetLang]);

    const [inputText, setInputText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);

    const [voiceStep, setVoiceStep] = useState<VoiceStep>('idle');
    const [isConversationActive, setIsConversationActive] = useState(false);
    const [conversation, setConversation] = useState<ConvEntry[]>([]);
    const [voiceError, setVoiceError] = useState('');
    const audioCtxRef = useRef<AudioContext | null>(null);
    const recognitionRef = useRef<any>(null);
    const abortRef = useRef(false);
    const convEndRef = useRef<HTMLDivElement>(null);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageExtracted, setImageExtracted] = useState('');
    const [imageTranslated, setImageTranslated] = useState('');
    const [isImageTranslating, setIsImageTranslating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const init = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                const { data } = await supabase
                    .from('translation_history')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(50);
                if (data)
                    setHistory(
                        data.map((d) => ({
                            id: d.id,
                            timestamp: new Date(d.created_at).getTime(),
                            mode: d.translation_type as any,
                            sourceLang: d.source_language,
                            targetLang: d.target_language,
                            originalText: d.original_text,
                            translatedText: d.translated_text,
                        }))
                    );
                else setHistory(loadHistory());
            } else setHistory(loadHistory());
        };
        init();
    }, [supabase]);

    useEffect(() => {
        convEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation]);

    const addToHistory = useCallback(
        async (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
            const uuid = crypto.randomUUID();
            const full = { ...entry, id: uuid, timestamp: Date.now() };
            if (user) {
                const { error } = await supabase.from('translation_history').insert({
                    id: uuid,
                    user_id: user.id,
                    original_text: entry.originalText,
                    translated_text: entry.translatedText,
                    source_language: entry.sourceLang,
                    target_language: entry.targetLang,
                    translation_type: entry.mode,
                });
                if (!error) setHistory((prev) => [full, ...prev].slice(0, 50));
            } else {
                setHistory((prev) => {
                    const u = [full, ...prev].slice(0, 50);
                    saveHistory(u);
                    return u;
                });
            }
        },
        [user, supabase]
    );

    const clearHistory = async () => {
        if (user) {
            await supabase.from('translation_history').delete().eq('user_id', user.id);
            setHistory([]);
        } else {
            setHistory([]);
            saveHistory([]);
        }
        toast.success('Translation archive cleared.');
    };

    const deleteEntry = async (id: string) => {
        if (user) {
            await supabase.from('translation_history').delete().match({ id, user_id: user.id });
            setHistory((p) => p.filter((e) => e.id !== id));
        } else {
            setHistory((p) => {
                const u = p.filter((e) => e.id !== id);
                saveHistory(u);
                return u;
            });
        }
    };

    // Voice Core Loop
    const captureSpeech = (lang: string): Promise<string | null> => {
        return new Promise((resolve) => {
            const SRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SRec) return resolve(null);
            const rec = new SRec();
            rec.continuous = false;
            rec.interimResults = false;
            rec.lang = getLangCode(lang);
            recognitionRef.current = rec;
            let result: string | null = null;
            let resolved = false;
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    rec.stop();
                    resolve(null);
                }
            }, 8000);
            rec.onresult = (ev: any) => {
                result = ev.results[0][0].transcript;
            };
            rec.onend = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    resolve(result);
                }
            };
            rec.onerror = (ev: any) => {
                console.error('SR error:', ev.error);
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    resolve(null);
                }
            };
            try {
                rec.start();
            } catch {
                resolve(null);
            }
        });
    };

    const translateText = async (text: string, from: string, to: string) => {
        const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, sourceLang: from, targetLang: to, type: 'translate' }),
        });
        const d = await res.json().catch(() => ({}));
        if (res.status === 401 || d.requiresAuth) {
            setRequiresAuth(true);
            throw new Error('Sign in required to run live AI translation.');
        }
        if (!res.ok) throw new Error(d.error || 'Translation service unavailable');
        return d.translatedText ?? null;
    };

    const speakBrowserTTSAsync = (text: string, lang: string): Promise<void> => {
        return new Promise((resolve) => {
            if (!text || typeof window === 'undefined' || !window.speechSynthesis) return resolve();
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = getLangCode(lang);
            u.rate = 0.95;
            u.onend = () => resolve();
            u.onerror = () => resolve();
            window.speechSynthesis.speak(u);
        });
    };

    const speakWithGemini = async (text: string, voice: string, lang: string) => {
        try {
            const res = await fetch('/api/translate/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice }),
            });
            if (!res.ok) {
                await speakBrowserTTSAsync(text, lang);
                return;
            }
            const { audio } = await res.json();
            if (audio) await playPCMAudio(audio, audioCtxRef);
            else await speakBrowserTTSAsync(text, lang);
        } catch {
            await speakBrowserTTSAsync(text, lang);
        }
    };

    const runConversationLoop = useCallback(async () => {
        const SRec = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
        if (!SRec) {
            setVoiceError('Live microphone speech recognition requires Chrome, Edge, or Safari.');
            setIsConversationActive(false);
            return;
        }
        abortRef.current = false;
        setVoiceError('');
        setRequiresAuth(false);
        let errors = 0;
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        while (!abortRef.current) {
            try {
                let langA = sourceLangRef.current,
                    langB = targetLangRef.current;
                setVoiceStep('listening-A');
                const tA = await captureSpeech(langA);
                if (abortRef.current) break;
                if (!tA) {
                    await new Promise((r) => setTimeout(r, 500));
                    continue;
                }
                setVoiceStep('translating-A');
                const trA = await translateText(tA, langA, langB);
                if (abortRef.current) break;
                if (!trA) {
                    errors++;
                    continue;
                }
                errors = 0;
                setVoiceError('');
                setConversation((p) => [...p, { speaker: 'A', original: tA, translated: trA, voiceName: VOICE_A }]);
                addToHistory({ mode: 'voice', sourceLang: langA, targetLang: langB, originalText: tA, translatedText: trA });
                setVoiceStep('speaking-A');
                await speakWithGemini(trA, VOICE_A, langB);
                await new Promise((r) => setTimeout(r, 800));
                if (abortRef.current) break;

                langA = sourceLangRef.current;
                langB = targetLangRef.current;
                setVoiceStep('listening-B');
                const tB = await captureSpeech(langB);
                if (abortRef.current) break;
                if (!tB) {
                    await new Promise((r) => setTimeout(r, 500));
                    continue;
                }
                setVoiceStep('translating-B');
                const trB = await translateText(tB, langB, langA);
                if (abortRef.current) break;
                if (!trB) {
                    errors++;
                    continue;
                }
                errors = 0;
                setVoiceError('');
                setConversation((p) => [...p, { speaker: 'B', original: tB, translated: trB, voiceName: VOICE_B }]);
                addToHistory({ mode: 'voice', sourceLang: langB, targetLang: langA, originalText: tB, translatedText: trB });
                setVoiceStep('speaking-B');
                await speakWithGemini(trB, VOICE_B, langA);
                await new Promise((r) => setTimeout(r, 800));
            } catch (err: any) {
                errors++;
                setVoiceError(err.message || 'Voice translation interrupted.');
                if (errors >= 3 || err.message?.includes('Sign in')) break;
                await new Promise((r) => setTimeout(r, 1500));
            }
        }
        setVoiceStep('idle');
        setIsConversationActive(false);
    }, [addToHistory]);

    const startConv = () => {
        setIsConversationActive(true);
        runConversationLoop();
    };
    const stopConv = () => {
        abortRef.current = true;
        recognitionRef.current?.stop();
        audioCtxRef.current?.close().catch(() => {});
        audioCtxRef.current = null;
        setVoiceStep('idle');
        setIsConversationActive(false);
    };

    const handleTextTrans = async (overrideText?: string) => {
        const textToTranslate = (overrideText ?? inputText).trim();
        if (!textToTranslate || isTranslating) return;
        if (overrideText !== undefined) setInputText(overrideText);
        setIsTranslating(true);
        setApiError(null);
        setRequiresAuth(false);
        try {
            const res = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToTranslate, sourceLang, targetLang, type: 'translate' }),
            });
            const d = await res.json().catch(() => ({}));
            if (res.ok && d.translatedText) {
                setTranslatedText(d.translatedText);
                addToHistory({ mode: 'text', sourceLang, targetLang, originalText: textToTranslate, translatedText: d.translatedText });
            } else if (res.status === 401 || d.requiresAuth) {
                setRequiresAuth(true);
            } else {
                setApiError(d.error || 'Could not translate text right now. Please try again.');
            }
        } catch {
            setApiError('Network error while contacting LinguaSphere translation service.');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleSwap = () => {
        if (sourceLang === 'Auto-Detect') {
            toast.info('Select a specific source language before swapping.');
            return;
        }
        setSourceLang(targetLang);
        setTargetLang(sourceLang);
        setInputText(translatedText);
        setTranslatedText(inputText);
    };

    const handleImgSelect = (file: File) => {
        setImageFile(file);
        setImageExtracted('');
        setImageTranslated('');
        setApiError(null);
        const r = new FileReader();
        r.onload = (e) => setImagePreview(e.target?.result as string);
        r.readAsDataURL(file);
    };

    const handleImgTrans = async () => {
        if (!imageFile || isImageTranslating) return;
        setIsImageTranslating(true);
        setApiError(null);
        setRequiresAuth(false);
        try {
            const b64 = await fileToBase64(imageFile);
            const res = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'image', imageBase64: b64, imageMimeType: imageFile.type, sourceLang, targetLang }),
            });
            const d = await res.json().catch(() => ({}));
            if (res.ok) {
                setImageExtracted(d.extractedText || '');
                setImageTranslated(d.translatedText || '');
                addToHistory({
                    mode: 'image',
                    sourceLang: d.detectedLanguage || sourceLang,
                    targetLang,
                    originalText: d.extractedText || '',
                    translatedText: d.translatedText || '',
                });
            } else if (res.status === 401 || d.requiresAuth) {
                setRequiresAuth(true);
            } else {
                setApiError(d.error || 'Unable to scan and translate this image.');
            }
        } catch {
            setApiError('Network error while scanning image.');
        } finally {
            setIsImageTranslating(false);
        }
    };

    const copyText = (txt: string) => {
        if (!txt) return;
        navigator.clipboard.writeText(txt);
        setCopied(true);
        toast.success('Copied translation to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    const MODES = [
        { id: 'text', label: 'Text & Phrases', icon: Type },
        { id: 'voice', label: 'Live Voice', icon: Mic },
        { id: 'image', label: 'Menu & Sign OCR', icon: ImageIcon },
    ] as const;

    return (
        <div className="relative min-h-screen pt-28 pb-20 font-body text-slate-200 selection:bg-white/10 overflow-x-clip">
            <AmbientStage />

            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 gap-6">
                    <div className="space-y-3 max-w-2xl">
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full apple-glass-pill"
                        >
                            <Languages className="w-3.5 h-3.5 text-sky-300" />
                            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300">LinguaSphere Traveler AI</span>
                        </motion.div>
                        <h1 className="text-4xl md:text-6xl font-serif font-bold text-white tracking-tight">
                            Traveler Translation
                        </h1>
                        <p className="text-slate-300/80 text-base">
                            Essential travel phrases, bidirectional live speech, and instant camera translation for menus, transit signs, and documents.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowHistory(true)}
                        className="btn-apple-glass h-11 px-5 rounded-full font-medium text-xs inline-flex items-center gap-2 shrink-0"
                    >
                        <History className="w-4 h-4 text-slate-300" />
                        <span>Phrase Archive ({history.length})</span>
                    </button>
                </div>

                {/* Unified Apple Liquid Glass Control Bar */}
                <div className="mb-8 apple-liquid-glass rounded-[28px] p-2.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    <div className="flex p-1 gap-1 rounded-[22px] bg-black/30 border border-white/[0.06] overflow-x-auto">
                        {MODES.map(({ id, label, icon: Icon }) => {
                            const isActive = mode === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => {
                                        if (isConversationActive) stopConv();
                                        setMode(id);
                                        setApiError(null);
                                    }}
                                    className={`relative flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-[18px] text-xs font-medium transition-colors whitespace-nowrap flex-1 sm:flex-initial ${
                                        isActive ? 'text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
                                    }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="translate-mode-pill"
                                            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                                            className="absolute inset-0 rounded-[18px] bg-gradient-to-b from-white via-slate-100 to-slate-200 shadow-md"
                                        />
                                    )}
                                    <Icon className="w-3.5 h-3.5 relative z-10" />
                                    <span className="relative z-10">{label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-center gap-2">
                        <LangSelector value={sourceLang} onChange={setSourceLang} side="left" />
                        <button
                            type="button"
                            onClick={handleSwap}
                            title="Swap Languages"
                            className="w-10 h-10 rounded-2xl apple-glass-pill flex items-center justify-center text-slate-300 hover:text-white hover:scale-105 transition-all"
                        >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                        <LangSelector value={targetLang} onChange={setTargetLang} side="right" excludeAuto />
                    </div>
                </div>

                {/* Auth / Error Feedback */}
                {(requiresAuth || apiError || voiceError) && (
                    <div className="space-y-3 mb-6">
                        {requiresAuth && (
                            <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="apple-liquid-glass rounded-2xl p-5 border border-sky-400/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center shrink-0">
                                        <Lock className="w-4 h-4 text-sky-300" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">Sign in to use LinguaSphere AI Translation</p>
                                        <p className="text-xs text-slate-300/80 mt-0.5">
                                            Sign in or create a free account to translate text, menus, and live conversations across 15+ languages.
                                        </p>
                                    </div>
                                </div>
                                <Link href="/login" className="btn-apple-primary px-5 py-2.5 rounded-full text-xs font-semibold shrink-0">
                                    Sign In →
                                </Link>
                            </motion.div>
                        )}
                        {(apiError || voiceError) && (
                            <div className="p-4 rounded-2xl bg-rose-950/35 border border-rose-500/25 text-rose-200 text-xs flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                                    <span>{apiError || voiceError}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        setApiError(null);
                                        setVoiceError('');
                                    }}
                                    className="text-rose-300 hover:text-white font-mono text-[11px]"
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Main Interaction Area */}
                <AnimatePresence mode="wait">
                    {mode === 'text' && (
                        <motion.div
                            key="text"
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -14 }}
                            className="space-y-6"
                        >
                            {/* 1-Tap Essential Traveler Phrases */}
                            <div className="apple-glass-card rounded-2xl p-4 sm:p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-sky-300" /> 1-Tap Essential Traveler Phrases
                                    </span>
                                    <span className="text-[11px] text-slate-400 hidden sm:inline">Tap any phrase to translate immediately</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {TRAVELER_PHRASES.map((phrase) => (
                                        <button
                                            key={phrase.label}
                                            type="button"
                                            onClick={() => handleTextTrans(phrase.text)}
                                            className="apple-glass-pill px-3.5 py-1.5 rounded-full text-xs text-slate-200 hover:text-white hover:border-white/25 transition-all"
                                        >
                                            {phrase.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="p-6 md:p-8 rounded-[32px] apple-glass-card relative min-h-[300px] flex flex-col">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[11px] font-mono tracking-wider uppercase text-slate-400">
                                            Original ({sourceLang})
                                        </span>
                                        {inputText && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setInputText('');
                                                    setTranslatedText('');
                                                }}
                                                className="text-[11px] font-mono text-slate-400 hover:text-white"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                    <Textarea
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder="Type or paste a phrase, address, or dietary note..."
                                        className="flex-1 bg-transparent border-0 text-xl font-medium text-white placeholder:text-slate-500 p-0 resize-none focus-visible:ring-0 shadow-none leading-relaxed"
                                    />
                                    <div className="mt-6 flex items-center justify-between border-t border-white/[0.08] pt-4">
                                        <button
                                            type="button"
                                            disabled={!inputText}
                                            onClick={() => speakBrowserTTSAsync(inputText, sourceLang)}
                                            className="btn-apple-glass px-3.5 py-2 rounded-full text-xs inline-flex items-center gap-1.5 disabled:opacity-40"
                                        >
                                            <Volume2 className="w-3.5 h-3.5" /> Listen
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleTextTrans()}
                                            disabled={isTranslating || !inputText.trim()}
                                            className="h-11 px-6 rounded-full btn-apple-primary font-semibold text-xs inline-flex items-center gap-2 disabled:opacity-45"
                                        >
                                            {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Translate →'}
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 md:p-8 rounded-[32px] apple-glass-card border-white/[0.14] relative min-h-[300px] flex flex-col">
                                    <span className="text-[11px] font-mono tracking-wider uppercase text-sky-300 mb-4 block">
                                        Translation ({targetLang})
                                    </span>
                                    <div className="flex-1 flex flex-col justify-center">
                                        {isTranslating ? (
                                            <div className="flex items-center gap-3 text-slate-300 text-sm">
                                                <Loader2 className="w-5 h-5 animate-spin text-sky-300" />
                                                <span>Translating into {targetLang}…</span>
                                            </div>
                                        ) : translatedText ? (
                                            <p className="text-2xl md:text-3xl font-serif font-bold text-white leading-snug">{translatedText}</p>
                                        ) : (
                                            <p className="text-sm text-slate-500">
                                                Your {targetLang} translation will appear here—large and clear enough to show a local driver, waiter, or concierge.
                                            </p>
                                        )}
                                    </div>
                                    <div className="mt-6 flex items-center justify-between border-t border-white/[0.08] pt-4">
                                        <button
                                            type="button"
                                            disabled={!translatedText}
                                            onClick={() => speakBrowserTTSAsync(translatedText, targetLang)}
                                            className="btn-apple-glass px-4 py-2 rounded-full text-xs inline-flex items-center gap-1.5 disabled:opacity-40"
                                        >
                                            <Volume2 className="w-3.5 h-3.5" /> Speak Aloud
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!translatedText}
                                            onClick={() => copyText(translatedText)}
                                            className="btn-apple-glass px-3.5 py-2 rounded-full text-xs inline-flex items-center gap-1.5 disabled:opacity-40"
                                        >
                                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                                            <span>{copied ? 'Copied' : 'Copy'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {mode === 'voice' && (
                        <motion.div
                            key="voice"
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -14 }}
                            className="apple-glass-card rounded-[32px] p-8 md:p-12 flex flex-col items-center gap-8"
                        >
                            <div className="text-center max-w-md space-y-1.5">
                                <h3 className="text-xl font-serif font-bold text-white">Bidirectional Interpreter</h3>
                                <p className="text-xs text-slate-300/80 leading-relaxed">
                                    Tap the microphone once to start an automatic turn-by-turn conversation between <strong className="text-white">{sourceLang}</strong> and <strong className="text-white">{targetLang}</strong>.
                                </p>
                            </div>

                            <AcousticSphere active={isConversationActive} step={voiceStep} />

                            <div className="flex flex-col items-center gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={isConversationActive ? stopConv : startConv}
                                    className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl ${
                                        isConversationActive
                                            ? 'bg-rose-500/20 border border-rose-400/50 text-rose-200 ring-4 ring-rose-500/15'
                                            : 'btn-apple-primary'
                                    }`}
                                >
                                    {isConversationActive ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-6 h-6" />}
                                </motion.button>
                                <div className="text-center space-y-1">
                                    <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400">
                                        {isConversationActive ? 'Tap to Stop Session' : 'Tap to Start Listening'}
                                    </span>
                                    <p className="text-xs font-mono font-semibold text-sky-300 uppercase">{voiceStep.replace('-', ' ')}</p>
                                </div>
                            </div>

                            {/* Transcript Stage */}
                            {conversation.length > 0 && (
                                <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/[0.08]">
                                    <div className="space-y-3">
                                        <span className="text-[11px] font-mono text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-sky-400" /> You ({sourceLang})
                                        </span>
                                        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                                            {conversation
                                                .filter((c) => c.speaker === 'A')
                                                .map((c, i) => (
                                                    <div key={i} className="p-4 rounded-2xl border border-white/[0.08] bg-slate-950/60 space-y-1.5">
                                                        <p className="text-xs text-slate-400">{c.original}</p>
                                                        <p className="text-sm font-medium text-white">↳ {c.translated}</p>
                                                    </div>
                                                ))}
                                            <div ref={convEndRef} />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <span className="text-[11px] font-mono text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400" /> Partner ({targetLang})
                                        </span>
                                        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                                            {conversation
                                                .filter((c) => c.speaker === 'B')
                                                .map((c, i) => (
                                                    <div key={i} className="p-4 rounded-2xl border border-white/[0.08] bg-slate-950/60 space-y-1.5">
                                                        <p className="text-xs text-slate-400">{c.original}</p>
                                                        <p className="text-sm font-medium text-white">↳ {c.translated}</p>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {mode === 'image' && (
                        <motion.div key="image" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`rounded-[32px] border border-dashed apple-glass-card transition-all cursor-pointer flex flex-col items-center justify-center p-10 min-h-[320px] group ${
                                    imagePreview ? 'border-white/[0.22]' : 'border-white/[0.14] hover:border-white/[0.28]'
                                }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) handleImgSelect(e.target.files[0]);
                                    }}
                                />
                                {imagePreview ? (
                                    <div className="relative w-full max-w-xl">
                                        <img src={imagePreview} className="w-full max-h-[380px] object-contain rounded-2xl shadow-2xl mx-auto" alt="Selected menu or sign" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                                            <span className="apple-liquid-glass px-4 py-2 rounded-full text-xs font-medium text-white">
                                                Choose Different Photo
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-4">
                                        <div className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/[0.12] flex items-center justify-center mx-auto shadow-lg group-hover:scale-105 transition-transform">
                                            <Camera className="w-7 h-7 text-sky-300" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-serif font-bold text-white mb-1">Menu, Street Sign &amp; Ticket Scanner</h3>
                                            <p className="text-slate-300/80 text-xs">
                                                Upload or snap a photo of any restaurant menu, train board, or hotel notice to extract &amp; translate into {targetLang}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {imagePreview && !imageTranslated && (
                                <div className="flex justify-center">
                                    <button
                                        onClick={handleImgTrans}
                                        disabled={isImageTranslating}
                                        className="h-13 px-9 rounded-full btn-apple-primary font-semibold text-sm inline-flex items-center gap-2"
                                    >
                                        {isImageTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                        <span>{isImageTranslating ? 'Scanning & Translating…' : `Translate Photo into ${targetLang}`}</span>
                                    </button>
                                </div>
                            )}

                            {imageTranslated && (
                                <motion.div
                                    initial={{ opacity: 0, y: 14 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4"
                                >
                                    <div className="p-6 rounded-[28px] apple-glass-card space-y-3">
                                        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Detected Text</span>
                                        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{imageExtracted}</p>
                                    </div>
                                    <div className="p-6 rounded-[28px] apple-glass-card border-white/[0.16] space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] font-mono text-sky-300 uppercase tracking-wider">
                                                Translated ({targetLang})
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => copyText(imageTranslated)}
                                                className="btn-apple-glass px-3 py-1.5 rounded-full text-xs inline-flex items-center gap-1.5"
                                            >
                                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                                                <span>{copied ? 'Copied' : 'Copy'}</span>
                                            </button>
                                        </div>
                                        <p className="text-xl md:text-2xl font-serif font-bold text-white leading-snug whitespace-pre-wrap">
                                            {imageTranslated}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <HistoryPanel
                open={showHistory}
                onClose={() => setShowHistory(false)}
                entries={history}
                onClear={clearHistory}
                onDelete={deleteEntry}
                onSelect={(entry) => {
                    setMode('text');
                    setSourceLang(entry.sourceLang);
                    setTargetLang(entry.targetLang === 'Auto-Detect' ? 'English' : entry.targetLang);
                    setInputText(entry.originalText);
                    setTranslatedText(entry.translatedText);
                }}
            />
        </div>
    );
}
