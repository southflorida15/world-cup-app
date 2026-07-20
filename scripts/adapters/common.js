import * as cheerio from 'cheerio';

export const USER_AGENT = 'Mozilla/5.0 (compatible; WC2026BroadcastBot/1.0; +https://github.com/southflorida15/world-cup-app)';

export async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return await res.text();
}

export function htmlToText(html) {
  const $ = cheerio.load(html);
  $('script,style,noscript,svg').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}

export function normalize(s = '') {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function foundAny(text, names) {
  const n = normalize(text);
  return names.filter(name => n.includes(normalize(name)));
}

export function unique(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

export function buildQuery(match, country) {
  const vs = country === 'BR' ? 'x' : 'vs';
  const where = country === 'BR' ? 'onde assistir' : country === 'MX' ? 'dónde ver' : 'where to watch';
  return `${match.home} ${vs} ${match.away} ${where} Copa do Mundo 2026`;
}

export function confidenceFromSources(sourceCount) {
  if (sourceCount >= 2) return 'high';
  if (sourceCount === 1) return 'medium';
  return 'low';
}
