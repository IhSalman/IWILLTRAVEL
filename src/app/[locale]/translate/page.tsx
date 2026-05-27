'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Languages, Mic, Type, Image as ImageIcon,
    ArrowRightLeft, Volume2, Copy, History, X, Trash2,
    ChevronDown, Upload, Camera, Check, Loader2, Zap,
    RefreshCw, Play, Square, Sparkles, Globe, Cpu, Radio, Activity, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';

// ── Types & Constants ─────────────────────────────────────────────────────────
interface HistoryEntry {
    id: string; timestamp: number; mode: 'text' | 'voice' | 'image';
    sourceLang: string; targetLang: string; originalText: string; translatedText: string;
}
interface ConvEntry { speaker: 'A' | 'B'; original: string; translated: string; voiceName: string; }
type VoiceStep = 'idle' | 'listening-A' | 'translating-A' | 'speaking-A' | 'listening-B' | 'translating-B' | 'speaking-B';

const COMMON_LANGUAGES = [
    'Auto-Detect', 'English', 'Japanese', 'Spanish', 'French', 'German',
    'Italian', 'Portuguese', 'Chinese (Simplified)', 'Chinese (Traditional)',
    'Korean', 'Arabic', 'Russian', 'Hindi', 'Thai', 'Vietnamese',
];

const VOICE_MAP: Record<string, string> = {
    'en-US': 'en-US', 'English': 'en-US', 'Japanese': 'ja-JP', 'Spanish': 'es-ES', 'French': 'fr-FR',
    'German': 'de-DE', 'Italian': 'it-IT', 'Portuguese': 'pt-PT', 'Chinese (Simplified)': 'zh-CN', 'Chinese (Traditional)': 'zh-TW',
    'Korean': 'ko-KR', 'Arabic': 'ar-SA', 'Russian': 'ru-RU', 'Hindi': 'hi-IN', 'Thai': 'th-TH', 'Vietnamese': 'vi-VN',
    'Auto-Detect': 'en-US',
};

const VOICE_A = 'Puck'; const VOICE_B = 'Kore';
const HISTORY_KEY = 'linguasphere_history';

