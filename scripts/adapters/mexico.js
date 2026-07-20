import { fetchText, htmlToText, foundAny, unique, confidenceFromSources } from './common.js';

const TV = ['Canal 5', 'TUDN', 'Azteca 7', 'Las Estrellas'];
const STREAM = ['ViX', 'TUDN app'];

export const country = 'MX';
export const sources = [
  { name: 'TUDN', search: (m) => `https://www.tudn.com/buscar/${encodeURIComponent(`${m.home} ${m.away} donde ver`)}` },
  { name: 'TV Azteca', search: (m) => `https://www.tvazteca.com/aztecadeportes/buscar?text=${encodeURIComponent(`${m.home} ${m.away} dónde ver`)}` },
  { name: 'AS México', search: (m) => `https://mexico.as.com/resultados/buscador/?q=${encodeURIComponent(`${m.home} ${m.away} dónde ver Mundial 2026`)}` }
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
