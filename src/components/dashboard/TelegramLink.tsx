'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Send, CheckCircle2, Link as LinkIcon, Loader2 } from 'lucide-react';

export function TelegramLink() {
    const [loading, setLoading] = useState(false);
    const [linkData, setLinkData] = useState<{ code: string; link: string } | null>(null);

    const generateLink = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/telegram/link-code');
            const data = await res.json();
            setLinkData(data);
        } catch (error) {
            console.error('Failed to generate link:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-blue-500/20 bg-blue-500/5 shadow-xl">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="rounded-full bg-blue-500/20 p-2 text-blue-500">
                        <Send size={20} />
                    </div>
                    <div>
                        <CardTitle>Telegram AI Bot</CardTitle>
                        <CardDescription>Get itineraries directly on Telegram</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {!linkData ? (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-400">
                            Connect your account to our AI Telegram bot to generate itineraries on the go using the same 8-agent pipeline.
                        </p>
                        <Button 
                            onClick={generateLink} 
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                            Connect Telegram Bot
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4 rounded-lg bg-slate-900/50 p-4 border border-blue-500/30">
                        <div className="flex items-center gap-2 text-blue-400">
                            <CheckCircle2 size={16} />
                            <span className="text-sm font-semibold">Linking Code Generated</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Your Code</p>
                            <div className="bg-slate-800 p-2 rounded text-center text-xl font-mono text-blue-400 border border-blue-500/20">
                                {linkData.code}
                            </div>
                        </div>
                        <p className="text-xs text-slate-400">
                            Click the button below to open the bot and link your account automatically.
                        </p>
                        <Button 
                            asChild
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <a href={linkData.link} target="_blank" rel="noopener noreferrer">
                                Open Telegram Bot
                            </a>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
