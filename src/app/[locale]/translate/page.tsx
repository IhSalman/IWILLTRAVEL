'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Languages, Mic, Type, Image as ImageIcon,
    ArrowRightLeft, Volume2, Copy, History, X, Trash2,
    ChevronDown, Upload, Camera, Check, Loader2, Zap,
    RefreshCw, Play, Square, Sparkles
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

// ── Web Audio PCM ─────────────────────────────────────────────────────────────
async function playPCMAudio(base64Data: string, audioCtxRef: React.MutableRefObject<AudioContext | null>): Promise<void> {
    return new Promise((resolve) => {
        try {
            if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
            const ctx = audioCtxRef.current;
            const binary = atob(base64Data); const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const dataInt16 = new Int16Array(bytes.buffer);
            const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
            const channelData = buffer.getChannelData(0);
            for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
            const source = ctx.createBufferSource();
            source.buffer = buffer; source.connect(ctx.destination);
            source.onended = () => resolve(); source.start();
        } catch (err) { console.error(err); resolve(); }
    });
}

// ── UI Components ─────────────────────────────────────────────────────────────
function HistoryPanel({ open, onClose, entries, onClear, onDelete }: any) {
    const modeIcon = (m: string) => m === 'voice' ? '🎙️' : m === 'image' ? '🖼️' : '✏️';
    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md z-40" onClick={onClose} />
                    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                        className="fixed right-0 top-0 h-full w-full max-w-sm z-50 bg-[#03080f]/90 backdrop-blur-2xl border-l border-white/10 flex flex-col shadow-[0_0_50px_rgba(0,195,255,0.1)]">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
                            <div className="flex items-center gap-2">
                                <History className="w-5 h-5 text-[#00D4FF]" />
                                <h2 className="font-bold text-white tracking-tight">Transmission Log</h2>
                                <span className="text-xs font-semibold bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 px-2 py-0.5 rounded-full">{entries.length}</span>
                            </div>
                            <div className="flex gap-2">
                                {entries.length > 0 && (
                                    <button onClick={onClear} className="p-1.5 rounded-xl text-white/40 hover:text-[#FF007F] hover:bg-[#FF007F]/10 transition-all font-medium text-xs flex items-center gap-1">
                                        <Trash2 className="w-4 h-4" /> Clear
                                    </button>
                                )}
                                <button onClick={onClose} className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                            {entries.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-white/30 gap-4">
                                    <History className="w-12 h-12 opacity-20" />
                                    <p className="text-sm font-semibold">No history yet</p>
                                </div>
                            ) : (
                                [...entries].reverse().map(entry => (
                                    <motion.div layout key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className="rounded-2xl bg-white/5 border border-white/10 p-4 group relative overflow-hidden">
                                        <div className="flex items-start justify-between mb-3 text-white/80">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">{modeIcon(entry.mode)}</div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-[#00D4FF]">{entry.sourceLang} → {entry.targetLang}</span>
                                                    <span className="text-[10px] text-white/30">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                            <button onClick={() => onDelete(entry.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/30 hover:text-[#FF007F] transition-all"><X className="w-3.5 h-3.5" /></button>
                                        </div>
                                        <div className="space-y-2 pl-11">
                                            <p className="text-sm text-white/60 font-medium">{entry.originalText}</p>
                                            <p className="text-sm text-[#00FFB3] font-bold">{entry.translatedText}</p>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function LangSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button onClick={() => setOpen(!open)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-all 
                           ${value === 'Select Language' ? 'bg-[#FFB300]/10 border-[#FFB300]/30 text-[#FFB300]' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]'}`}>
                {value} <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full mt-2 z-50 w-56 rounded-2xl overflow-hidden shadow-2xl bg-[#0a1628]/95 backdrop-blur-xl border border-white/15">
                        <div className="max-h-64 overflow-y-auto py-2">
                            {COMMON_LANGUAGES.map(lang => (
                                <button key={lang} onClick={() => { onChange(lang); setOpen(false); }}
                                    className={`w-full text-left px-5 py-3 text-sm font-medium transition-colors ${value === lang ? 'bg-[#00D4FF]/20 text-[#00D4FF] border-l-2 border-[#00D4FF]' : 'text-white/70 hover:bg-white/10'}`}>
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

function PulsingRing({ active, color = 'sky' }: { active: boolean; color?: 'sky' | 'pink' | 'emerald' }) {
    const borderColor = color === 'pink' ? 'border-[#FF007F]' : color === 'emerald' ? 'border-[#00FFB3]' : 'border-[#00D4FF]';
    return (
        <div className="absolute inset-0 rounded-full pointer-events-none">
            {active && (
                <>
                    <motion.div className={`absolute inset-0 rounded-full border-2 ${borderColor}`} animate={{ scale: [1, 1.4, 1.7], opacity: [0.8, 0.4, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }} />
                    <motion.div className={`absolute inset-0 rounded-full border-2 ${borderColor}`} animate={{ scale: [1, 1.2, 1.5], opacity: [0.6, 0.3, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.4 }} />
                </>
            )}
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

    // Voice Core Loop logic identical to original
    const captureSpeech = (lang: string): Promise<string | null> => {
        return new Promise(resolve => {
            const SRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SRec) return resolve(null);
            const rec = new SRec(); rec.continuous = false; rec.interimResults = false; rec.lang = getLangCode(lang);
            recognitionRef.current = rec;
            let result: string | null = null;
            rec.onresult = (ev: any) => { result = ev.results[0][0].transcript; };
            rec.onend = () => resolve(result); rec.onerror = (ev: any) => resolve(null);
            rec.start();
        });
    };
    const translateText = async (text: string, from: string, to: string) => {
        const res = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, sourceLang: from, targetLang: to, type: 'translate' }) });
        const d = await res.json(); if (!res.ok) throw new Error(d.error || 'Err'); return d.translatedText ?? null;
    };
    const speakBrowserTTSAsync = (text: string, lang: string): Promise<void> => {
        return new Promise(resolve => {
            if (!window.speechSynthesis) return resolve();
            window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = getLangCode(lang); u.rate = 0.9;
            u.onend = () => resolve(); u.onerror = () => resolve(); window.speechSynthesis.speak(u);
        });
    };
    const speakWithGemini = async (text: string, voice: string, lang: string) => {
        try {
            const res = await fetch('/api/translate/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice }) });
            if (!res.ok) { await speakBrowserTTSAsync(text, lang); return; }
            const { audio } = await res.json();
            if (audio) await playPCMAudio(audio, audioCtxRef); else await speakBrowserTTSAsync(text, lang);
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

    // Text & Image Handlers
    const handleTextTrans = async () => {
        if (!inputText.trim() || isTranslating) return; setIsTranslating(true);
        try {
            const res = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: inputText, sourceLang, targetLang, type: 'translate' }) });
            const d = await res.json(); if (res.ok) { setTranslatedText(d.translatedText); addToHistory({ mode: 'text', sourceLang, targetLang, originalText: inputText, translatedText: d.translatedText }); } else setTranslatedText('Err');
        } catch { setTranslatedText('Err'); } finally { setIsTranslating(false); }
    };
    const handleSwap = () => { if (sourceLang === 'Auto-Detect') return; setSourceLang(targetLang); setTargetLang(sourceLang); setInputText(translatedText); setTranslatedText(inputText); };
    const handleImgSelect = (file: File) => { setImageFile(file); setImageExtracted(''); setImageTranslated(''); const r = new FileReader(); r.onload = e => setImagePreview(e.target?.result as string); r.readAsDataURL(file); };
    const handleImgTrans = async () => {
        if (!imageFile || isImageTranslating) return; setIsImageTranslating(true);
        try {
            const b64 = await fileToBase64(imageFile);
            const res = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'image', imageBase64: b64, imageMimeType: imageFile.type, sourceLang, targetLang }) });
            const d = await res.json(); if (res.ok) { setImageExtracted(d.extractedText || ''); setImageTranslated(d.translatedText || ''); addToHistory({ mode: 'image', sourceLang: d.detectedLanguage || sourceLang, targetLang, originalText: d.extractedText || '', translatedText: d.translatedText || '' }); } else setImageTranslated('Err');
        } catch { setImageTranslated('Err'); } finally { setIsImageTranslating(false); }
    };

    const copyText = (txt: string) => { navigator.clipboard.writeText(txt); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    const MODES = [{ id: 'voice', label: 'Hologram Voice', icon: Mic }, { id: 'text', label: 'Neural Text', icon: Type }, { id: 'image', label: 'Vision Scan', icon: ImageIcon }] as const;

    return (
        <div className="min-h-screen bg-[#03080f] font-sans selection:bg-[#00D4FF]/30 overflow-hidden">
            {/* 3D Glass Orbs Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <motion.div animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 15, repeat: Infinity }} className="absolute -top-[10%] left-[10%] w-[50vw] h-[50vw] rounded-full bg-[#00D4FF] blur-[150px] mix-blend-screen opacity-20" />
                <motion.div animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.4, 1], rotate: [0, -90, 0] }} transition={{ duration: 20, repeat: Infinity }} className="absolute bottom-[0%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-[#6366F1] blur-[200px] mix-blend-screen opacity-20" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 md:py-20">
                <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
                    <div className="text-center md:text-left">
                        <div className="inline-flex items-center gap-3 mb-2">
                            <div className="w-14 h-14 rounded-2xl bg-[#00D4FF]/10 border border-[#00D4FF]/30 flex items-center justify-center shadow-[0_0_30px_rgba(0,212,255,0.3)]">
                                <Languages className="w-8 h-8 text-[#00D4FF]" />
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
                                Universal <span className="text-[#00D4FF]">Translator</span>
                            </h1>
                        </div>
                        <p className="text-[#00D4FF] font-medium tracking-wide uppercase text-sm drop-shadow-[0_0_10px_#00D4FF]">Holographic Comms Interface</p>
                    </div>
                    <Button variant="outline" onClick={() => setShowHistory(true)} className="rounded-full bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.05)] font-bold px-6">
                        <History className="w-4 h-4 mr-2 text-[#00D4FF]" /> Logs
                        {history.length > 0 && <span className="ml-2 bg-[#00D4FF] text-black text-xs px-2 py-0.5 rounded-full font-black">{history.length}</span>}
                    </Button>
                </div>

                {/* Mode Tabs */}
                <div className="flex justify-center mb-10">
                    <div className="flex items-center gap-2 p-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
                        {MODES.map(({ id, label, icon: Icon }) => (
                            <button key={id} onClick={() => { if (isConversationActive) stopConv(); setMode(id as any); }}
                                className={`relative flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ${mode === id ? 'text-black shadow-[0_0_20px_rgba(0,212,255,0.4)]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                                {mode === id && <motion.div layoutId="modetab" className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00D4FF] to-[#00FFB3]" />}
                                <Icon className="w-5 h-5 relative z-10" />
                                <span className="relative z-10">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Lang Selectors */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    <LangSelector value={sourceLang} onChange={setSourceLang} />
                    <button onClick={handleSwap} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-[#00D4FF] hover:border-[#00D4FF]/50 transition-all hover:scale-110 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                        <ArrowRightLeft className="w-4 h-4" />
                    </button>
                    <LangSelector value={targetLang} onChange={setTargetLang} />
                </div>

                {/* Main Content Pane */}
                <AnimatePresence mode="wait">
                    {mode === 'voice' && (
                        <motion.div key="voice" initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30, scale: 0.95 }} transition={{ type: 'spring' }}>
                            <VoicePanel
                                voiceStep={voiceStep} isConversationActive={isConversationActive} conversation={conversation} voiceError={voiceError}
                                convEndRef={convEndRef} sourceLang={sourceLang} targetLang={targetLang} onStart={startConv} onStop={stopConv} onClear={() => setConversation([])}
                            />
                        </motion.div>
                    )}
                    {mode === 'text' && (
                        <motion.div key="text" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}>
                            <TextPanel
                                inputText={inputText} setInputText={setInputText} translatedText={translatedText} isTranslating={isTranslating}
                                onTranslate={handleTextTrans} onCopy={() => copyText(translatedText)} onSpeak={() => speakBrowserTTSAsync(translatedText, targetLang)}
                                onSpeakSource={() => speakBrowserTTSAsync(inputText, sourceLang)} copied={copied}
                            />
                        </motion.div>
                    )}
                    {mode === 'image' && (
                        <motion.div key="image" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}>
                            <ImagePanel
                                imagePreview={imagePreview} imageExtracted={imageExtracted} imageTranslated={imageTranslated} isTranslating={isImageTranslating}
                                fileInputRef={fileInputRef} onFileChange={handleImgSelect} onTranslate={handleImgTrans} onCopy={() => copyText(imageTranslated)}
                                onSpeak={() => speakBrowserTTSAsync(imageTranslated, targetLang)} copied={copied}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <HistoryPanel open={showHistory} onClose={() => setShowHistory(false)} entries={history} onClear={clearHistory} onDelete={deleteEntry} />
        </div>
    );
}

// ── voice panel ─────────────────────────────────────────────────────────────
function VoicePanel({ voiceStep, isConversationActive, conversation, voiceError, convEndRef, sourceLang, targetLang, onStart, onStop, onClear }: any) {
    const isListeningA = voiceStep === 'listening-A'; const isListeningB = voiceStep === 'listening-B';
    const isReady = sourceLang !== 'Select Language' && targetLang !== 'Select Language';

    return (
        <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
            <div className="rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl p-10 flex flex-col items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none" />
                
                <div className="flex items-center justify-between w-full mb-10 relative z-10">
                    <div className="flex flex-col items-center gap-3">
                        <div className={`text-xs font-bold px-3 py-1 rounded-full border border-white/10 uppercase tracking-widest ${isListeningA ? 'bg-[#FF007F]/20 text-[#FF007F] border-[#FF007F]/50 shadow-[0_0_15px_rgba(255,0,127,0.3)]' : 'bg-white/5 text-white/50'}`}>User A</div>
                        <div className="relative" style={{ width: 100, height: 100 }}>
                            <PulsingRing active={isListeningA} color="pink" />
                            <div className={`w-full h-full rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isListeningA ? 'border-[#FF007F] bg-[#FF007F]/10 text-[#FF007F]' : 'border-white/10 bg-white/5 text-white/30'}`}><Mic className="w-8 h-8" /></div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center">
                        <motion.button whileHover={isReady ? { scale: 1.05 } : {}} whileTap={isReady ? { scale: 0.95 } : {}} onClick={isConversationActive ? onStop : onStart} disabled={!isReady}
                            className={`w-28 h-28 rounded-[2rem] flex flex-col items-center justify-center gap-2 shadow-2xl border transition-all duration-300 ${!isReady ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed' : isConversationActive ? 'bg-[#FF007F]/20 border-[#FF007F] text-[#FF007F] shadow-[0_0_40px_rgba(255,0,127,0.4)]' : 'bg-[#00D4FF]/20 border-[#00D4FF] text-[#00D4FF] shadow-[0_0_40px_rgba(0,212,255,0.4)]'}`}>
                            {voiceStep.includes('translating') ? <Loader2 className="w-8 h-8 animate-spin" /> : isConversationActive ? <><Square className="w-8 h-8" /><span className="text-xs font-black tracking-widest">STOP</span></> : <><Play className="w-8 h-8" /><span className="text-xs font-black tracking-widest">START</span></>}
                        </motion.button>
                        <p className="text-[10px] uppercase font-bold text-white/30 mt-4 tracking-widest">Hologram Link</p>
                    </div>

                    <div className="flex flex-col items-center gap-3">
                        <div className={`text-xs font-bold px-3 py-1 rounded-full border border-white/10 uppercase tracking-widest ${isListeningB ? 'bg-[#00FFB3]/20 text-[#00FFB3] border-[#00FFB3]/50 shadow-[0_0_15px_rgba(0,255,179,0.3)]' : 'bg-white/5 text-white/50'}`}>User B</div>
                        <div className="relative" style={{ width: 100, height: 100 }}>
                            <PulsingRing active={isListeningB} color="emerald" />
                            <div className={`w-full h-full rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isListeningB ? 'border-[#00FFB3] bg-[#00FFB3]/10 text-[#00FFB3]' : 'border-white/10 bg-white/5 text-white/30'}`}><Mic className="w-8 h-8" /></div>
                        </div>
                    </div>
                </div>

                <div className="w-full text-center">
                    <p className="text-sm font-medium text-[#00D4FF]/80 uppercase tracking-wider">{voiceStep.replace('-', ' ')}</p>
                    {voiceError && <p className="text-xs text-[#FF007F] mt-2 bg-[#FF007F]/10 py-1 px-3 rounded-full inline-block border border-[#FF007F]/30">{voiceError}</p>}
                </div>
            </div>

            {conversation.length > 0 && (
                <div className="rounded-[30px] bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden shadow-2xl">
                    <div className="flex justify-between p-4 border-b border-white/10 bg-black/20">
                        <span className="text-xs font-bold text-white/70 uppercase tracking-widest">Live Transcript</span>
                        <button onClick={onClear} className="text-xs font-bold text-[#FF007F] hover:text-[#FF007F]/80 uppercase tracking-widest">Clear</button>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-4 space-y-4">
                        {conversation.map((c: any, i: number) => (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex gap-3 ${c.speaker === 'B' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${c.speaker === 'A' ? 'bg-[#FF007F]/20 text-[#FF007F]' : 'bg-[#00FFB3]/20 text-[#00FFB3]'}`}>{c.speaker}</div>
                                <div className={`flex flex-col max-w-[70%] ${c.speaker === 'B' ? 'items-end' : ''}`}>
                                    <div className={`p-3 rounded-2xl text-sm font-medium shadow-lg mb-1 ${c.speaker === 'A' ? 'bg-white/10 text-white rounded-tl-none' : 'bg-black/30 border border-white/5 text-white rounded-tr-none'}`}>{c.original}</div>
                                    <div className={`p-3 rounded-2xl text-sm font-bold shadow-lg ${c.speaker === 'A' ? 'bg-[#FF007F]/10 border border-[#FF007F]/20 text-[#FF007F]' : 'bg-[#00FFB3]/10 border border-[#00FFB3]/20 text-[#00FFB3]'}`}>↳ {c.translated}</div>
                                </div>
                            </motion.div>
                        ))}
                        <div ref={convEndRef} />
                    </div>
                </div>
            )}
        </div>
    );
}

// ── text panel ─────────────────────────────────────────────────────────────
function TextPanel({ inputText, setInputText, translatedText, isTranslating, onTranslate, onCopy, onSpeak, onSpeakSource, copied }: any) {
    return (
        <div className="w-full max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-[30px] border border-white/10 bg-white/5 backdrop-blur-xl flex flex-col overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00D4FF] to-transparent opacity-50" />
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                    <span className="text-xs font-bold text-[#00D4FF] uppercase tracking-widest">Input</span>
                    <button onClick={onSpeakSource} className="text-white/50 hover:text-[#00D4FF] transition-colors"><Volume2 className="w-4 h-4" /></button>
                </div>
                <Textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Enter transmission..." className="flex-1 bg-transparent border-0 text-white text-lg placeholder:text-white/20 p-6 min-h-[200px] resize-none focus-visible:ring-0 shadow-none" />
                <div className="p-4 flex justify-end bg-black/20 border-t border-white/10">
                    <Button onClick={onTranslate} disabled={!inputText || isTranslating} className="rounded-full bg-[#00D4FF] text-black hover:bg-[#00D4FF]/80 font-black px-8 shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all">
                        {isTranslating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />} DECODE
                    </Button>
                </div>
            </div>

            <div className="rounded-[30px] border border-[#6366F1]/30 bg-[#6366F1]/5 backdrop-blur-xl flex flex-col overflow-hidden shadow-2xl relative shadow-[#6366F1]/10">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#6366F1] to-transparent opacity-50" />
                <div className="p-4 border-b border-[#6366F1]/20 flex justify-between items-center bg-black/20">
                    <span className="text-xs font-bold text-[#6366F1] uppercase tracking-widest">Output</span>
                    <div className="flex gap-2">
                        <button onClick={onSpeak} className="text-[#6366F1]/50 hover:text-[#6366F1] transition-colors"><Volume2 className="w-4 h-4" /></button>
                        <button onClick={onCopy} className="text-[#6366F1]/50 hover:text-[#6366F1] transition-colors">{copied ? <Check className="w-4 h-4 text-[#00FFB3]" /> : <Copy className="w-4 h-4" />}</button>
                    </div>
                </div>
                <div className="p-6 flex-1 min-h-[200px]">
                    {translatedText ? <p className="text-white font-medium text-lg">{translatedText}</p> : <p className="text-white/20 text-lg">Waiting for data...</p>}
                </div>
            </div>
        </div>
    );
}

// ── image panel ─────────────────────────────────────────────────────────────
function ImagePanel({ imagePreview, imageExtracted, imageTranslated, isTranslating, fileInputRef, onFileChange, onTranslate, onCopy, onSpeak, copied }: any) {
    return (
        <div className="w-full max-w-3xl mx-auto space-y-6">
            <div onClick={() => fileInputRef.current?.click()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) onFileChange(e.dataTransfer.files[0]); }} onDragOver={e => e.preventDefault()}
                className={`rounded-[40px] border-2 border-dashed bg-white/5 backdrop-blur-xl transition-all cursor-pointer flex justify-center items-center overflow-hidden min-h-[300px] shadow-2xl ${imagePreview ? 'border-white/10' : 'border-[#00FFB3]/30 hover:bg-[#00FFB3]/5 hover:border-[#00FFB3]'}`}>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) onFileChange(e.target.files?.[0]); }} />
                {imagePreview ? (
                    <div className="relative w-full h-full flex justify-center items-center p-4">
                        <img src={imagePreview} className="max-h-[400px] object-contain rounded-2xl shadow-2xl" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex justify-center items-center">
                            <span className="bg-[#00FFB3] text-black font-bold px-6 py-2 rounded-full">CHANGE SCAN</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-center p-12">
                        <div className="w-20 h-20 mx-auto rounded-[2rem] bg-[#00FFB3]/10 border border-[#00FFB3]/30 flex justify-center items-center mb-6 shadow-[0_0_30px_rgba(0,255,179,0.3)]"><Camera className="w-10 h-10 text-[#00FFB3]" /></div>
                        <h3 className="text-white font-black text-2xl mb-2 tracking-tight">Lens Scan</h3>
                        <p className="text-white/40 font-medium">Drop an image here or click to browse</p>
                    </div>
                )}
            </div>
            {imagePreview && (
                <div className="text-center">
                    <Button onClick={onTranslate} disabled={isTranslating} className="rounded-full bg-gradient-to-r from-[#00D4FF] to-[#00FFB3] text-black font-black px-12 py-6 text-lg shadow-[0_0_30px_rgba(0,255,179,0.4)] hover:scale-105 transition-all w-full max-w-md mx-auto">
                        {isTranslating ? <Loader2 className="w-6 h-6 mr-3 animate-spin" /> : <Zap className="w-6 h-6 mr-3" />} PROCESS IMAGE
                    </Button>
                </div>
            )}
            <AnimatePresence>
                {imageTranslated && (
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                         <div className="rounded-[30px] border border-white/10 bg-white/5 backdrop-blur-xl p-6">
                            <span className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 block">Extracted Details</span>
                            <p className="text-white/80">{imageExtracted}</p>
                         </div>
                         <div className="rounded-[30px] border border-[#00FFB3]/30 bg-[#00FFB3]/5 backdrop-blur-xl p-6 relative">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-bold text-[#00FFB3] uppercase tracking-widest">Translation Output</span>
                                <div className="flex gap-2">
                                    <button onClick={onSpeak} className="text-[#00FFB3]/50 hover:text-[#00FFB3]"><Volume2 className="w-4 h-4" /></button>
                                    <button onClick={onCopy} className="text-[#00FFB3]/50 hover:text-[#00FFB3]">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button>
                                </div>
                            </div>
                            <p className="text-white font-bold text-lg">{imageTranslated}</p>
                         </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
