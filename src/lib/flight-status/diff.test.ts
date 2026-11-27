import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ALERT_PREFS, diffSnapshots, nextCheckDelayMs, reminderEvents, resolvePrefs, type NotifiedState } from './diff';
import { mapFlight } from './aerodatabox';
import { normalizeFlightNumber, type FlightSnapshot } from './types';

/** Snapshot shaped like a real AeroDataBox response, run through the real mapper. */
function snap(over: {
    status?: string; depSched?: string; depRevised?: string | null; gate?: string | null; terminal?: string | null;
    model?: string | null; belt?: string | null; runwayDep?: string | null; arrRevised?: string | null;
} = {}): FlightSnapshot {
    const depSched = over.depSched ?? '2026-12-04 08:00Z';
    return mapFlight({
        number: 'BA 123',
        callSign: 'BAW123',
        status: over.status ?? 'Expected',
        isCargo: false,
        codeshareStatus: 'IsOperator',
        lastUpdatedUtc: '2026-12-04 06:00Z',
        airline: { name: 'British Airways', iata: 'BA', icao: 'BAW' },
        aircraft: over.model === null ? undefined : { model: over.model ?? 'Airbus A350-1000', reg: 'G-XWBA' },
        departure: {
            airport: { iata: 'LHR', icao: 'EGLL', name: 'London Heathrow', municipalityName: 'London', countryCode: 'GB', location: { lat: 51.47, lon: -0.45 } },
            scheduledTime: { utc: depSched, local: depSched.replace('Z', '+00:00') },
            revisedTime: over.depRevised ? { utc: over.depRevised, local: over.depRevised.replace('Z', '+00:00') } : undefined,
            runwayTime: over.runwayDep ? { utc: over.runwayDep, local: over.runwayDep.replace('Z', '+00:00') } : undefined,
            terminal: over.terminal ?? '5',
            gate: over.gate ?? null,
            quality: ['Basic', 'Live'],
        },
        arrival: {
            airport: { iata: 'JFK', icao: 'KJFK', name: 'New York JFK', municipalityName: 'New York', countryCode: 'US', location: { lat: 40.64, lon: -73.78 } },
            scheduledTime: { utc: '2026-12-04 16:00Z', local: '2026-12-04 11:00-05:00' },
            revisedTime: over.arrRevised ? { utc: over.arrRevised, local: over.arrRevised } : undefined,
            baggageBelt: over.belt ?? null,
            quality: ['Basic'],
        },
    }, '2026-12-04T06:00:00.000Z');
}

const prefs = DEFAULT_ALERT_PREFS;

test('mapFlight normalises AeroDataBox fields', () => {
    const s = snap({ depRevised: '2026-12-04 08:40Z', gate: 'A10' });
    assert.equal(s.flightNumber, 'BA123');
    assert.equal(s.status, 'scheduled');
    assert.equal(s.departure.iata, 'LHR');
    assert.equal(s.departure.scheduledUtc, '2026-12-04T08:00:00.000Z');
    assert.equal(s.departure.revisedUtc, '2026-12-04T08:40:00.000Z');
    assert.equal(s.departure.gate, 'A10');
    assert.equal(s.departure.live, true);
    assert.equal(mapFlight({ status: 'Canceled' }).status, 'cancelled');
    assert.equal(mapFlight({ status: 'Arrived' }).status, 'landed');
});

test('first snapshot sets a baseline without emailing gate, terminal or aircraft', () => {
    const { events, notified } = diffSnapshots(snap({ gate: 'A10' }), {}, prefs, true);
    assert.deepEqual(events, []);
    assert.equal(notified.gate, 'A10');
    assert.equal(notified.terminal, '5');
    assert.equal(notified.aircraft, 'Airbus A350-1000');
});

test('first snapshot still reports an existing delay', () => {
    const { events } = diffSnapshots(snap({ depRevised: '2026-12-04 08:45Z' }), {}, prefs, true);
    assert.equal(events.length, 1);
    assert.equal(events[0].kind, 'delay');
    assert.match(events[0].title, /delayed 45 min/);
});

test('delay below the threshold is ignored', () => {
    const { events } = diffSnapshots(snap({ depRevised: '2026-12-04 08:10Z' }), { delayMin: 0 }, prefs, false);
    assert.equal(events.filter(e => e.kind === 'delay').length, 0);
});

test('delay crossing the threshold alerts once, then only on 15+ minute moves', () => {
    const a = diffSnapshots(snap({ depRevised: '2026-12-04 08:30Z' }), { delayMin: 0 }, prefs, false);
    assert.equal(a.events.length, 1);
    assert.equal(a.notified.delayMin, 30);

    const b = diffSnapshots(snap({ depRevised: '2026-12-04 08:40Z' }), a.notified, prefs, false);
    assert.equal(b.events.length, 0, '10 more minutes is not worth another email');

    const c = diffSnapshots(snap({ depRevised: '2026-12-04 09:15Z' }), b.notified, prefs, false);
    assert.equal(c.events.length, 1);
    assert.match(c.events[0].title, /delayed 1h 15m/);
    assert.equal(c.events[0].severe, true);
});

test('a delay that clears sends "back on time"', () => {
    const { events } = diffSnapshots(snap({ depRevised: '2026-12-04 08:02Z' }), { delayMin: 40 }, prefs, false);
    assert.equal(events.length, 1);
    assert.match(events[0].title, /back on time/);
});

