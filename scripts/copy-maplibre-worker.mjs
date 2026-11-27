/**
 * MapLibre GL v6 runs its tile parsing in a separate module worker file.
 * Next.js bundles the main library but not that file, so copy it to /public
 * and point maplibregl.setWorkerUrl() at it (see src/components/flights/LiveFlightMap.tsx).
 * Runs automatically on `npm install` (postinstall).
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const src = 'node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs';
if (!existsSync(src)) {
    console.warn('[maplibre] worker not found, skipping copy');
    process.exit(0);
}
await mkdir('public/vendor', { recursive: true });
await copyFile(src, 'public/vendor/maplibre-gl-worker.mjs');
console.log('[maplibre] worker copied to public/vendor/maplibre-gl-worker.mjs');
