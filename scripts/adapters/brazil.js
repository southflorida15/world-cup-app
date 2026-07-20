import { fetchText, htmlToText, foundAny, unique, confidenceFromSources } from './common.js';

const TV = ['Globo', 'SporTV', 'SBT', 'N Sports', 'Band'];
const STREAM = ['CazéTV', 'geTV', 'Globoplay', 'YouTube'];

export const country = 'BR';
export const sources = [
  { name: 'UOL', search: (m) => `https://www.uol.com.br/esporte/busca/?q=${encodeURIComponent(`${m.home} x ${m.away} onde assistir Copa do Mundo 2026`)}` },
  { name: 'ge', search: (m) => `https://ge.globo.com/busca/?q=${encodeURIComponent(`${m.home} x ${m.away} onde assistir Copa do Mundo 2026`)}` },
  { name: 'ESPN Brasil', search: (m) => `https://www.espn.com.br/search/_/q/${encodeURIComponent(`${m.home} x ${m.away} onde assistir`)}` }
];

export async function scanMatch(match) {
  const hits = [];
  for (const src of sources) {
    try {
      const html = await fetchText(src.search(match));
      const text = htmlToText(html);
      const tv = foundAny(text, TV);
      const stream = foundAny(text, STREAM).map(x => x === 'YouTube' ? 'CazéTV' : x);
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
