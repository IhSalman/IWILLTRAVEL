/**
 * Aircraft families travellers search for, mapped to ICAO type designators
 * (the `t` field in ADS-B data). Shared by the map (browser) and the server.
 */

export interface AircraftFamily {
    id: string;
    name: string;
    maker: string;
    /** ICAO type designators that belong to this family. */
    codes: string[];
    /** Extra words people type: "jumbo", "dreamliner"… */
    aliases?: string[];
    /** Worth a "rare plane" alert / highlight. */
    rare?: boolean;
}

export const AIRCRAFT_FAMILIES: AircraftFamily[] = [
    // Airbus
    { id: 'a220', name: 'Airbus A220', maker: 'Airbus', codes: ['BCS1', 'BCS3'], aliases: ['cseries', 'c series'] },
    { id: 'a318', name: 'Airbus A318', maker: 'Airbus', codes: ['A318'], rare: true },
    { id: 'a319', name: 'Airbus A319', maker: 'Airbus', codes: ['A319', 'A19N'] },
    { id: 'a320', name: 'Airbus A320', maker: 'Airbus', codes: ['A320', 'A20N'], aliases: ['a320neo'] },
    { id: 'a321', name: 'Airbus A321', maker: 'Airbus', codes: ['A321', 'A21N'], aliases: ['a321neo', 'a321xlr'] },
    { id: 'a300', name: 'Airbus A300', maker: 'Airbus', codes: ['A306', 'A30B'], rare: true },
    { id: 'a310', name: 'Airbus A310', maker: 'Airbus', codes: ['A310'], rare: true },
    { id: 'a330', name: 'Airbus A330', maker: 'Airbus', codes: ['A332', 'A333', 'A338', 'A339'], aliases: ['a330neo'] },
    { id: 'a340', name: 'Airbus A340', maker: 'Airbus', codes: ['A342', 'A343', 'A345', 'A346'], rare: true },
    { id: 'a350', name: 'Airbus A350', maker: 'Airbus', codes: ['A359', 'A35K'], aliases: ['a350-1000'] },
    { id: 'a380', name: 'Airbus A380', maker: 'Airbus', codes: ['A388'], aliases: ['superjumbo', 'a380-800'], rare: true },
    { id: 'beluga', name: 'Airbus Beluga', maker: 'Airbus', codes: ['A3ST', 'A337'], aliases: ['belugaxl', 'beluga xl', 'whale'], rare: true },
    { id: 'a400', name: 'Airbus A400M Atlas', maker: 'Airbus', codes: ['A400'], aliases: ['atlas'], rare: true },

    // Boeing
    { id: '717', name: 'Boeing 717', maker: 'Boeing', codes: ['B712'] },
    { id: '737-classic', name: 'Boeing 737 Classic', maker: 'Boeing', codes: ['B733', 'B734', 'B735'] },
    { id: '737ng', name: 'Boeing 737 NG', maker: 'Boeing', codes: ['B736', 'B737', 'B738', 'B739'], aliases: ['737-800', '737'] },
    { id: '737max', name: 'Boeing 737 MAX', maker: 'Boeing', codes: ['B37M', 'B38M', 'B39M', 'B3XM'], aliases: ['737 max', 'max 8'] },
    { id: '747', name: 'Boeing 747', maker: 'Boeing', codes: ['B741', 'B742', 'B743', 'B744', 'B748', 'B74S', 'B74R'], aliases: ['jumbo', 'jumbo jet', 'queen of the skies', '747-8'], rare: true },
    { id: 'dreamlifter', name: 'Boeing 747 Dreamlifter', maker: 'Boeing', codes: ['BLCF'], aliases: ['lcf'], rare: true },
    { id: '757', name: 'Boeing 757', maker: 'Boeing', codes: ['B752', 'B753'] },
    { id: '767', name: 'Boeing 767', maker: 'Boeing', codes: ['B762', 'B763', 'B764'] },
    { id: '777', name: 'Boeing 777', maker: 'Boeing', codes: ['B772', 'B773', 'B77L', 'B77W'], aliases: ['triple seven', '777-300er'] },
    { id: '777x', name: 'Boeing 777X', maker: 'Boeing', codes: ['B778', 'B779'], aliases: ['777-9'], rare: true },
    { id: '787', name: 'Boeing 787 Dreamliner', maker: 'Boeing', codes: ['B788', 'B789', 'B78X'], aliases: ['dreamliner'] },
    { id: 'md11', name: 'McDonnell Douglas MD-11', maker: 'McDonnell Douglas', codes: ['MD11'], rare: true },
    { id: 'dc10', name: 'McDonnell Douglas DC-10', maker: 'McDonnell Douglas', codes: ['DC10'], rare: true },

    // Regional
    { id: 'e-jet', name: 'Embraer E170/E175', maker: 'Embraer', codes: ['E170', 'E75L', 'E75S'] },
    { id: 'e190', name: 'Embraer E190/E195', maker: 'Embraer', codes: ['E190', 'E195', 'E290', 'E295'], aliases: ['e2'] },
    { id: 'erj', name: 'Embraer ERJ', maker: 'Embraer', codes: ['E135', 'E145'] },
    { id: 'crj', name: 'Bombardier CRJ', maker: 'Bombardier', codes: ['CRJ2', 'CRJ7', 'CRJ9', 'CRJX'] },
    { id: 'dash8', name: 'De Havilland Dash 8', maker: 'De Havilland', codes: ['DH8A', 'DH8B', 'DH8C', 'DH8D'], aliases: ['q400'] },
    { id: 'atr', name: 'ATR 42/72', maker: 'ATR', codes: ['AT43', 'AT45', 'AT46', 'AT72', 'AT75', 'AT76'] },
    { id: 'ssj', name: 'Sukhoi Superjet 100', maker: 'Sukhoi', codes: ['SU95'] },
    { id: 'c919', name: 'COMAC C919', maker: 'COMAC', codes: ['C919'], rare: true },
    { id: 'arj21', name: 'COMAC ARJ21', maker: 'COMAC', codes: ['AJ27'], rare: true },

    // Heavy cargo & military transports
    { id: 'an124', name: 'Antonov An-124 Ruslan', maker: 'Antonov', codes: ['A124'], aliases: ['ruslan'], rare: true },
    { id: 'il76', name: 'Ilyushin Il-76', maker: 'Ilyushin', codes: ['IL76'], rare: true },
    { id: 'c17', name: 'Boeing C-17 Globemaster III', maker: 'Boeing', codes: ['C17'], aliases: ['globemaster'], rare: true },
    { id: 'c5', name: 'Lockheed C-5 Galaxy', maker: 'Lockheed', codes: ['C5M'], aliases: ['galaxy'], rare: true },
    { id: 'c130', name: 'Lockheed C-130 Hercules', maker: 'Lockheed', codes: ['C130', 'C30J'], aliases: ['hercules'] },
    { id: 'kc135', name: 'Boeing KC-135 Stratotanker', maker: 'Boeing', codes: ['K35R'], rare: true },
    { id: 'b52', name: 'Boeing B-52 Stratofortress', maker: 'Boeing', codes: ['B52'], rare: true },

    // Business jets
    { id: 'gulfstream', name: 'Gulfstream (G450–G700)', maker: 'Gulfstream', codes: ['GLF4', 'GLF5', 'GLF6', 'GA6C', 'GA7C', 'GA8C'], aliases: ['g650', 'g700'] },
    { id: 'global', name: 'Bombardier Global', maker: 'Bombardier', codes: ['GLEX', 'GL5T', 'GL7T'], aliases: ['global 7500'] },
];

