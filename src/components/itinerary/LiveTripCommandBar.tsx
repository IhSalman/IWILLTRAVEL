'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Radio,
    CloudRain,
    ShieldCheck,
    Ticket,
    Loader2,
    WifiOff,
    Plane,
    Building2,
    X,
    CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { DisruptionAlertCard, type DisruptionAlert } from '@/components/dashboard/DisruptionAlertCard';
import { toast } from 'sonner';

interface Props {
    itineraryId: string;
    initialStatus?: string;
    flights: any[];
    hotels: any[];
    isOfflineFallback?: boolean;
    onItineraryUpdated: (updatedItinerary: any) => void;
}

export default function LiveTripCommandBar({
    itineraryId,
    initialStatus = 'saved',
    flights,
    hotels,
    isOfflineFallback = false,
    onItineraryUpdated,
}: Props) {
    const [status, setStatus] = useState(initialStatus);
    const [isToggling, setIsToggling] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [alerts, setAlerts] = useState<DisruptionAlert[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);

    // HITL Booking Saga Modal State
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [activeQuote, setActiveQuote] = useState<any>(null);
    const [consentChecked, setConsentChecked] = useState(false);
    const [passengerName, setPassengerName] = useState('');
    const [passengerEmail, setPassengerEmail] = useState('');

    const loadAlertsAndBookings = useCallback(async () => {
        if (isOfflineFallback) return;
        try {
            const [alertsRes, bookingsRes] = await Promise.all([
                fetch(`/api/disruption/resolve?itineraryId=${itineraryId}`),
                fetch(`/api/bookings?itineraryId=${itineraryId}`),
            ]);
            if (alertsRes.ok) {
                const aData = await alertsRes.json();
                setAlerts(Array.isArray(aData.alerts) ? aData.alerts : []);
            }
            if (bookingsRes.ok) {
                const bData = await bookingsRes.json();
                const list = Array.isArray(bData.bookings) ? bData.bookings : [];
                setBookings(list);
                try {
                    localStorage.setItem(`dgis_offline_bookings_${itineraryId}`, JSON.stringify(list));
                } catch {
                    // ignore storage quota
                }
            }
        } catch {
            // Load offline cached bookings if network unavailable
            try {
                const cached = localStorage.getItem(`dgis_offline_bookings_${itineraryId}`);
                if (cached) setBookings(JSON.parse(cached));
            } catch {
                // ignore
            }
        }
    }, [itineraryId, isOfflineFallback]);

    useEffect(() => {
        loadAlertsAndBookings();

        // Supabase Realtime listener for instant disruption alerts (§6.6.2)
        const supabase = createClient();
        const channel = supabase
            .channel(`trip-alerts-${itineraryId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'disruption_alerts',
                    filter: `itinerary_id=eq.${itineraryId}`,
                },
                () => {
                    loadAlertsAndBookings();
                    toast.warning('Live Trip Sentinel detected an update for your itinerary!');
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [itineraryId, loadAlertsAndBookings]);

    const toggleLiveMode = async () => {
        setIsToggling(true);
        const nextStatus = status === 'active' ? 'saved' : 'active';
        try {
            const res = await fetch(`/api/itineraries/${itineraryId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus }),
            });
            if (!res.ok) throw new Error('Failed to update live status');
            setStatus(nextStatus);
            toast.success(
                nextStatus === 'active'
                    ? 'Live Itinerary Mode enabled — Sentinel monitoring active!'
                    : 'Trip set back to Planned mode.'
            );
        } catch (err: any) {
            toast.error(err.message || 'Could not toggle status');
        } finally {
            setIsToggling(false);
        }
    };

    const runLiveScan = async () => {
        setIsScanning(true);
        try {
            const res = await fetch('/api/cron/live-trip-monitor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itineraryId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Live scan failed');

            if (Array.isArray(data.alerts)) {
                setAlerts(data.alerts);
            } else {
                await loadAlertsAndBookings();
            }

            if (data.alertsCreated > 0) {
                toast.warning(`Live Sentinel proposed ${data.alertsCreated} schedule adjustment(s)!`);
            } else {
                toast.success(data.advisories?.[0] || 'All venues, weather, and opening hours verified clear!');
            }
        } catch (err: any) {
            toast.error(err.message || 'Live scan unavailable');
        } finally {
            setIsScanning(false);
        }
    };

    const startQuote = async (type: 'flight' | 'hotel', item: any) => {
        setQuoteLoading(true);
        setConsentChecked(false);
        try {
            const title =
                type === 'flight'
                    ? `${item.airline || 'Flight'} (${item.from} → ${item.to})`
                    : `${item.name} (${item.city})`;
            const res = await fetch('/api/bookings/quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itineraryId,
                    bookingType: type,
                    offerId: item.offerId || item.id || `offer_${Date.now()}`,
                    itemTitle: title,
                    amount: Number(item.price || 150),
                    currency: item.currency || 'USD',
                    provider: item.source || 'amadeus',
                    itemDetails: item,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to lock quote');
            setActiveQuote(data);
        } catch (err: any) {
            toast.error(err.message || 'Quote failed');
        } finally {
            setQuoteLoading(false);
        }
    };

    const confirmHitlBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeQuote || !consentChecked) return;
        setConfirmLoading(true);
        try {
            const res = await fetch('/api/bookings/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId: activeQuote.bookingId,
                    consentToken: activeQuote.consentToken,
                    consentConfirmed: true,
                    passengerDetails: {
                        fullName: passengerName,
                        email: passengerEmail,
                    },
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Booking rolled back');

            toast.success(`Booking confirmed! Reference: ${data.providerReference}`);
            setActiveQuote(null);
            setStatus('active');
            await loadAlertsAndBookings();
        } catch (err: any) {
            toast.error(err.message || 'Transaction aborted safely');
        } finally {
            setConfirmLoading(false);
        }
    };

    return (
        <div className="mb-6 space-y-4">
            {/* Offline Banner */}
            {isOfflineFallback && (
                <div className="flex items-center gap-2.5 text-xs text-slate-400">
                    <WifiOff className="h-3.5 w-3.5 shrink-0 text-sunrise-300" />
                    <span>You’re offline — showing the copy of this trip saved on your device.</span>
                </div>
            )}

            {/* Main Live Control Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] px-4 py-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleLiveMode}
                        disabled={isToggling || isOfflineFallback}
                        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                            status === 'active'
                                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                : 'border-white/15 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                        }`}
                    >
                        <Radio className={`h-3.5 w-3.5 ${status === 'active' ? 'animate-pulse text-emerald-400' : 'text-slate-400'}`} />
                        {status === 'active' ? 'Live mode on' : 'Turn on live mode'}
                    </button>

                    <span className="hidden sm:inline text-xs text-slate-500">
                        {status === 'active'
                            ? 'Watching flights, weather and opening hours'
                            : 'Get alerts and re-plans if weather or flights change'}
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={isScanning || isOfflineFallback}
                        onClick={runLiveScan}
                        className="h-8 rounded-full border-white/15 bg-white/[0.04] text-xs text-slate-200 hover:bg-white/[0.08]"
                    >
                        {isScanning ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-slate-400" />
                        ) : (
                            <CloudRain className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                        )}
                        Check conditions
                    </Button>

                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowBookingModal(true)}
                        className="h-8 rounded-full border-white/15 bg-transparent text-xs text-slate-200 hover:bg-white/[0.06]"
                    >
                        <Ticket className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                        Bookings ({bookings.filter((b) => b.state === 'confirmed').length})
                    </Button>
                </div>
            </div>

            {/* Active Disruption / Weather / Venue Closure Cards */}
            {alerts.length > 0 && (
                <div className="space-y-3">
                    {alerts.map((alert) => (
                        <DisruptionAlertCard
                            key={alert.id}
                            alert={alert}
                            onResolve={(alertId, _action, updatedItinerary) => {
                                setAlerts((prev) => prev.filter((a) => a.id !== alertId));
                                if (updatedItinerary) {
                                    onItineraryUpdated(updatedItinerary);
                                    toast.success('Schedule updated and backup snapshot saved!');
                                }
                            }}
                        />
                    ))}
                </div>
            )}

            {/* HITL Saga Booking & Wallet Modal (§6.6.1) */}
            {showBookingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#121317] p-6 text-slate-200 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2.5">
                                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                                <div>
                                    <h3 className="text-base font-semibold text-white">
                                        HITL Autonomous Booking & Traveler Wallet
                                    </h3>
                                    <p className="text-[11px] text-slate-400 font-mono">
                                        Explicit Consent · Manual Payment Hold · Zero-Charge Saga Rollback
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowBookingModal(false);
                                    setActiveQuote(null);
                                }}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Confirmed Reservations Wallet */}
                        {bookings.filter((b) => b.state === 'confirmed').length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-300">
                                    Confirmed Traveler Passes (Synced Offline)
                                </h4>
                                {bookings
                                    .filter((b) => b.state === 'confirmed')
                                    .map((b) => (
                                        <div
                                            key={b.id}
                                            className="flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3 text-xs"
                                        >
                                            <div>
                                                <p className="font-semibold text-white">{b.item_title}</p>
                                                <p className="text-[11px] text-slate-400">
                                                    Passenger: {b.passenger_details?.fullName || 'Traveler'} ·{' '}
                                                    {b.currency} {Number(b.amount).toFixed(2)}
                                                </p>
                                            </div>
                                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-mono">
                                                PNR: {b.provider_reference}
                                            </Badge>
                                        </div>
                                    ))}
                            </div>
                        )}

                        {/* Step 2: Active Quote HITL Consent Form */}
                        {activeQuote ? (
                            <form
                                onSubmit={confirmHitlBooking}
                                className="rounded-xl border border-sky-500/30 bg-sky-500/[0.05] p-4 space-y-4"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className="text-[10px] font-mono uppercase text-sky-300">
                                            Price Lock Quote · Expires{' '}
                                            {new Date(activeQuote.expiresAt).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                        <h4 className="text-sm font-semibold text-white mt-0.5">
                                            {activeQuote.itemTitle}
                                        </h4>
                                    </div>
                                    <span className="text-base font-bold text-emerald-300">
                                        {activeQuote.currency} {Number(activeQuote.amount).toFixed(2)}
                                    </span>
                                </div>

                                <p className="text-xs text-slate-300 bg-black/30 rounded-lg p-2.5">
                                    {activeQuote.cancellationPolicy}
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] text-slate-400">Traveler Full Name</label>
                                        <Input
                                            required
                                            value={passengerName}
                                            onChange={(e) => setPassengerName(e.target.value)}
                                            placeholder="e.g. Ismail Salman"
                                            className="mt-1 bg-white/5 border-white/10 text-xs text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-slate-400">Confirmation Email</label>
                                        <Input
                                            required
                                            type="email"
                                            value={passengerEmail}
                                            onChange={(e) => setPassengerEmail(e.target.value)}
                                            placeholder="traveler@example.com"
                                            className="mt-1 bg-white/5 border-white/10 text-xs text-white"
                                        />
                                    </div>
                                </div>

                                <label className="flex items-start gap-2.5 text-xs text-slate-200 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={consentChecked}
                                        onChange={(e) => setConsentChecked(e.target.checked)}
                                        className="mt-0.5 rounded border-white/20"
                                    />
                                    <span>
                                        I explicitly authorize DGIS to execute this reservation ({activeQuote.currency}{' '}
                                        {Number(activeQuote.amount).toFixed(2)}) with automatic rollback protection if
                                        provider confirmation fails.
                                    </span>
                                </label>

                                <div className="flex gap-2">
                                    <Button
                                        type="submit"
                                        disabled={!consentChecked || confirmLoading}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                                    >
                                        {confirmLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                        ) : (
                                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                        )}
                                        Confirm HITL Reservation
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setActiveQuote(null)}
                                        className="text-xs text-slate-400"
                                    >
                                        Back
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            /* Step 1: Select Verified Flight or Hotel Offer to Lock Quote */
                            <div className="space-y-4">
                                {flights.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="flex items-center gap-1.5 text-xs font-mono uppercase text-slate-400">
                                            <Plane className="h-3.5 w-3.5 text-sky-400" /> Recommended Flights
                                        </h4>
                                        {flights.slice(0, 3).map((f, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs"
                                            >
                                                <div>
                                                    <p className="font-medium text-white">
                                                        {f.airline || 'Carrier'} · {f.from} → {f.to}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400">
                                                        {f.date} · {f.duration || 'Direct'} · {f.source || 'GDS'}
                                                    </p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    disabled={quoteLoading || isOfflineFallback}
                                                    onClick={() => startQuote('flight', f)}
                                                    className="h-7 bg-sky-600 hover:bg-sky-500 text-white text-xs"
                                                >
                                                    Lock ${f.price}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {hotels.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="flex items-center gap-1.5 text-xs font-mono uppercase text-slate-400">
                                            <Building2 className="h-3.5 w-3.5 text-violet-400" /> Recommended Stays
                                        </h4>
                                        {hotels.slice(0, 3).map((h, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs"
                                            >
                                                <div>
                                                    <p className="font-medium text-white">{h.name}</p>
                                                    <p className="text-[11px] text-slate-400">
                                                        {h.roomType || 'Standard'} · {h.rating ? `${h.rating}/10` : 'Verified'} ·{' '}
                                                        {h.source || 'GDS'}
                                                    </p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    disabled={quoteLoading || isOfflineFallback}
                                                    onClick={() => startQuote('hotel', h)}
                                                    className="h-7 bg-violet-600 hover:bg-violet-500 text-white text-xs"
                                                >
                                                    Lock ${h.price}/nt
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {flights.length === 0 && hotels.length === 0 && (
                                    <p className="text-xs text-slate-400 text-center py-4">
                                        Generate a trip with flights or hotels enabled to lock direct offers here.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
