/** Tests for route checking, airline code conversion, EU261, FAA parsing and aircraft matching. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRoute } from './route-check';
import { flightNumberForCallsign, parseFlightNumber, callsignsForFlightNumber, airlineEuUkCountry } from './airlines';
import { checkCompensation, whichScheme } from './eu261';
import { parseFaaStatus } from './faa';
import { exactFamily, familyForCode, familyForModelName, searchFamilies } from './aircraft-types';
import { cityToIata, getAirport } from './airports';

const LHR = { lat: 51.47, lon: -0.45 };
const JFK = { lat: 40.64, lon: -73.78 };

test('route check: on the great circle and heading to destination is confirmed', () => {
    // Mid-Atlantic, roughly on the LHR–JFK great circle, heading west.
    const r = checkRoute({ origin: LHR, destination: JFK, aircraft: { lat: 54.0, lon: -30.0, track: 255, ground: false } });
    assert.equal(r.confidence, 'confirmed');
});

test('route check: aircraft flying the other way is unverified', () => {
    const r = checkRoute({ origin: LHR, destination: JFK, aircraft: { lat: 54.0, lon: -30.0, track: 75, ground: false } });
    assert.equal(r.confidence, 'unverified');
});

test('route check: aircraft somewhere else entirely is unverified', () => {
    const r = checkRoute({ origin: LHR, destination: JFK, aircraft: { lat: 25.2, lon: 55.3, track: 270, ground: false } });
    assert.equal(r.confidence, 'unverified');
});

test('route check: near the departure airport heading is ignored (climb-out turns)', () => {
    const r = checkRoute({ origin: LHR, destination: JFK, aircraft: { lat: 51.6, lon: -0.6, track: 90, ground: false } });
    assert.notEqual(r.confidence, 'unverified');
});

test('route check: same origin and destination (bad data) is unverified', () => {
    assert.equal(checkRoute({ origin: LHR, destination: LHR, aircraft: { lat: 50, lon: 0, track: 0, ground: false } }).confidence, 'unverified');
});

test('flight numbers: parse and convert between ticket numbers and callsigns', async () => {
    assert.deepEqual(parseFlightNumber('ba 0123'), { airline: 'BA', kind: 'iata', number: '123' });
    assert.deepEqual(parseFlightNumber('BAW123'), { airline: 'BAW', kind: 'icao', number: '123' });
    assert.equal(parseFlightNumber('hello'), null);
    assert.equal(parseFlightNumber('1234'), null);
    assert.equal(flightNumberForCallsign('BAW123'), 'BA123');
    assert.equal(flightNumberForCallsign('UAE5V'), null, 'alphanumeric callsigns have no ticket number');
    assert.equal(flightNumberForCallsign('THY6504'), 'TK6504');
    assert.deepEqual(await callsignsForFlightNumber('BA123'), ['BAW123']);
    assert.deepEqual(await callsignsForFlightNumber('U2 1234'), ['EZY1234']);
});

test('airline licence country for EU261', () => {
    assert.equal(airlineEuUkCountry('BA'), 'GB');
    assert.equal(airlineEuUkCountry('DLH'), 'DE');
    assert.equal(airlineEuUkCountry('EK'), null);
});

test('EU261: which scheme applies', () => {
    assert.equal(whichScheme('FR', 'US', 'US'), 'EU261', 'departing the EU on any airline');
    assert.equal(whichScheme('US', 'FR', 'FR'), 'EU261', 'arriving on an EU airline');
    assert.equal(whichScheme('US', 'FR', 'US'), null, 'arriving on a non-EU airline');
    assert.equal(whichScheme('GB', 'ES', 'GB'), 'UK261');
    assert.equal(whichScheme('AE', 'IN', 'AE'), null);
});

test('EU261: amounts by distance and delay', () => {
    const base = { depCountry: 'DE', arrCountry: 'US', carrierCountry: 'DE', cancelled: false };
    assert.equal(checkCompensation({ ...base, distanceKm: 6200, arrivalDelayMinutes: 200 }).amount, '€600');
    assert.equal(checkCompensation({ ...base, distanceKm: 6200, arrivalDelayMinutes: 150 }).eligible, 'no');
    assert.equal(checkCompensation({ ...base, arrCountry: 'GR', distanceKm: 1800, arrivalDelayMinutes: 240 }).amount, '€400');
    assert.equal(checkCompensation({ ...base, arrCountry: 'PT', distanceKm: 3900, arrivalDelayMinutes: 240 }).amount, '€400', 'intra-EU flights over 3,500 km are capped at €400');
    assert.equal(checkCompensation({ ...base, arrCountry: 'FR', distanceKm: 700, arrivalDelayMinutes: 185 }).amount, '€250');
    assert.equal(checkCompensation({ depCountry: 'GB', arrCountry: 'US', carrierCountry: 'GB', distanceKm: 5500, arrivalDelayMinutes: 300 }).amount, '£520');
    const cancel = checkCompensation({ ...base, distanceKm: 900, arrivalDelayMinutes: null, cancelled: true });
    assert.equal(cancel.eligible, 'maybe');
    assert.equal(checkCompensation({ ...base, distanceKm: 900, arrivalDelayMinutes: null, cancelled: true, cancellationNoticeDays: 20 }).eligible, 'no');
});

test('FAA status XML parsing', () => {
    const xml = `<AIRPORT_STATUS_INFORMATION><Delay_type><Name>Ground Stop Programs</Name><Ground_Stop_List><Program><ARPT>LGA</ARPT><Reason>thunderstorms</Reason><End_Time>8:30 pm EST</End_Time></Program></Ground_Stop_List></Delay_type>
<Delay_type><Name>Ground Delay Programs</Name><Ground_Delay_List><Ground_Delay><ARPT>EWR</ARPT><Reason>low ceilings</Reason><Avg>1 hour and 2 minutes</Avg><Max>2 hours</Max></Ground_Delay></Ground_Delay_List></Delay_type>
<Delay_type><Name>General Arrival/Departure Delay Info</Name><Arrival_Departure_Delay_List><Delay><ARPT>SFO</ARPT><Reason>wind</Reason><Arrival_Departure Type="Arrival"><Min>16 minutes</Min><Max>30 minutes</Max><Trend>Increasing</Trend></Arrival_Departure></Delay></Arrival_Departure_Delay_List></Delay_type>
<Delay_type><Name>Airport Closures</Name><Airport_Closure_List><Airport><ARPT>LAX</ARPT><Reason>NOTAM</Reason></Airport></Airport_Closure_List></Delay_type></AIRPORT_STATUS_INFORMATION>`;
    const d = parseFaaStatus(xml);
    assert.deepEqual(d.map(x => [x.airport, x.kind]), [['LGA', 'ground_stop'], ['EWR', 'ground_delay'], ['SFO', 'arrival_delay']]);
    assert.match(d[0].detail, /until 8:30 pm EST/);
    assert.match(d[2].detail, /16 minutes–30 minutes \(increasing\)/);
});

test('aircraft models: codes, names and search', () => {
    assert.equal(familyForCode('A388')?.id, 'a380');
    assert.equal(familyForModelName('Airbus A380-800')?.id, 'a380');
    assert.equal(familyForModelName('Boeing 737-800')?.id, '737ng');
    assert.equal(familyForModelName('Boeing 737 MAX 8')?.id, '737max');
    assert.equal(familyForModelName('Boeing 777-9')?.id, '777x');
    assert.equal(familyForModelName('Boeing 777-300ER')?.id, '777');
    assert.equal(familyForModelName('Boeing 747-400 LCF Dreamlifter')?.id, 'dreamlifter');
    assert.equal(familyForModelName('Airbus A330-743L Beluga XL')?.id, 'beluga');
    assert.equal(exactFamily('A380')?.id, 'a380', '"A380" is a model, not airline A3 flight 80');
    assert.equal(exactFamily('dreamliner')?.id, '787');
    assert.equal(exactFamily('BA123'), null);
    assert.equal(searchFamilies('jumbo')[0]?.id, '747');
});

test('local airport lookups replace the Amadeus location API', () => {
    assert.equal(getAirport('lhr')?.icao, 'EGLL');
    assert.equal(getAirport('EGLL')?.iata, 'LHR');
    assert.equal(cityToIata('Kuopio'), 'KUO');
    assert.equal(cityToIata('CDG'), 'CDG');
    assert.ok(['CDG', 'ORY'].includes(cityToIata('Paris') ?? ''));
});
