// /api/score-matches.js
// Called by the client when it detects finished matches.
// Fetches live scores, finds newly finished matches, and submits scores
// to the predictor backend. Admin secret stays server-side.

import { Redis } from "@upstash/redis";

const kv = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const ADMIN_SECRET = process.env.PREDICTOR_ADMIN_SECRET;
const SCORED_KEY   = "wc2026:scored_matches"; // set of match IDs already scored

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { matches } = req.body || {};
    // matches = [{ id, hg, ag }] — finished matches from the client's live scores context

    if (!Array.isArray(matches) || !matches.length) {
      return res.status(200).json({ ok: true, scored: 0 });
    }

    if (!ADMIN_SECRET) {
      return res.status(500).json({ error: "PREDICTOR_ADMIN_SECRET not set" });
    }

    // Get already-scored match IDs
    const alreadyScored = await kv.smembers(SCORED_KEY) || [];
    const scoredSet = new Set(alreadyScored.map(String));

    let scored = 0;
    const errors = [];

    for (const m of matches) {
      const id = String(m.id);
      if (scoredSet.has(id)) continue; // already scored
      if (m.hg === null || m.ag === null) continue; // no score yet

      try {
        const origin = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers["x-forwarded-host"] || req.headers.host}`;
        const r = await fetch(`${origin}/api/predictor?action=score`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-secret": ADMIN_SECRET,
          },
          body: JSON.stringify({ matchId: id, hg: m.hg, ag: m.ag }),
        });

        if (r.ok) {
          await kv.sadd(SCORED_KEY, id);
          scoredSet.add(id);
          scored++;
          console.log(`[score-matches] scored match ${id}: ${m.hg}-${m.ag}`);
        } else {
          const err = await r.json().catch(() => ({}));
          errors.push(`match ${id}: ${err.error || r.status}`);
        }
      } catch(e) {
        errors.push(`match ${id}: ${e.message}`);
      }
    }

    return res.status(200).json({ ok: true, scored, errors });
  } catch(e) {
    console.error("[score-matches] error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
