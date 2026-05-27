'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
    {
        question: 'Do I need to pay to use this?',
        answer: 'No. You can generate up to 3 complete itineraries for free — no credit card, no signup wall. Just tell us where you\'re going and we\'ll build a full day-by-day plan instantly. When you\'re ready for more, upgrading takes 30 seconds.',
    },
    {
        question: 'How accurate is the AI planning?',
        answer: 'Very accurate for itinerary structure, timing, and local recommendations. Our AI is trained on real travel data and uses live APIs for flights and hotels. For visa requirements, we aggregate from official government sources — but always double-check with the relevant embassy before you travel.',
    },
    {
        question: 'Can I trust the visa information?',
        answer: 'Our Visa Intelligence uses real-time data from official government and aviation databases, aggregated for your specific passport. It\'s a strong starting point, but visa rules change. Always confirm with your country\'s official government travel page or the destination\'s embassy before booking.',
    },
    {
        question: 'How is this different from Google Travel or TripIt?',
        answer: 'Google Travel tells you what to search. TripIt organizes flights you already booked. iWillTravel builds the entire trip for you — from scratch. One prompt gives you a full day-by-day plan with activities, routes, budget estimates, hotel options, and flight prices. It\'s a planner, not just a dashboard.',
    },
    {
        question: 'Can I plan a trip to a small or less-known city?',
        answer: 'Yes — this is one of our strengths. The AI isn\'t limited to major tourist destinations. You can plan trips to smaller cities, off-the-beaten-path regions, and local destinations that most travel tools ignore. Just enter the city or area, and we\'ll build a structured plan based on what\'s actually there.',
    },
    {
        question: 'What happens after my 3 free itineraries?',
        answer: 'You\'ll see an upgrade prompt. You can still browse 150+ destinations, explore the app, and access any trips you\'ve previously generated. To create new itineraries, you\'ll need to upgrade to Starter (€6/mo) or Pro (€12/mo).',
    },
    {
        question: 'Can I customize the itinerary after it\'s generated?',
        answer: 'The generated plan is fully readable and structured. You can copy it, share it, export to PDF (on Starter+), or use it as your starting point. Deep drag-and-drop editing is on our roadmap — follow us for updates.',
    },
];

export function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #020B18 0%, #03080F 50%, #050D1A 100%)' }}>
            {/* Schema markup for rich results */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'FAQPage',
                        mainEntity: faqs.map(faq => ({
                            '@type': 'Question',
                            name: faq.question,
                            acceptedAnswer: { '@type': 'Answer', text: faq.answer },
                        })),
                    }),
                }}
            />

            <div className="container relative z-10 px-4 mx-auto max-w-4xl">
                <div className="text-center mb-14">
                    <motion.span
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6"
                        style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', color: '#00D4FF' }}
                    >
                        Common Questions
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight"
                        style={{ color: '#F0F4FF' }}
                    >
                        Everything you need to know
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                        className="text-lg md:text-xl max-w-2xl mx-auto"
                        style={{ color: 'rgba(176,184,204,0.7)' }}
                    >
                        From solo city trips to multi-region adventures — we've answered the most common questions below.
                    </motion.p>
                </div>

                <div className="space-y-3">
                    {faqs.map((faq, index) => {
                        const isOpen = openIndex === index;
                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.07 }}
                                onClick={() => setOpenIndex(isOpen ? null : index)}
                                className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-200"
                                style={{
                                    background: isOpen ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
                                    border: isOpen ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(255,255,255,0.07)',
                                }}
                            >
                                <div className="px-6 py-5 flex items-center justify-between gap-4">
                                    <h3 className="font-semibold text-base pr-6" style={{ color: '#F0F4FF' }}>
                                        {faq.question}
                                    </h3>
                                    <motion.div
                                        animate={{ rotate: isOpen ? 180 : 0 }}
                                        transition={{ duration: 0.28, ease: 'easeInOut' }}
                                        className="flex-shrink-0"
                                        style={{ color: isOpen ? '#00D4FF' : 'rgba(255,255,255,0.3)' }}
                                    >
                                        <ChevronDown className="w-5 h-5" />
                                    </motion.div>
                                </div>
                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div
                                            key="content"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.28, ease: 'easeInOut' }}
                                        >
                                            <p className="px-6 pb-5 pt-0 text-sm leading-relaxed" style={{ color: 'rgba(176,184,204,0.75)' }}>
                                                {faq.answer}
                                            </p>
                                            <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.2), transparent)' }} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