const CODE_TO_FAMILY = new Map<string, AircraftFamily>();
for (const f of AIRCRAFT_FAMILIES) for (const c of f.codes) CODE_TO_FAMILY.set(c, f);

/**
 * Designators behind the "Rare planes" button. Kept short on purpose: each code is one
 * upstream request to the free adsb.lol API, which rate-limits bursts.
 */
export const RARE_TYPE_CODES: string[] = [
    'A388', 'B748', 'B744', 'B74S', 'BLCF', 'A3ST', 'A337', 'A124',
    'MD11', 'A343', 'A346', 'A310', 'B778', 'B779', 'C919',
];

export function familyForCode(code: string | null | undefined): AircraftFamily | null {
    return code ? CODE_TO_FAMILY.get(code.toUpperCase()) ?? null : null;
}

export function getFamily(id: string): AircraftFamily | null {
    return AIRCRAFT_FAMILIES.find(f => f.id === id) ?? null;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s-]+/g, '');

/**
 * Schedule data names aircraft in words ("Airbus A380-800", "Boeing 787-9"), not ICAO codes.
 * Patterns are checked in order, so specific variants come before their family.
 */
const MODEL_NAME_PATTERNS: [string, RegExp][] = [
    ['beluga', /beluga|a300-?600st|a330-?743l/],
    ['dreamlifter', /dreamlifter|747-?400\s?lcf/],
    ['737max', /737\s?max|737-?(7|8|9|10)\b(?!0)/],
    ['777x', /777-?(8|9)\b|777x/],
    ['a380', /a380/], ['a350', /a350/], ['a340', /a340/], ['a330', /a330/], ['a310', /a310/], ['a300', /a300/],
    ['a321', /a321/], ['a320', /a320/], ['a319', /a319/], ['a318', /a318/], ['a220', /a220|cs(100|300)/],
    ['747', /747/], ['787', /787/], ['777', /777/], ['767', /767/], ['757', /757/],
    ['737-classic', /737-?(300|400|500)/], ['737ng', /737/], ['717', /717/],
    ['md11', /md-?11/], ['dc10', /dc-?10/],
    ['e190', /e(mbraer)?\s?-?19[05]|e2-?19[05]/], ['e-jet', /e(mbraer)?\s?-?17[05]/], ['erj', /erj|e(mbraer)?\s?-?1[34]5/],
    ['crj', /crj/], ['dash8', /dash\s?8|dhc-?8|q400/], ['atr', /atr/], ['c919', /c919/], ['arj21', /arj21|c909/],
    ['an124', /an-?124/], ['il76', /il-?76/],
];

