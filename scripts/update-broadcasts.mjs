#!/usr/bin/env node
/**
 * Broadcast aggregation updater scaffold.
 *
 * Purpose: keep app broadcaster data source-backed, not guessed from fixture ids.
 * Run manually or from a future GitHub Action / Vercel Cron.
 *
 * This starter does not scrape pages by default because each source has different
 * terms/layouts. It provides a safe path: generate search queries, collect source
 * findings, then write reviewed overrides into src/data/broadcasting.js.
 */

import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("broadcast-research-queries.json");

const sources = {
  BR: [
    { provider:"UOL Esporte", query:'site:uol.com.br/esporte "{home} x {away}" "onde assistir" "Copa do Mundo"' },
    { provider:"ESPN Brasil", query:'site:espn.com.br "{home} x {away}" "onde assistir" "Copa do Mundo"' },
    { provider:"CNN Brasil", query:'site:cnnbrasil.com.br/esportes "{home} x {away}" "onde assistir"' },
  ],
  CO: [
    { provider:"El País Colombia", query:'site:elpais.com/america-colombia "{home}" "{away}" "dónde ver"' },
    { provider:"Caracol", query:'site:caracoltv.com "{home}" "{away}" Mundial' },
    { provider:"RCN", query:'site:canalrcn.com "{home}" "{away}" Mundial' },
  ],
  MX: [
    { provider:"TUDN", query:'site:tudn.com "{home}" "{away}" "dónde ver" Mundial' },
    { provider:"TV Azteca", query:'site:tvazteca.com "{home}" "{away}" Mundial' },
  ],
  US: [
    { provider:"FOX / Telemundo", query:'"{home}" "{away}" "World Cup" "FOX" "Telemundo"' },
  ],
};

function fill(tpl, match) {
  return tpl.replaceAll("{home}", match.home).replaceAll("{away}", match.away);
}

const exampleMatches = [
  { id:87, home:"Colombia", away:"Ghana", date:"2026-07-03" },
  { id:86, home:"Argentina", away:"Cape Verde", date:"2026-07-03" },
];

const results = [];
for (const match of exampleMatches) {
  for (const [country, configs] of Object.entries(sources)) {
    for (const source of configs) {
      results.push({ matchId:match.id, country, provider:source.provider, query:fill(source.query, match) });
    }
  }
}

fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
console.log(`Wrote ${results.length} source-research queries to ${OUT}`);
