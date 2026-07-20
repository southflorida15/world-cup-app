// /api/scorers.js
// Aggregates goal scorers and assisters from all persisted match events in KV.
// Keys: wc2026:events:Home|Away → { events: [...], stats: {...} }

import { Redis } from "@upstash/redis";

const kv = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // List all persisted event keys
    const { keys = [] } = await kv.scan(0, { match: "wc2026:events:*", count: 200 });

    if (!keys.length) {
      return res.status(200).json({ scorers: [], assisters: [] });
    }

    // Fetch all match event records in one batched call instead of N
    // separate parallel kv.get requests (Promise.all of individual gets
    // still costs N round trips even running concurrently — mget batches
    // them into one).
    const records = await kv.mget(...keys).catch(() => keys.map(() => null));

    const goals = {};   // name → { name, team, goals, assists }
    const cards = {};   // name → { name, team, yellow, red }

    records.forEach(record => {
      if (!record?.events?.length) return;
      record.events.forEach(ev => {
        if (ev.type === "Goal" && ev.detail !== "Own Goal") {
          const name = ev.player?.name;
          const team = ev.team?.name;
          if (!name) return;
          if (!goals[name]) goals[name] = { name, team, goals: 0, assists: 0 };
          goals[name].goals++;
          // Count assist
          const assist = ev.assist?.name;
          if (assist) {
            if (!goals[assist]) goals[assist] = { name: assist, team, goals: 0, assists: 0 };
            goals[assist].assists++;
          }
        }
        if (ev.type === "Card") {
          const name = ev.player?.name;
          const team = ev.team?.name;
          if (!name) return;
          if (!cards[name]) cards[name] = { name, team, yellow: 0, red: 0 };
          if (ev.detail === "Yellow Card") cards[name].yellow++;
          if (ev.detail === "Red Card") cards[name].red++;
        }
      });
    });

    const scorers = Object.values(goals)
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
      .slice(0, 30);

    const mostCards = Object.values(cards)
      .sort((a, b) => (b.red * 2 + b.yellow) - (a.red * 2 + a.yellow))
      .slice(0, 20);

    res.setHeader("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json({ scorers, cards: mostCards, matchCount: keys.length });

  } catch(e) {
    console.error("[scorers]", e.message);
    return res.status(200).json({ scorers: [], cards: [], error: e.message });
  }
}