/** Family for a model name from schedule data, e.g. "Airbus A380-800" → A380. */
export function familyForModelName(model: string | null | undefined): AircraftFamily | null {
    if (!model) return null;
    const m = model.toLowerCase();
    for (const [id, re] of MODEL_NAME_PATTERNS) if (re.test(m)) return getFamily(id);
    return null;
}

/**
 * The family the query names exactly ("a380", "B789", "dreamliner"), or null.
 * Used to prefer a model search over a flight-number search for inputs like "A380"
 * (which is also a valid flight number for airline A3).
 */
export function exactFamily(query: string): AircraftFamily | null {
    const q = norm(query);
    if (!q) return null;
    const byCode = CODE_TO_FAMILY.get(query.trim().toUpperCase());
    if (byCode) return byCode;
    return AIRCRAFT_FAMILIES.find(f =>
        [f.id, f.name, f.name.replace(/^(Airbus|Boeing|Embraer|Bombardier|ATR|COMAC)\s+/i, ''), ...(f.aliases ?? [])].some(n => norm(n) === q),
    ) ?? null;
}

/** Families matching what someone typed: "a380", "dreamliner", "B789", "747". */
export function searchFamilies(query: string, limit = 4): AircraftFamily[] {
    const q = norm(query);
    if (q.length < 2) return [];
    const exactCode = CODE_TO_FAMILY.get(query.trim().toUpperCase());
    const scored: { f: AircraftFamily; score: number }[] = [];
    for (const f of AIRCRAFT_FAMILIES) {
        const names = [f.id, f.name, f.name.replace(/^(Airbus|Boeing|Embraer|Bombardier|ATR|COMAC)\s+/i, ''), ...(f.aliases ?? [])].map(norm);
        let score = 0;
        if (f === exactCode) score = 100;
        else if (names.some(n => n === q)) score = 90;
        else if (names.some(n => n.startsWith(q))) score = 60;
        else if (names.some(n => n.includes(q)) && q.length >= 3) score = 30;
        if (score) scored.push({ f, score });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(s => s.f);
}
