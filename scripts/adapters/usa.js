import { fetchText, htmlToText, foundAny, unique, confidenceFromSources } from './common.js';

const TV = ['FOX', 'FS1', 'Telemundo', 'Universo'];
const STREAM = ['Peacock', 'Tubi', 'FOX One'];

export const country = 'US';
export const sources = [
  { name: 'FOX Sports', search: (m) => `https://www.foxsports.com/search?q=${encodeURIComponent(`${m.home} ${m.away} World Cup 2026`)}` },
  { name: 'Telemundo', search: (m) => `https://www.telemundo.com/search?q=${encodeURIComponent(`${m.home} ${m.away} Mundial 2026`)}` }
];

export async function scanMatch(match) {
  const hits = [];
  for (const src of sources) {
    try {
      const html = await fetchText(src.search(match));
      const text = htmlToText(html);
      const tv = foundAny(text, TV);
      const stream = foundAny(text, STREAM);
      if (tv.length || stream.length) hits.push({ source: src.name, tv, stream });
    } catch (e) {
      hits.push({ source: src.name, error: e.message, tv: [], stream: [] });
    }
  }
  const valid = hits.filter(h => h.tv.length || h.stream.length);
  return {
    tv: unique(valid.flatMap(h => h.tv)),
    stream: unique(valid.flatMap(h => h.stream)),
    confidence: confidenceFromSources(valid.length),
    verified: valid.length >= 1,
    sources: valid.map(h => h.source),
    updatedAt: new Date().toISOString()
  };
}
