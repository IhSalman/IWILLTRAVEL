'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Check, DollarSign, Zap, Crown, Coins } from 'lucide-react';

interface ModelOption {
    id: string;
    label: string;
    description: string;
    tier: string;
    pricing: { input: number; output: number; thinking?: number };
}

interface SettingsData {
    activeModel: string;
    modelOptions: ModelOption[];
}

const tierIcons: Record<string, any> = {
    Recommended: Zap,
    Premium: Crown,
    Economy: Coins,
};

const tierColors: Record<string, string> = {
    Recommended: 'border-blue-500/30 bg-blue-500/5',
    Premium: 'border-amber-500/30 bg-amber-500/5',
    Economy: 'border-green-500/30 bg-green-500/5',
};

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<SettingsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetch('/api/admin/settings')
            .then(r => r.json())
            .then(data => {
                setSettings(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleModelChange = async (modelId: string) => {
        if (!settings) return;
        setSaving(true);
        setSuccess('');

        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'active_model', value: modelId }),
            });

            if (res.ok) {
                setSettings({ ...settings, activeModel: modelId });
                setSuccess(`Switched to ${modelId}. All AI features will now use this model.`);
                setTimeout(() => setSuccess(''), 5000);
            }
        } catch (err) {
            console.error('Failed to update model:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold">AI Settings</h1>
                <p className="text-muted-foreground">Loading...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">AI Settings</h1>
                <p className="text-muted-foreground mt-2">
                    Choose the AI model powering all features. Changes take effect immediately.
                </p>
            </div>

            {success && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-700 dark:text-green-400 text-sm">
                    <Check className="h-4 w-4" />
                    {success}
                </div>
            )}

            {/* Model Selection Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                {settings?.modelOptions.map((model) => {
                    const isActive = settings.activeModel === model.id;
                    const TierIcon = tierIcons[model.tier] || Brain;
                    const tierColor = tierColors[model.tier] || '';

                    return (
                        <Card
                            key={model.id}
                            className={`relative cursor-pointer transition-all hover:shadow-md ${
                                isActive ? 'ring-2 ring-primary border-primary' : tierColor
                            } ${saving ? 'opacity-50 pointer-events-none' : ''}`}
                            onClick={() => !isActive && handleModelChange(model.id)}
                        >
                            {isActive && (
                                <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                                    Active
                                </div>
                            )}
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2">
                                    <TierIcon className="h-5 w-5 text-primary" />
                                    <CardTitle className="text-lg">{model.label}</CardTitle>
                                </div>
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{model.tier}</span>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">{model.description}</p>

                                <div className="space-y-2 pt-2 border-t">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Input</span>
                                        <span className="font-mono">${model.pricing.input}/1M tokens</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Output</span>
                                        <span className="font-mono">${model.pricing.output}/1M tokens</span>
                                    </div>
                                    {model.pricing.thinking && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Thinking</span>
                                            <span className="font-mono">${model.pricing.thinking}/1M tokens</span>
                                        </div>
                                    )}
                                </div>

                                {!isActive && (
                                    <button
                                        className="w-full mt-2 px-4 py-2 text-sm font-medium bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleModelChange(model.id);
                                        }}
                                    >
                                        Switch to {model.label}
                                    </button>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* API Key Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">API Key Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-2">
                        {[
                            { name: 'GEMINI_API_KEY', label: 'Google Gemini' },
                            { name: 'MAPBOX_ACCESS_TOKEN', label: 'Mapbox' },
                        ].map(({ name, label }) => (
                            <div key={name} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                                <div>
                                    <span className="text-sm font-medium">{label}</span>
                                    <span className="text-xs text-muted-foreground ml-2">{name}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
