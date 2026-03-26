'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function NewDestinationPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        id: crypto.randomUUID(), // Temporarily generated on client
        name: '',
        country: '',
        country_id: '',
        continent_id: '',
        slug: '',
        description: 'Deprecated, but required by schema',
        image_url: '',
        lat: 0,
        lng: 0,
        cost_per_day: 0,
        internet_speed: 0,
        safety_score: 0,
        temperature: 0,
        best_for: '',
        vibes: [] as string[],
        best_season: [] as string[],

        // SEO Specific Fields
        meta_title: '',
        meta_description: '',
        hero_description: '',
        overview: '',
        best_time_months: '',
        best_time_reason: '',
        top_attractions: [] as { name: string; description: string }[],
        local_tips: [] as string[],
        cost_breakdown: [] as { category: string; amount: number }[],
        faqs: [] as { q: string; a: string }[],
    });

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Helper functions for array states
    const addAttraction = () => handleInputChange('top_attractions', [...formData.top_attractions, { name: '', description: '' }]);
    const updateAttraction = (index: number, field: 'name' | 'description', value: string) => {
        const newAttractions = [...formData.top_attractions];
        newAttractions[index] = { ...newAttractions[index], [field]: value };
        handleInputChange('top_attractions', newAttractions);
    };
    const removeAttraction = (index: number) => {
        handleInputChange('top_attractions', formData.top_attractions.filter((_, i) => i !== index));
    };

    const addLocalTip = () => handleInputChange('local_tips', [...formData.local_tips, '']);
    const updateLocalTip = (index: number, value: string) => {
        const newTips = [...formData.local_tips];
        newTips[index] = value;
        handleInputChange('local_tips', newTips);
    };
    const removeLocalTip = (index: number) => {
        handleInputChange('local_tips', formData.local_tips.filter((_, i) => i !== index));
    };

    const addFAQ = () => handleInputChange('faqs', [...formData.faqs, { q: '', a: '' }]);
    const updateFAQ = (index: number, field: 'q' | 'a', value: string) => {
        const newFAQs = [...formData.faqs];
        newFAQs[index] = { ...newFAQs[index], [field]: value };
        handleInputChange('faqs', newFAQs);
    };
    const removeFAQ = (index: number) => {
        handleInputChange('faqs', formData.faqs.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/admin/destinations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create destination');
            }

            toast.success('Destination created successfully!');
            router.push('/admin/destinations');
            router.refresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin/destinations">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Add New Destination</h1>
                    <p className="text-muted-foreground mt-1">Create a rich, SEO-optimized city page.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* Basic Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                        <CardDescription>Core identifiers required by the schema</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>City Name</Label>
                            <Input required value={formData.name} onChange={e => handleInputChange('name', e.target.value)} placeholder="e.g. Kyoto" />
                        </div>
                        <div className="space-y-2">
                            <Label>Country</Label>
                            <Input required value={formData.country} onChange={e => handleInputChange('country', e.target.value)} placeholder="e.g. Japan" />
                        </div>
                        <div className="space-y-2">
                            <Label>Country Code (ID)</Label>
                            <Input required value={formData.country_id} onChange={e => handleInputChange('country_id', e.target.value)} placeholder="e.g. JP" />
                        </div>
                        <div className="space-y-2">
                            <Label>Continent Code (ID)</Label>
                            <Input required value={formData.continent_id} onChange={e => handleInputChange('continent_id', e.target.value)} placeholder="e.g. AS" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>URL Slug</Label>
                            <Input required value={formData.slug} onChange={e => handleInputChange('slug', e.target.value)} placeholder="e.g. kyoto-japan" />
                            <p className="text-xs text-muted-foreground">Will be used in the URL: /discover/[slug]</p>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Hero Image URL</Label>
                            <Input required value={formData.image_url} onChange={e => handleInputChange('image_url', e.target.value)} placeholder="https://..." />
                        </div>
                    </CardContent>
                </Card>

                {/* Statistics */}
                <Card>
                    <CardHeader>
                        <CardTitle>Key Statistics</CardTitle>
                        <CardDescription>Data used for filtering and the top stats banner</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <Label>Cost Per Day ($)</Label>
                            <Input type="number" required value={formData.cost_per_day} onChange={e => handleInputChange('cost_per_day', parseInt(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label>Safety (1-10)</Label>
                            <Input type="number" step="0.1" required value={formData.safety_score} onChange={e => handleInputChange('safety_score', parseFloat(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label>Temperature (°C)</Label>
                            <Input type="number" required value={formData.temperature} onChange={e => handleInputChange('temperature', parseInt(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label>Internet (Mbps)</Label>
                            <Input type="number" required value={formData.internet_speed} onChange={e => handleInputChange('internet_speed', parseInt(e.target.value))} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Latitude</Label>
                            <Input type="number" step="0.000001" required value={formData.lat} onChange={e => handleInputChange('lat', parseFloat(e.target.value))} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Longitude</Label>
                            <Input type="number" step="0.000001" required value={formData.lng} onChange={e => handleInputChange('lng', parseFloat(e.target.value))} />
                        </div>
                        <div className="space-y-2 md:col-span-4">
                            <Label>Best For (Legacy Field)</Label>
                            <Input required value={formData.best_for} onChange={e => handleInputChange('best_for', e.target.value)} placeholder="e.g. Culture, Temples" />
                        </div>
                    </CardContent>
                </Card>

                {/* Rich Content (SEO) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Rich Content & SEO</CardTitle>
                        <CardDescription>Extensive writing for the city blog page</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Meta Title</Label>
                            <Input required value={formData.meta_title} onChange={e => handleInputChange('meta_title', e.target.value)} placeholder="Kyoto Travel Guide: Temples & Traditions | Travel AI" />
                        </div>
                        <div className="space-y-2">
                            <Label>Meta Description</Label>
                            <Textarea required value={formData.meta_description} onChange={e => handleInputChange('meta_description', e.target.value)} placeholder="Discover the best of Kyoto..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Hero Description (2 Sentences)</Label>
                            <Textarea required value={formData.hero_description} onChange={e => handleInputChange('hero_description', e.target.value)} className="h-20" placeholder="Step back in time..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Full Overview (Multiple paragraphs)</Label>
                            <Textarea required value={formData.overview} onChange={e => handleInputChange('overview', e.target.value)} className="h-40" placeholder="Kyoto, once the capital of Japan..." />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Best Time To Visit (Months)</Label>
                                <Input required value={formData.best_time_months} onChange={e => handleInputChange('best_time_months', e.target.value)} placeholder="March to May (Spring) or Oct to Nov (Autumn)" />
                            </div>
                            <div className="space-y-2">
                                <Label>Best Time Reason</Label>
                                <Input required value={formData.best_time_reason} onChange={e => handleInputChange('best_time_reason', e.target.value)} placeholder="Cherry blossoms in spring and spectacular foliage in autumn." />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Arrays of Content */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Attractions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {formData.top_attractions.map((attr, i) => (
                            <div key={i} className="flex gap-4 items-start p-4 border rounded-xl bg-muted/20 relative">
                                <div className="flex-1 space-y-4">
                                    <Input placeholder="Attraction Name (e.g. Fushimi Inari Shrine)" value={attr.name} onChange={e => updateAttraction(i, 'name', e.target.value)} required />
                                    <Textarea placeholder="Description..." value={attr.description} onChange={e => updateAttraction(i, 'description', e.target.value)} required />
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removeAttraction(i)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={addAttraction} className="w-full border-dashed">
                            <Plus className="w-4 h-4 mr-2" /> Add Attraction
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Local Tips</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {formData.local_tips.map((tip, i) => (
                            <div key={i} className="flex gap-4">
                                <Input placeholder="e.g. Buy a JR Pass before arriving in Japan..." value={tip} onChange={e => updateLocalTip(i, e.target.value)} required />
                                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removeLocalTip(i)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={addLocalTip} className="w-full border-dashed">
                            <Plus className="w-4 h-4 mr-2" /> Add Tip
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Frequently Asked Questions (FAQ Schema)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {formData.faqs.map((faq, i) => (
                            <div key={i} className="flex gap-4 items-start p-4 border rounded-xl bg-muted/20 relative">
                                <div className="flex-1 space-y-4">
                                    <Input placeholder="Question" value={faq.q} onChange={e => updateFAQ(i, 'q', e.target.value)} required />
                                    <Textarea placeholder="Answer" value={faq.a} onChange={e => updateFAQ(i, 'a', e.target.value)} required />
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removeFAQ(i)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={addFAQ} className="w-full border-dashed">
                            <Plus className="w-4 h-4 mr-2" /> Add FAQ
                        </Button>
                    </CardContent>
                </Card>

                <div className="sticky bottom-4 z-10 flex justify-end">
                    <Button type="submit" size="lg" disabled={isSubmitting} className="shadow-2xl shadow-primary/30 w-full md:w-auto px-12">
                        {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Destination'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
