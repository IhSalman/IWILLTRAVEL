'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, Star, Zap, Plane, Coins, CircleArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function PricingClient() {
    const locale = useLocale();
    const [isYearly, setIsYearly] = useState(false);

    return (
        <div className="min-h-screen bg-[#03080f] text-white py-24 font-sans relative overflow-hidden">
            {/* 3D Animated Background Orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
                <motion.div 
                    animate={{ y: [0, -50, 0], scale: [1, 1.2, 1], rotate: [0, 45, 0] }} 
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#00D4FF] rounded-full mix-blend-screen filter blur-[150px] opacity-[0.1]"
                />
                <motion.div 
                    animate={{ y: [0, 50, 0], scale: [1, 1.3, 1], rotate: [0, -45, 0] }} 
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-[#6366F1] rounded-full mix-blend-screen filter blur-[150px] opacity-[0.1]"
                />
            </div>

            <div className="container relative z-10 max-w-7xl mx-auto px-4 md:px-8">
                
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Badge className="bg-white/10 text-[#00D4FF] hover:bg-white/20 border-white/10 mb-6 py-2 px-4 text-sm rounded-full backdrop-blur-md">
                            <Star className="w-4 h-4 mr-2" /> Upgrade Your Travel Experience
                        </Badge>
                    </motion.div>
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-br from-white via-white to-white/50 bg-clip-text text-transparent"
                    >
                        Simple, transparent pricing
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-white/60 text-lg md:text-xl"
                    >
                        Choose the perfect plan for your travel style. Whether you're a first-time explorer or a seasoned digital nomad.
                    </motion.p>
                </div>

                {/* Billing Toggle */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex justify-center items-center mb-16"
                >
                    <div className="bg-white/5 p-1 rounded-full border border-white/10 flex items-center shadow-2xl backdrop-blur-md">
                        <button
                            onClick={() => setIsYearly(false)}
                            className={`px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ${!isYearly ? 'bg-white text-black shadow-lg scale-105' : 'text-white/60 hover:text-white'}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsYearly(true)}
                            className={`px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 flex items-center ${isYearly ? 'bg-[#00D4FF] text-black shadow-[0_0_20px_rgba(0,212,255,0.4)] scale-105' : 'text-white/60 hover:text-white'}`}
                        >
                            Yearly <span className="ml-2 text-xs bg-black/20 px-2 py-0.5 rounded-full border border-black/10">Save ~40%</span>
                        </button>
                    </div>
                </motion.div>

                {/* Pricing Tiers Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24 max-w-6xl mx-auto">
                    
                    {/* Free Plan */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className="h-full bg-white/5 backdrop-blur-xl border-white/10 p-8 rounded-[32px] flex flex-col relative group hover:border-white/20 transition-all duration-500">
                            <div className="mb-6">
                                <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
                                <p className="text-white/50 text-sm h-10">Good for trying out AI itineraries before your trip.</p>
                            </div>
                            <div className="mb-8 flex items-baseline text-white">
                                <span className="text-5xl font-extrabold">€0</span>
                                <span className="text-white/40 ml-2 font-medium">/ forever</span>
                            </div>
                            <ul className="mb-8 space-y-4 flex-1">
                                <li className="flex items-start text-white/80">
                                    <Check className="w-5 h-5 text-[#00FFB3] mr-3 shrink-0" />
                                    <span><strong>1 refresh</strong> per month</span>
                                </li>
                                <li className="flex items-start text-white/80">
                                    <Check className="w-5 h-5 text-[#00FFB3] mr-3 shrink-0" />
                                    <span>Up to <strong>3-day</strong> itineraries</span>
                                </li>
                                <li className="flex items-start text-white/80">
                                    <Check className="w-5 h-5 text-[#00FFB3] mr-3 shrink-0" />
                                    <span><strong>1000 tokens</strong> voice translation</span>
                                </li>
                            </ul>
                            <Button className="w-full bg-white/10 hover:bg-white/20 text-white rounded-xl h-12 font-bold text-base transition-colors border border-white/5">
                                Current Plan
                            </Button>
                        </Card>
                    </motion.div>

                    {/* Pro Plan */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <Card className="h-full bg-[#0a1628] backdrop-blur-xl border-[#6366F1]/50 p-8 rounded-[32px] flex flex-col relative transform hover:-translate-y-2 transition-transform duration-500 shadow-[0_20px_40px_rgba(99,102,241,0.1)]">
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#6366F1] to-[#00D4FF]" />
                            <Badge className="absolute -top-3 right-8 bg-gradient-to-r from-[#6366F1] to-[#00D4FF] text-white border-none py-1 px-3 shadow-lg">Most Popular</Badge>
                            
                            <div className="mb-6">
                                <h3 className="text-2xl font-bold text-white mb-2 flex items-center">
                                    <Plane className="w-5 h-5 mr-2 text-[#00D4FF]" /> Pro
                                </h3>
                                <p className="text-white/50 text-sm h-10">Perfect for the casual traveler planning holidays.</p>
                            </div>
                            <div className="mb-8 flex items-baseline text-white">
                                <span className="text-5xl font-extrabold">{isYearly ? '€3' : '€5'}</span>
                                <span className="text-white/40 ml-2 font-medium">/ month {isYearly && <span className="text-xs ml-1 block">billed €36 yearly</span>}</span>
                            </div>
                            <ul className="mb-8 space-y-4 flex-1">
                                <li className="flex items-start text-white/80">
                                    <Check className="w-5 h-5 text-[#00D4FF] mr-3 shrink-0" />
                                    <span><strong>10 itineraries</strong> per month</span>
                                </li>
                                <li className="flex items-start text-white/80">
                                    <Check className="w-5 h-5 text-[#00D4FF] mr-3 shrink-0" />
                                    <span>Up to <strong>12-day</strong> itineraries</span>
                                </li>
                                <li className="flex items-start text-white/80">
                                    <Check className="w-5 h-5 text-[#00D4FF] mr-3 shrink-0" />
                                    <span><strong>30 min</strong> voice translation</span>
                                </li>
                                <li className="flex items-start text-white/80">
                                    <Check className="w-5 h-5 text-[#00D4FF] mr-3 shrink-0" />
                                    <span>Save trips & preferences</span>
                                </li>
                            </ul>
                            <Button className="w-full bg-white text-black hover:bg-[#00D4FF] rounded-xl h-12 font-bold text-base transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(0,212,255,0.4)]">
                                Upgrade to Pro
                            </Button>
                        </Card>
                    </motion.div>

                    {/* Nomads Pro Plan */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <Card className="h-full bg-gradient-to-b from-[#1a0b2e] to-[#03080f] backdrop-blur-xl border-[#d946ef]/30 p-8 rounded-[32px] flex flex-col relative group hover:border-[#d946ef]/60 transition-colors duration-500 shadow-[0_20px_40px_rgba(217,70,239,0.05)] hover:shadow-[0_20px_40px_rgba(217,70,239,0.1)]">
                            <div className="mb-6">
                                <h3 className="text-2xl font-bold text-white mb-2 flex items-center">
                                    <Zap className="w-5 h-5 mr-2 text-[#d946ef] fill-[#d946ef]" /> Nomads Pro
                                </h3>
                                <p className="text-white/50 text-sm h-10">For digital nomads and frequent global travelers.</p>
                            </div>
                            <div className="mb-8 flex items-baseline text-white">
                                <span className="text-5xl font-extrabold">{isYearly ? '€5' : '€7'}</span>
                                <span className="text-white/40 ml-2 font-medium">/ month {isYearly && <span className="text-xs ml-1 block">billed €60 yearly</span>}</span>
                            </div>
                            <ul className="mb-8 space-y-4 flex-1">
                                <li className="flex items-start text-white/80">
                                    <Check className="w-5 h-5 text-[#d946ef] mr-3 shrink-0" />
                                    <span><strong>30 itineraries</strong> per month</span>
                                </li>
                                <li className="flex items-start text-white/80">
                                    <Check className="w-5 h-5 text-[#d946ef] mr-3 shrink-0" />
                                    <span><strong>Unlimited day</strong> itineraries</span>
                                </li>
                                <li className="flex items-start text-white/80">
                                    <Check className="w-5 h-5 text-[#d946ef] mr-3 shrink-0" />
                                    <span><strong>300–600 min</strong> voice translation</span>
                                </li>
                                <li className="flex items-start text-white/80">
                                    <Check className="w-5 h-5 text-[#d946ef] mr-3 shrink-0" />
                                    <span>Priority AI & multi-step agents</span>
                                </li>
                                <li className="flex items-start text-white/80">
                                    <Check className="w-5 h-5 text-[#d946ef] mr-3 shrink-0" />
                                    <span>Nomad newsletter access</span>
                                </li>
                            </ul>
                            <Button className="w-full bg-gradient-to-r from-[#d946ef] to-[#8b5cf6] hover:opacity-90 text-white rounded-xl h-12 font-bold text-base transition-opacity border-none shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)]">
                                Go Nomads Pro
                            </Button>
                        </Card>
                    </motion.div>

                </div>

                {/* Credit System Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-5xl mx-auto"
                >
                    <div className="text-center mb-12 flex flex-col items-center">
                        <div className="bg-[#fbbf24]/10 p-3 rounded-2xl mb-4">
                            <Coins className="w-8 h-8 text-[#fbbf24]" />
                        </div>
                        <h2 className="text-4xl font-extrabold text-white mb-4">Part-Time Traveller?</h2>
                        <p className="text-white/60 text-lg max-w-2xl">
                            Don't want a subscription? Buy credits instead. Use them flexibly whenever you travel. 
                            <strong> 1 Credit = 1 Itinerary OR 1 Minute Translation.</strong> Valid for 1 year.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { name: 'Starter', credits: 300, price: '€10', color: 'from-amber-100 to-amber-300', text: 'text-amber-700' },
                            { name: 'Explorer', credits: 1000, price: '€35', color: 'from-orange-200 to-orange-400', text: 'text-orange-900', pop: true },
                            { name: 'Nomad Pack', credits: 2500, price: '€70', color: 'from-blue-200 to-blue-400', text: 'text-blue-900' },
                            { name: 'Ultra', credits: 5000, price: '€130', color: 'from-emerald-200 to-emerald-400', text: 'text-emerald-900' },
                        ].map((pack, i) => (
                            <motion.div
                                key={pack.name}
                                whileHover={{ scale: 1.05 }}
                                className={`relative bg-gradient-to-br ${pack.color} p-6 rounded-[24px] overflow-hidden group cursor-pointer shadow-xl ${pack.pop ? 'transform -translate-y-2 lg:-translate-y-4 shadow-orange-500/20' : ''}`}
                            >
                                <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${pack.text}`}>
                                    <Coins className="w-20 h-20 -mr-6 -mt-6" />
                                </div>
                                <h4 className={`text-sm font-bold uppercase tracking-wider mb-1 ${pack.text} opacity-80`}>{pack.name}</h4>
                                <div className={`text-4xl font-black mb-6 ${pack.text}`}>
                                    {pack.credits} <span className="text-sm font-bold opacity-70">cr</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className={`text-xl font-bold ${pack.text}`}>{pack.price}</span>
                                    <div className={`w-8 h-8 rounded-full bg-white/30 flex items-center justify-center ${pack.text} group-hover:bg-white/50 transition-colors`}>
                                        <CircleArrowRight className="w-5 h-5" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* FAQ or Trust Badges could go here */}
                
            </div>
        </div>
    );
}
