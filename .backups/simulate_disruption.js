const http = require('http');

/**
 * Disruption Simulation Script for IWILLTRAVEL
 * ─────────────────────────────────────────────────────────────
 * This script mimics a "Canceled Flight" ping from Aviationstack.
 * It targets your local development server.
 * 
 * Usage: node simulate_disruption.js
 */

const PAYLOAD = JSON.stringify({
  flight: { iata: 'TK123' },
  airline: { name: 'Turkish Airlines' },
  departure: { airport: 'IST', scheduled: '2026-03-27T10:00:00Z' },
  arrival: { airport: 'LHR' },
  flight_status: 'cancelled'
});

const OPTIONS = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhooks/flight-status',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': PAYLOAD.length,
    'x-webhook-secret': 'test-secret' // We will use a fallback secret for local testing
  }
};

console.log('🚀 Triggering Mock Disruption for TK123...');

const req = http.request(OPTIONS, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('✅ Status:', res.statusCode);
    console.log('📦 Response:', data);
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.log('💡 Note: Ensure your local dev server (npm run dev) is running on port 3000.');
});

req.write(PAYLOAD);
req.end();
