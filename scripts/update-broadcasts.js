import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as br from './adapters/brazil.js';
import * as mx from './adapters/mexico.js';
import * as us from './adapters/usa.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'broadcast-data');

// Minimal match list for immediate automation. Expand this or import from your app data later.
const MATCHES = [
  { id: 86, date: '2026-07-03', home: 'Argentina', away: 'Cape Verde' },
  { id: 87, date: '2026-07-03', home: 'Colombia', away: 'Ghana' },
  { id: 89, date: '2026-07-04', home: 'Paraguay', away: 'France' },
  { id: 90, date: '2026-07-04', home: 'Canada', away: 'Morocco' },
  { id: 91, date: '2026-07-05', home: 'Brazil', away: 'Norway' },
  { id: 92, date: '2026-07-05', home: 'Mexico', away: 'England' },
  { id: 93, date: '2026-07-06', home: 'Portugal', away: 'Spain' },
  { id: 94, date: '2026-07-06', home: 'United States', away: 'Belgium' },
  { id: 95, date: '2026-07-07', home: 'Argentina', away: 'Egypt' }
];

const adapters = [br, mx, us];
const args = new Set(process.argv.slice(2));

function withinScanWindow(match) {
  if (!args.has('--today')) return true;
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return match.date === today || match.date === tomorrow;
}

async function readCountryFile(country) {
  const file = path.join(dataDir, `${country}.json`);
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return { country, matches: {} };
  }
}

async function writeCountryFile(country, data) {
  await fs.mkdir(dataDir, { recursive: true });
  const file = path.join(dataDir, `${country}.json`);
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n');
}

async function run() {
  const matches = MATCHES.filter(withinScanWindow);
  console.log(`Scanning ${matches.length} match(es) across ${adapters.length} country adapter(s)...`);

  for (const adapter of adapters) {
    const countryData = await readCountryFile(adapter.country);
    countryData.matches ||= {};
    for (const match of matches) {
      try {
        console.log(`[${adapter.country}] ${match.id}: ${match.home} vs ${match.away}`);
        const result = await adapter.scanMatch(match);
        // Do not overwrite strong existing data with empty/low data.
        const existing = countryData.matches[String(match.id)];
        if ((result.tv.length || result.stream.length) || !existing) {
          countryData.matches[String(match.id)] = {
            matchId: match.id,
            home: match.home,
            away: match.away,
            date: match.date,
            ...result
          };
        }
      } catch (e) {
        console.error(`[${adapter.country}] failed for match ${match.id}:`, e.message);
      }
    }
    await writeCountryFile(adapter.country, countryData);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