test('same state twice produces no events (no repeat emails)', () => {
    const first = diffSnapshots(snap({ depRevised: '2026-12-04 08:50Z', gate: 'B7' }), { delayMin: 0, gate: 'B7', terminal: '5', aircraft: 'Airbus A350-1000' }, prefs, false);
    const again = diffSnapshots(snap({ depRevised: '2026-12-04 08:50Z', gate: 'B7' }), first.notified, prefs, false);
    assert.deepEqual(again.events, []);
});

test('gate change and terminal change are reported', () => {
    const base: NotifiedState = { gate: 'A10', terminal: '5', aircraft: 'Airbus A350-1000' };
    const { events } = diffSnapshots(snap({ gate: 'C22', terminal: '3' }), base, prefs, false);
    const kinds = events.map(e => e.kind).sort();
    assert.deepEqual(kinds, ['gate', 'terminal']);
    assert.match(events.find(e => e.kind === 'gate')!.detail, /A10 to C22/);
});

test('aircraft swap is reported, a different spelling of the same model is not', () => {
    const base: NotifiedState = { aircraft: 'Airbus A350-1000', terminal: '5' };
    const swap = diffSnapshots(snap({ model: 'Boeing 777-300ER' }), base, prefs, false);
    assert.equal(swap.events.filter(e => e.kind === 'aircraft_swap').length, 1);
    const same = diffSnapshots(snap({ model: 'Airbus A350 1000' }), base, prefs, false);
    assert.equal(same.events.filter(e => e.kind === 'aircraft_swap').length, 0);
});

test('cancellation is reported once and short-circuits other checks', () => {
    const a = diffSnapshots(snap({ status: 'Canceled', gate: 'Z9' }), { gate: 'A1' }, prefs, false);
    assert.deepEqual(a.events.map(e => e.kind), ['cancelled']);
    assert.equal(a.events[0].severe, true);
    const b = diffSnapshots(snap({ status: 'Canceled' }), a.notified, prefs, false);
    assert.deepEqual(b.events, []);
});

test('"may be cancelled" then confirmed cancellation are two alerts', () => {
    const a = diffSnapshots(snap({ status: 'CanceledUncertain' }), {}, prefs, false);
    assert.match(a.events[0].title, /may be cancelled/);
    const b = diffSnapshots(snap({ status: 'Canceled' }), a.notified, prefs, false);
    assert.match(b.events[0].title, /has been cancelled/);
});

test('landing reports the baggage belt; user preferences switch kinds off', () => {
    const landed = snap({ status: 'Arrived', belt: '7', runwayDep: '2026-12-04 08:05Z', arrRevised: '2026-12-04 15:50Z' });
    const a = diffSnapshots(landed, { departed: true }, prefs, false);
    const landedEvent = a.events.find(e => e.kind === 'landed');
    assert.ok(landedEvent);
    assert.match(landedEvent!.detail, /belt 7/);
    assert.equal(a.events.filter(e => e.kind === 'belt').length, 0, 'belt is folded into the landing email');

    const off = resolvePrefs({ kinds: { landed: false } });
    assert.equal(diffSnapshots(landed, { departed: true }, off, false).events.filter(e => e.kind === 'landed').length, 0);
});

test('resolvePrefs ignores unknown kinds and silly thresholds', () => {
    const p = resolvePrefs({ kinds: { delay: false, bogus: true }, minDelayMinutes: 1 });
    assert.equal(p.kinds.delay, false);
    assert.equal((p.kinds as Record<string, boolean>).bogus, undefined);
    assert.equal(p.minDelayMinutes, 15);
});

test('reminders: check-in at ~24h, day-of summary at ~3h, each once', () => {
    const s = snap({ gate: 'A10' });
    const r1 = reminderEvents(s, {}, prefs, new Date('2026-12-03T10:00:00Z'));
    assert.deepEqual(r1.events.map(e => e.kind), ['checkin_reminder']);
    const r2 = reminderEvents(s, r1.notified, prefs, new Date('2026-12-03T11:00:00Z'));
    assert.deepEqual(r2.events, []);
    const r3 = reminderEvents(s, r2.notified, prefs, new Date('2026-12-04T06:00:00Z'));
    assert.deepEqual(r3.events.map(e => e.kind), ['day_of_travel']);
    assert.match(r3.events[0].detail, /gate A10/);
});

test('check schedule tightens near departure and stops after landing', () => {
    const s = snap();
    const MIN = 60_000;
    assert.equal(nextCheckDelayMs(s, new Date('2026-12-01T08:00:00Z')), 6 * 60 * MIN);
    assert.equal(nextCheckDelayMs(s, new Date('2026-12-03T20:00:00Z')), 60 * MIN);
    assert.equal(nextCheckDelayMs(s, new Date('2026-12-04T06:30:00Z')), 10 * MIN);
    assert.equal(nextCheckDelayMs(snap({ status: 'Canceled' }), new Date('2026-12-04T06:30:00Z')), null);
    assert.equal(nextCheckDelayMs(snap({ status: 'Arrived', belt: '4' }), new Date('2026-12-04T16:10:00Z')), null);
    assert.equal(nextCheckDelayMs(null, new Date(), 6), null, 'gives up after repeated "not found"');
});

test('normalizeFlightNumber', () => {
    assert.equal(normalizeFlightNumber('ba 0123'), 'BA123');
    assert.equal(normalizeFlightNumber('U2-1234'), 'U21234');
    assert.equal(normalizeFlightNumber('BAW12'), 'BAW12');
});