// ── Background Components ───────────────────────────────────────────────────
const ImmersiveHubStage = () => (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#03080F]">
        <div className="absolute inset-0 bg-[#03080F]" />
        <motion.div
            animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
                x: [0, 50, 0],
                y: [0, 30, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] rounded-full bg-[#00D4FF]/10 blur-[150px] mix-blend-screen"
        />
        <motion.div
            animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.2, 0.4, 0.2],
                x: [0, -40, 0],
                y: [0, -60, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear", delay: 2 }}
            className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-[#6366F1]/10 blur-[180px] mix-blend-screen"
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.08] mix-blend-overlay" />
    </div>
);

const AuraSphere = ({ active, step }: { active: boolean; step: VoiceStep }) => {
    const color = step.includes('A') ? '#FF007F' : step.includes('B') ? '#00FFB3' : '#00D4FF';
    
    return (
        <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Core Glow */}
            <motion.div
                animate={{
                    scale: active ? [1, 1.2, 1] : 1,
                    opacity: active ? [0.4, 0.6, 0.4] : 0.2,
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full blur-[60px]"
                style={{ backgroundColor: color }}
            />
            
            {/* Rotating Rings */}
            <AnimatePresence>
                {active && (
                    <>
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1, rotate: 360 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-2 rounded-full border border-dashed border-white/20"
                        />
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1, rotate: -360 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-8 rounded-full border border-white/10"
                        />
                    </>
                )}
            </AnimatePresence>

            {/* Main Orb */}
            <motion.div
                animate={active ? {
                    scale: [1, 1.05, 1],
                    boxShadow: [
                        `0 0 40px ${color}40`,
                        `0 0 80px ${color}60`,
                        `0 0 40px ${color}40`
                    ]
                } : { scale: 1 }}
                transition={{ duration: 2, repeat: Infinity }}
                className="relative w-32 h-32 rounded-full bg-white/5 backdrop-blur-2xl border border-white/20 flex items-center justify-center z-10 shadow-2xl"
            >
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                {step.includes('listening') ? (
                    <div className="flex gap-1 items-center">
                        {[0, 1, 2].map(i => (
                            <motion.div
                                key={i}
                                animate={{ height: [8, 24, 8] }}
                                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                                className="w-1 rounded-full"
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                ) : step.includes('translating') ? (
                    <RefreshCw className="w-8 h-8 text-white animate-spin opacity-50" />
                ) : step.includes('speaking') ? (
                    <Activity className="w-8 h-8 text-white animate-pulse" />
                ) : (
                    <Radio className="w-8 h-8 text-white/20" />
                )}
            </motion.div>
        </div>
    );
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function loadHistory(): HistoryEntry[] {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(entries: HistoryEntry[]) { localStorage.setItem(HISTORY_KEY, JSON.stringify(entries)); }
function getLangCode(lang: string): string { return VOICE_MAP[lang] || 'en-US'; }
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject; reader.readAsDataURL(file);
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
function HistoryPanel({ open, onClose, entries, onClear, onDelete }: any) {
    const modeIcon = (m: string) => m === 'voice' ? '🎙️' : m === 'image' ? '🖼️' : '✏️';
    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]" onClick={onClose} />
                    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring' as const, damping: 26, stiffness: 280 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md z-[70] bg-[#03080f]/95 backdrop-blur-3xl border-l border-white/10 flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-6 border-b border-white/10">
                            <h2 className="text-xl font-black text-white tracking-widest uppercase">Journal Log</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {entries.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-white/20 gap-4 opacity-50">
                                    <History className="w-16 h-16" />
                                    <p className="text-sm font-bold tracking-[0.3em] uppercase">No Transmissions</p>
                                </div>
                            ) : (
                                [...entries].reverse().map(entry => (
                                    <div key={entry.id} className="rounded-3xl bg-white/5 border border-white/5 p-5 group flex flex-col gap-3">
                                        <div className="flex items-center justify-between text-[10px] font-black tracking-widest uppercase">
                                            <span className="text-[#00D4FF]">{entry.sourceLang} → {entry.targetLang}</span>
                                            <span className="text-white/20">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-white/50">{entry.originalText}</p>
                                            <p className="text-base font-bold text-white leading-tight">{entry.translatedText}</p>
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

function LangSelector({ value, onChange, side }: { value: string; onChange: (v: string) => void; side: 'left' | 'right' }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button onClick={() => setOpen(!open)}
                className={`group flex items-center gap-3 px-6 py-3 rounded-full glass-premium border-white/10 hover:border-white/30 transition-all ${value === 'Select Language' ? 'text-[#00D4FF]' : 'text-white'}`}>
                <span className="text-[10px] font-black tracking-[0.2em] uppercase opacity-50">{side === 'left' ? 'FROM' : 'TO'}</span>
                <span className="text-sm font-black uppercase tracking-widest">{value}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-500 ${open ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full mt-4 z-[80] w-64 rounded-[32px] overflow-hidden shadow-2xl bg-[#0a1628]/95 backdrop-blur-3xl border border-white/10 p-2">
                        <div className="max-h-80 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                            {COMMON_LANGUAGES.map(lang => (
                                <button key={lang} onClick={() => { onChange(lang); setOpen(false); }}
                                    className={`w-full text-left px-5 py-3 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all ${value === lang ? 'bg-[#00D4FF] text-black' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}>
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
    const [mode, setMode] = useState<'text' | 'voice' | 'image'>('voice');
    const [sourceLang, setSourceLang] = useState('Select Language');
    const [targetLang, setTargetLang] = useState('Select Language');
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [copied, setCopied] = useState(false);
    const [user, setUser] = useState<any>(null);
    const supabase = createClient();

    const sourceLangRef = useRef(sourceLang); const targetLangRef = useRef(targetLang);
    useEffect(() => { sourceLangRef.current = sourceLang; }, [sourceLang]);
    useEffect(() => { targetLangRef.current = targetLang; }, [targetLang]);

    const [inputText, setInputText] = useState(''); const [translatedText, setTranslatedText] = useState('');
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
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                const { data } = await supabase.from('translation_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
                if (data) setHistory(data.map(d => ({ id: d.id, timestamp: new Date(d.created_at).getTime(), mode: d.translation_type as any, sourceLang: d.source_language, targetLang: d.target_language, originalText: d.original_text, translatedText: d.translated_text })));
                else setHistory(loadHistory());
            } else setHistory(loadHistory());
        }; init();
    }, [supabase]);

    useEffect(() => { convEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversation]);

    const addToHistory = useCallback(async (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
        const uuid = crypto.randomUUID(); const full = { ...entry, id: uuid, timestamp: Date.now() };
        if (user) {
            const { error } = await supabase.from('translation_history').insert({ id: uuid, user_id: user.id, original_text: entry.originalText, translated_text: entry.translatedText, source_language: entry.sourceLang, target_language: entry.targetLang, translation_type: entry.mode });
            if (!error) setHistory(prev => [full, ...prev].slice(0, 50));
        } else { setHistory(prev => { const u = [full, ...prev].slice(0, 50); saveHistory(u); return u; }); }
    }, [user, supabase]);

    const clearHistory = async () => { if (user) { await supabase.from('translation_history').delete().eq('user_id', user.id); setHistory([]); } else { setHistory([]); saveHistory([]); } };
    const deleteEntry = async (id: string) => { if (user) { await supabase.from('translation_history').delete().match({ id, user_id: user.id }); setHistory(p => p.filter(e => e.id !== id)); } else { setHistory(p => { const u = p.filter(e => e.id !== id); saveHistory(u); return u; }); } };

    // Voice Core Loop
    const captureSpeech = (lang: string): Promise<string | null> => {
        return new Promise(resolve => {
            const SRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SRec) return resolve(null);
            const rec = new SRec();
            rec.continuous = false; rec.interimResults = false; rec.lang = getLangCode(lang);
            recognitionRef.current = rec;
            let result: string | null = null; let resolved = false;
            const timeout = setTimeout(() => { if (!resolved) { resolved = true; rec.stop(); resolve(null); } }, 8000);
            rec.onresult = (ev: any) => { result = ev.results[0][0].transcript; };
            rec.onend = () => { if (!resolved) { resolved = true; clearTimeout(timeout); resolve(result); } };
            rec.onerror = (ev: any) => { console.error('SR error:', ev.error); if (!resolved) { resolved = true; clearTimeout(timeout); resolve(null); } };
            try { rec.start(); } catch { resolve(null); }
        });
    };
    const translateText = async (text: string, from: string, to: string) => {
        const res = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, sourceLang: from, targetLang: to, type: 'translate' }) });
        const d = await res.json(); if (!res.ok) throw new Error(d.error || 'Err'); return d.translatedText ?? null;
    };
    const speakBrowserTTSAsync = (text: string, lang: string): Promise<void> => {
        return new Promise(resolve => {
            if (!window.speechSynthesis) return resolve();
            window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = getLangCode(lang); u.rate = 0.95;
            u.onend = () => resolve(); u.onerror = () => resolve(); window.speechSynthesis.speak(u);
        });
    };
    const speakWithGemini = async (text: string, voice: string, lang: string) => {
        try {
            const res = await fetch('/api/translate/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice }) });
            if (!res.ok) { await speakBrowserTTSAsync(text, lang); return; }
            const { audio } = await res.json(); if (audio) await playPCMAudio(audio, audioCtxRef); else await speakBrowserTTSAsync(text, lang);
        } catch { await speakBrowserTTSAsync(text, lang); }
    };
    const runConversationLoop = useCallback(async () => {
        abortRef.current = false; setVoiceError(''); let errors = 0;
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
        while (!abortRef.current) {
            try {
                let langA = sourceLangRef.current, langB = targetLangRef.current;
                setVoiceStep('listening-A'); const tA = await captureSpeech(langA); if (abortRef.current) break; if (!tA) { await new Promise(r => setTimeout(r, 500)); continue; }
                setVoiceStep('translating-A'); const trA = await translateText(tA, langA, langB); if (abortRef.current) break; if (!trA) { errors++; continue; }
                errors = 0; setVoiceError(''); setConversation(p => [...p, { speaker: 'A', original: tA, translated: trA, voiceName: VOICE_A }]); addToHistory({ mode: 'voice', sourceLang: langA, targetLang: langB, originalText: tA, translatedText: trA });
                setVoiceStep('speaking-A'); await speakWithGemini(trA, VOICE_A, langB); await new Promise(r => setTimeout(r, 800)); if (abortRef.current) break;

                langA = sourceLangRef.current; langB = targetLangRef.current;
                setVoiceStep('listening-B'); const tB = await captureSpeech(langB); if (abortRef.current) break; if (!tB) { await new Promise(r => setTimeout(r, 500)); continue; }
                setVoiceStep('translating-B'); const trB = await translateText(tB, langB, langA); if (abortRef.current) break; if (!trB) { errors++; continue; }
                errors = 0; setVoiceError(''); setConversation(p => [...p, { speaker: 'B', original: tB, translated: trB, voiceName: VOICE_B }]); addToHistory({ mode: 'voice', sourceLang: langB, targetLang: langA, originalText: tB, translatedText: trB });
                setVoiceStep('speaking-B'); await speakWithGemini(trB, VOICE_B, langA); await new Promise(r => setTimeout(r, 800));
            } catch (err: any) { errors++; setVoiceError(err.message); if (errors >= 3) break; await new Promise(r => setTimeout(r, 1500)); }
        }
        setVoiceStep('idle'); setIsConversationActive(false);
    }, [addToHistory]);

    const startConv = () => { setIsConversationActive(true); runConversationLoop(); };
    const stopConv = () => { abortRef.current = true; recognitionRef.current?.stop(); audioCtxRef.current?.close().catch(() => { }); audioCtxRef.current = null; setVoiceStep('idle'); setIsConversationActive(false); };

    const handleTextTrans = async () => { if (!inputText.trim() || isTranslating) return; setIsTranslating(true); try { const res = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: inputText, sourceLang, targetLang, type: 'translate' }) }); const d = await res.json(); if (res.ok) { setTranslatedText(d.translatedText); addToHistory({ mode: 'text', sourceLang, targetLang, originalText: inputText, translatedText: d.translatedText }); } } catch { } finally { setIsTranslating(false); } };
    const handleSwap = () => { if (sourceLang === 'Auto-Detect') return; setSourceLang(targetLang); setTargetLang(sourceLang); setInputText(translatedText); setTranslatedText(inputText); };
    const handleImgSelect = (file: File) => { setImageFile(file); setImageExtracted(''); setImageTranslated(''); const r = new FileReader(); r.onload = e => setImagePreview(e.target?.result as string); r.readAsDataURL(file); };
    const handleImgTrans = async () => { if (!imageFile || isImageTranslating) return; setIsImageTranslating(true); try { const b64 = await fileToBase64(imageFile); const res = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'image', imageBase64: b64, imageMimeType: imageFile.type, sourceLang, targetLang }) }); const d = await res.json(); if (res.ok) { setImageExtracted(d.extractedText || ''); setImageTranslated(d.translatedText || ''); addToHistory({ mode: 'image', sourceLang: d.detectedLanguage || sourceLang, targetLang, originalText: d.extractedText || '', translatedText: d.translatedText || '' }); } } catch { } finally { setIsImageTranslating(false); } };
    const copyText = (txt: string) => { navigator.clipboard.writeText(txt); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    
    const MODES = [
        { id: 'voice', label: 'Neural Voice', icon: Mic },
        { id: 'text', label: 'Pattern Decrypt', icon: Type },
        { id: 'image', label: 'Vision Matrix', icon: ImageIcon }
    ] as const;

    return (
        <div className="relative min-h-screen pt-32 pb-24 font-sans selection:bg-[#00D4FF]/30 overflow-hidden">
            <ImmersiveHubStage />
            
            <div className="relative z-10 max-w-5xl mx-auto px-6">
                {/* Modern Header */}
                <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8">
                    <div className="space-y-6 max-w-2xl">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-premium border-white/5">
                            <Cpu className="w-4 h-4 text-[#00D4FF]" />
                            <span className="text-[10px] font-black tracking-[0.3em] uppercase text-white/60">Quantum Linguistic Hub</span>
                        </motion.div>
                        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="text-6xl md:text-8xl font-black text-white tracking-tighter italic leading-[0.8]">
                            Omni <br /><span className="text-[#00D4FF]">Linguist.</span>
                        </motion.h1>
                    </div>
                    
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                        <Button onClick={() => setShowHistory(true)} className="h-16 px-8 rounded-full glass-premium border-white/10 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all">
                            <History className="w-5 h-5 mr-3 text-[#00D4FF]" />
                            Transmission Archive
                        </Button>
                    </motion.div>
                </div>

                {/* Unified Control Bar */}
                <div className="mb-12 space-y-8">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 p-4 rounded-[40px] glass-premium border-white/5 shadow-2xl">
                        <div className="flex p-1 gap-1 rounded-full bg-black/20 border border-white/5 backdrop-blur-md">
                            {MODES.map(({ id, label, icon: Icon }) => (
                                <button key={id} onClick={() => { if (isConversationActive) stopConv(); setMode(id as any); }}
                                    className={`relative flex items-center gap-2 px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${mode === id ? 'text-black' : 'text-white/40 hover:text-white'}`}>
                                    {mode === id && <motion.div layoutId="modetab" className="absolute inset-0 rounded-full bg-[#00D4FF]" />}
                                    <Icon className="w-4 h-4 relative z-10" />
                                    <span className="relative z-10">{label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-4 pr-4">
                            <LangSelector value={sourceLang} onChange={setSourceLang} side="left" />
                            <motion.button whileHover={{ rotate: 180 }} onClick={handleSwap}
                                className="w-12 h-12 rounded-full glass-premium border-white/10 flex items-center justify-center text-[#00D4FF] shadow-xl">
                                <ArrowRightLeft className="w-5 h-5" />
                            </motion.button>
                            <LangSelector value={targetLang} onChange={setTargetLang} side="right" />
                        </div>
                    </div>
                </div>

                {/* Main Interaction Area */}
                <AnimatePresence mode="wait">
                    {mode === 'voice' && (
                        <motion.div key="voice" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                            className="flex flex-col items-center gap-12">
                            
                            <AuraSphere active={isConversationActive} step={voiceStep} />
                            
                            <div className="flex flex-col items-center gap-6">
                                <motion.button whileHover={sourceLang !== 'Select Language' ? { scale: 1.05 } : {}} whileTap={{ scale: 0.95 }}
                                    onClick={isConversationActive ? stopConv : startConv}
                                    disabled={sourceLang === 'Select Language'}
                                    className={`w-24 h-24 rounded-full flex flex-col items-center justify-center gap-2 border transition-all duration-500 shadow-2xl ${
                                        sourceLang === 'Select Language' ? 'bg-white/5 border-white/10 text-white/20' :
                                        isConversationActive ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-[#00D4FF]/20 border-[#00D4FF] text-[#00D4FF]'
                                    }`}>
                                    {isConversationActive ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-8 h-8" />}
                                </motion.button>
                                <div className="text-center space-y-1">
                                    <span className="text-[10px] font-black tracking-[0.4em] uppercase text-white/20">Protocol Status</span>
                                    <p className="text-sm font-bold text-white uppercase tracking-widest">{voiceStep.replace('-', ' ')}</p>
                                </div>
                            </div>

                            {/* Transcript Stage */}
                            {conversation.length > 0 && (
                                <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                                    <div className="space-y-4">
                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#00D4FF]" /> Transmission A</span>
                                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {conversation.filter(c => c.speaker === 'A').map((c, i) => (
                                                <div key={i} className="glass-premium p-6 rounded-[32px] border-white/5 space-y-2">
                                                    <p className="text-xs text-white/40">{c.original}</p>
                                                    <p className="text-base font-black text-white leading-tight">↳ {c.translated}</p>
                                                </div>
                                            ))}
                                            <div ref={convEndRef} />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#00FFB3]" /> Transmission B</span>
                                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {conversation.filter(c => c.speaker === 'B').map((c, i) => (
                                                <div key={i} className="glass-premium p-6 rounded-[32px] border-white/5 space-y-2">
                                                    <p className="text-xs text-white/40">{c.original}</p>
                                                    <p className="text-base font-black text-white leading-tight">↳ {c.translated}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {mode === 'text' && (
                        <motion.div key="text" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="p-8 rounded-[48px] glass-premium border-white/5 backdrop-blur-2xl shadow-2xl relative min-h-[300px] flex flex-col">
                                    <span className="text-[10px] font-black tracking-[0.3em] uppercase text-white/20 mb-4 block">Source Data</span>
                                    <Textarea value={inputText} onChange={e => setInputText(e.target.value)} 
                                        placeholder="Input neural stream..." 
                                        className="flex-1 bg-transparent border-0 text-2xl font-black text-white placeholder:text-white/10 p-0 resize-none focus-visible:ring-0 shadow-none leading-tight" />
                                    <div className="mt-8 flex items-center justify-between">
                                        <Button variant="ghost" onClick={() => speakBrowserTTSAsync(inputText, sourceLang)} className="text-white/20 hover:text-white hover:bg-white/5 rounded-full px-6">Listen</Button>
                                        <Button onClick={handleTextTrans} disabled={isTranslating || !inputText} className="h-14 px-10 rounded-full bg-[#00D4FF] text-black font-black uppercase tracking-widest text-[10px]">
                                            {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Execute Decryption'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="p-8 rounded-[48px] glass-premium border-[#00D4FF]/20 bg-[#00D4FF]/[0.03] backdrop-blur-3xl shadow-[0_0_50px_rgba(0,212,255,0.1)] relative min-h-[300px] flex flex-col">
                                    <span className="text-[10px] font-black tracking-[0.3em] uppercase text-[#00D4FF] mb-4 block">Neural Translation</span>
                                    <div className="flex-1">
                                        {translatedText ? (
                                            <p className="text-3xl font-black text-white leading-[0.9]">{translatedText}</p>
                                        ) : (
                                            <div className="space-y-2 opacity-10">
                                                <div className="h-4 w-full bg-white rounded-full" />
                                                <div className="h-4 w-2/3 bg-white rounded-full" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-8 flex items-center justify-between">
                                        <Button variant="ghost" onClick={() => speakBrowserTTSAsync(translatedText, targetLang)} className="text-white/20 hover:text-white hover:bg-white/5 rounded-full px-6">Listen Output</Button>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" onClick={() => copyText(translatedText)} className="w-12 h-12 rounded-full text-white/20 hover:text-[#00D4FF] transition-all">
                                                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {mode === 'image' && (
                        <motion.div key="image" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                            className="space-y-8">
                            <div onClick={() => fileInputRef.current?.click()}
                                className={`rounded-[64px] border-2 border-dashed glass-premium transition-all duration-500 cursor-pointer flex flex-col items-center justify-center p-12 min-h-[400px] group ${
                                    imagePreview ? 'border-[#00D4FF]/40' : 'border-white/10 hover:border-[#00D4FF]/50'
                                }`}>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImgSelect(e.target.files?.[0]); }} />
                                {imagePreview ? (
                                    <div className="relative w-full max-w-2xl">
                                        <img src={imagePreview} className="w-full rounded-[40px] shadow-2xl transition-transform group-hover:scale-[1.02]" alt="Preview" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[40px]">
                                            <span className="text-[10px] font-black text-white tracking-[0.5em] uppercase">Recalibrate Scan</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-6">
                                        <div className="w-24 h-24 rounded-[32px] glass-premium flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 transition-transform">
                                            <Camera className="w-10 h-10 text-[#00D4FF]" />
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Visual Decryption</h3>
                                            <p className="text-white/30 font-medium">Mount image data to the neural stage</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {imagePreview && !imageTranslated && (
                                <div className="flex justify-center">
                                    <Button onClick={handleImgTrans} disabled={isImageTranslating} 
                                        className="h-20 px-16 rounded-full bg-[#00D4FF] text-black font-black uppercase tracking-widest text-lg shadow-[0_0_50px_rgba(0,212,255,0.4)] hover:scale-105 transition-all">
                                        {isImageTranslating ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Zap className="w-6 h-6 mr-3" />} Initiate Vision Scan
                                    </Button>
                                </div>
                            )}

                            {imageTranslated && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                    className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                                    <div className="p-8 rounded-[48px] glass-premium border-white/5 space-y-4">
                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Extracted Metadata</span>
                                        <p className="text-lg text-white font-medium leading-relaxed">{imageExtracted}</p>
                                    </div>
                                    <div className="p-8 rounded-[48px] glass-premium border-[#00D4FF]/20 bg-[#00D4FF]/[0.03] space-y-6">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-[#00D4FF] uppercase tracking-[0.3em]">Neural Output</span>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" onClick={() => copyText(imageTranslated)} className="w-10 h-10 rounded-full text-[#00D4FF]/40 hover:text-[#00D4FF]">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button>
                                            </div>
                                        </div>
                                        <p className="text-3xl font-black text-white leading-tight italic">{imageTranslated}</p>
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
            />
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,212,255,0.1); }
            `}</style>
        </div>
    );
}
