'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plane, Heart, Coffee, Leaf, Zap,
    Accessibility, Utensils, Sparkles,
    ArrowRight, Loader2, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';

const steps = [
    {
        title: "How do you like to travel?",
        field: "travel_style",
        options: [
            { id: 'luxury', label: 'Luxury', icon: Sparkles, desc: 'High-end experiences and comfort' },
            { id: 'budget', label: 'Budget', icon: Zap, desc: 'Cost-conscious adventures' },
            { id: 'balanced', label: 'Balanced', icon: Plane, desc: 'A mix of comfort and value' },
        ]
    },
    {
        title: "What are your core interests?",
        field: "interests",
        multiple: true,
        options: [
            { id: 'culture', label: 'Culture & History', icon: Heart },
            { id: 'nature', label: 'Nature & Outdoors', icon: Leaf },
            { id: 'food', label: 'Food & Gastronomy', icon: Utensils },
            { id: 'relaxation', label: 'Relaxation', icon: Coffee },
        ]
    },
    {
        title: "Any accessibility needs?",
        field: "accessibility",
        multiple: true,
        options: [
            { id: 'wheelchair', label: 'Wheelchair Access', icon: Accessibility },
            { id: 'low_mobility', label: 'Low Mobility', icon: Zap },
            { id: 'none', label: 'No specific needs', icon: CheckCircle2 },
        ]
    }
];

export default function OnboardingPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [selections, setSelections] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSelect = (id: string) => {
        const step = steps[currentStep];
        if (step.multiple) {
            const current = selections[step.field] || [];
            if (current.includes(id)) {
                setSelections({ ...selections, [step.field]: current.filter((x: string) => x !== id) });
            } else {
                setSelections({ ...selections, [step.field]: [...current, id] });
            }
        } else {
            setSelections({ ...selections, [step.field]: id });
            // For single select, auto-advance after a short delay
            setTimeout(() => {
                if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
            }, 300);
        }
    };

    const handleFinish = async () => {
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { error } = await supabase
                .from('profiles')
                .update({
                    preferences: selections,
                    travel_style: selections.travel_style
                })
                .eq('id', user.id);

            if (error) throw error;
            router.push('/dashboard');
        } catch (err) {
            console.error('Error saving onboard data:', err);
            alert('Failed to save preferences. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const step = steps[currentStep];

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-background to-muted/30">
            <div className="w-full max-w-2xl">
                {/* Progress Bar */}
                <div className="flex gap-2 mb-12">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= currentStep ? 'bg-primary' : 'bg-muted'}`}
                        />
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                    >
                        <div className="text-center">
                            <h1 className="text-4xl font-black mb-4 tracking-tight">{step.title}</h1>
                            <p className="text-muted-foreground">This helps us personalize your itineraries.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {step.options.map((opt) => {
                                const isSelected = step.multiple
                                    ? selections[step.field]?.includes(opt.id)
                                    : selections[step.field] === opt.id;

                                return (
                                    <Card
                                        key={opt.id}
                                        className={`cursor-pointer transition-all duration-300 border-2 overflow-hidden ${isSelected ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' : 'border-border/50 hover:border-primary/30'}`}
                                        onClick={() => handleSelect(opt.id)}
                                    >
                                        <CardContent className="p-6 flex items-center space-x-4">
                                            <div className={`p-3 rounded-2xl ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                                <opt.icon className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold">{opt.label}</h3>
                                                {'desc' in opt && <p className="text-xs text-muted-foreground">{opt.desc}</p>}
                                            </div>
                                            {isSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </motion.div>
                </AnimatePresence>

                <div className="flex justify-between items-center mt-12">
                    <Button
                        variant="ghost"
                        disabled={currentStep === 0}
                        onClick={() => setCurrentStep(currentStep - 1)}
                    >
                        Previous
                    </Button>

                    {currentStep === steps.length - 1 ? (
                        <Button
                            className="bg-primary hover:bg-primary/90 px-8 py-6 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20"
                            disabled={isSaving}
                            onClick={handleFinish}
                        >
                            {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : "Start Planning"}
                        </Button>
                    ) : (
                        <Button
                            variant="secondary"
                            className="px-8 py-6 rounded-2xl font-bold"
                            onClick={() => setCurrentStep(currentStep + 1)}
                            disabled={!selections[step.field] || (step.multiple && selections[step.field].length === 0)}
                        >
                            Next <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
