// Unit-economics model for docs/pricing-plan.md. Run: node scripts/pricing-model.mjs
// All inputs are assumptions at the top; edit and re-run when real usage data comes in.
const EUR = 0.87;          // 1 USD -> EUR (assumption)
const VAT = 0.20;          // EU consumer prices are VAT-inclusive
const stripe = p => p*0.022 + 0.25 + p*0.007; // ~2.2% blended card + €0.25 + Billing 0.7% (on gross)
// Google + LLM cost per itinerary (USD)
const g = {
  current:  { fixed: 0.236, perDay: 0.227, cache: 0.35 },
  optimized:{ fixed: 0.236, perDay: 0.152, cache: 0.40 },
};
const LLM = 0.02;
const trip = (mode, days, warm=true) => LLM + (g[mode].fixed + g[mode].perDay*days)*(warm?1-g[mode].cache:1);
const FLIGHT = 0.10, AIRPORT = 0.50, TTS = 0.05, EMAIL = 0.0004, PDF = 0.01;
console.log('Per-trip USD cold/warm  current 3d', trip('current',3,false).toFixed(2), trip('current',3).toFixed(2),
  ' 5d', trip('current',5,false).toFixed(2), trip('current',5).toFixed(2),
  ' 10d', trip('current',10,false).toFixed(2), trip('current',10).toFixed(2));
console.log('Per-trip USD cold/warm  optim   3d', trip('optimized',3,false).toFixed(2), trip('optimized',3).toFixed(2),
  ' 5d', trip('optimized',5,false).toFixed(2), trip('optimized',5).toFixed(2),
  ' 10d', trip('optimized',10,false).toFixed(2), trip('optimized',10).toFixed(2));
const profiles = {
  'Free (active)':        { price: 0, lite:true, trips: 1,  days: 3,  flights: 0, airports: 0, tts: 0,  emails: 3 },
  'Trip Pass €5.99':      { price: 5.99,         trips: 1,  days: 10, flights: 2, airports: 0, tts: 0,  emails: 12, pdf: 1 },
  'Traveler mo typical':  { price: 7.99,         trips: 2,  days: 6,  flights: 2, airports: 0, tts: 0,  emails: 15, pdf: 1 },
  'Traveler mo heavy':    { price: 7.99,         trips: 5,  days: 12, flights: 5, airports: 0, tts: 0,  emails: 40, pdf: 3 },
  'Traveler yr (€59)':    { price: 59/12, annual:59, trips: 1,  days: 6,  flights: 1.5, airports: 0, tts: 0, emails: 10, pdf: 1 },
  'Pro mo typical':       { price: 16.99,        trips: 4,  days: 7,  flights: 6, airports: 1, tts: 10, emails: 40, pdf: 2 },
  'Pro mo heavy':         { price: 16.99,        trips: 10, days: 10, flights: 25,airports: 3, tts: 30, emails: 150, pdf: 6 },
  'Pro yr (€119)':         { price: 119/12, annual:119, trips: 2,  days: 7,  flights: 4, airports: 1, tts: 5, emails: 25, pdf: 1 },
  'OLD Starter €6 typical':{ price: 6,           trips: 2,  days: 6,  flights: 2, airports: 0, tts: 0,  emails: 15, pdf: 1 },
  'OLD Pro €12 typical':  { price: 12,           trips: 4,  days: 7,  flights: 6, airports: 1, tts: 10, emails: 40, pdf: 2 },
  'OLD pack €2=50 trips': { price: 2, oneoff:true, trips: 50, days: 5, flights: 0, airports: 0, tts: 0, emails: 0 },
};
const out = {};
for (const mode of ['current','optimized']) {
  console.log(`\n== ${mode} costs ==`);
  console.log('profile'.padEnd(24),'gross€','net€','stripe€','cost€','profit€','margin');
  for (const [k,p] of Object.entries(profiles)) {
    const costUSD = p.trips*(p.lite ? LLM + (g[mode].fixed + g[mode].perDay*p.days)*0.2 : trip(mode,p.days)) + p.flights*FLIGHT + p.airports*AIRPORT + p.tts*TTS + p.emails*EMAIL + (p.pdf||0)*PDF;
    const cost = costUSD*EUR;
    const net = p.price/(1+VAT);
    const fee = p.price===0?0:(p.annual? stripe(p.annual)/12 : stripe(p.price));
    const profit = net - fee - cost;
    out[mode+k]={net,fee,cost,profit};
    console.log(k.padEnd(24), p.price.toFixed(2).padStart(6), net.toFixed(2).padStart(5), fee.toFixed(2).padStart(6), cost.toFixed(2).padStart(6), profit.toFixed(2).padStart(7), net? ((profit/net*100).toFixed(0)+'%').padStart(6):'  -');
  }
}
// Business scenario (optimized costs), monthly
let FIXED_USD = 170;
function scenario(name, paid, freeRatio, passes, fixedUsd) { FIXED_USD = fixedUsd;
  const m = { 'Traveler mo typical':0.35, 'Traveler mo heavy':0.05, 'Traveler yr (€59)':0.20, 'Pro mo typical':0.17, 'Pro mo heavy':0.03, 'Pro yr (€119)':0.20 };
  let net=0,fee=0,cost=0;
  for (const [k,s] of Object.entries(m)) { const r=out['optimized'+k]; net+=r.net*s*paid; fee+=r.fee*s*paid; cost+=r.cost*s*paid; }
  const tp=out['optimizedTrip Pass €5.99']; net+=tp.net*passes; fee+=tp.fee*passes; cost+=tp.cost*passes;
  const free = out['optimizedFree (active)'].cost * paid*freeRatio;
  const fixed = FIXED_USD*EUR;
  const profit = net-fee-cost-free-fixed;
  console.log(`${name.padEnd(34)} paid ${String(paid).padStart(5)} free-trip-users ${String(paid*freeRatio).padStart(6)} passes ${String(passes).padStart(4)} | net €${net.toFixed(0).padStart(6)} stripe ${fee.toFixed(0).padStart(4)} var ${cost.toFixed(0).padStart(5)} free ${free.toFixed(0).padStart(5)} fixed ${fixed.toFixed(0)} | profit €${profit.toFixed(0).padStart(6)} = ${(profit/net*100).toFixed(0)}%`);
}
console.log('\n== business scenarios (optimized, new prices) ==');
scenario('Launch', 50, 10, 20, 90);
scenario('Launch, free 3x more active', 50, 30, 20, 90);
scenario('Growth', 500, 10, 150, 200);
scenario('Scale', 3000, 10, 800, 500);
scenario('Scale, free 2.5x more active', 3000, 25, 800, 500);
