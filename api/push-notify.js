// /api/push-notify.js
// Called by cron every 15 min — sends push notifications for matches starting in ~60 min
// Matches the same cron-job.org setup used for score updates (hit with Bearer CRON_SECRET)

import { kv } from "@vercel/kv";
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:admin@world-cup-app-iota.vercel.app",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Match kickoff times in UTC — must stay in sync with MATCH_UTC in App.jsx
// Only including group stage for brevity; add knockout times as they're confirmed
const MATCH_UTC = {
  1:  "2026-06-11T23:00:00Z",
  2:  "2026-06-12T02:00:00Z",
  3:  "2026-06-12T19:00:00Z",
  4:  "2026-06-13T01:00:00Z",
  5:  "2026-06-13T19:00:00Z",
  6:  "2026-06-13T22:00:00Z",
  7:  "2026-06-14T01:59:00Z",
  8:  "2026-06-14T03:59:00Z",
  9:  "2026-06-14T19:00:00Z",
  10: "2026-06-14T22:00:00Z",
  11: "2026-06-15T01:00:00Z",
  12: "2026-06-15T19:00:00Z",
  13: "2026-06-15T22:00:00Z",
  14: "2026-06-16T00:00:00Z",  // adjusted
  15: "2026-06-16T19:00:00Z",
  16: "2026-06-17T01:00:00Z",
};

// How many minutes before KO to notify (user preference stored with subscription)
const DEFAULT_MINS_BEFORE = 60;

// Window: fire if match starts between now+45min and now+75min (catches every 15-min cron run)
const WINDOW_MIN = 45;
const WINDOW_MAX = 75;

export default async function handler(req, res) {
  // Auth check
  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = Date.now();
  const results = { sent: 0, skipped: 0, errors: 0, removed: 0 };

  try {
    // Find matches in the notification window
    const upcomingMatchIds = Object.entries(MATCH_UTC)
      .filter(([, iso]) => {
        const koTime = new Date(iso).getTime();
        const minsUntilKO = (koTime - now) / 60000;
        return minsUntilKO >= WINDOW_MIN && minsUntilKO <= WINDOW_MAX;
      })
      .map(([id]) => Number(id));

    if (upcomingMatchIds.length === 0) {
      return res.status(200).json({ ...results, message: "No matches in window" });
    }

    // Scan all push subscriptions from KV
    const keys = await kv.keys("push:*");
    if (!keys.length) return res.status(200).json({ ...results, message: "No subscribers" });

    await Promise.all(keys.map(async key => {
      try {
        const record = await kv.get(key);
        if (!record?.subscription || !record?.matches) return;

        // Find saved matches that are in the notification window
        const toNotify = record.matches.filter(m => upcomingMatchIds.includes(Number(m.id)));
        if (!toNotify.length) { results.skipped++; return; }

        const minsBeforeKO = record.minsBefore || DEFAULT_MINS_BEFORE;

        for (const m of toNotify) {
          const payload = JSON.stringify({
            title: `⚽ Kick-off in ${minsBeforeKO} min!`,
            body: `${m.home} vs ${m.away} · ${m.time} · ${m.venue?.split(",")[0] || ""}`,
            tag: `wc2026-match-${m.id}`,
            url: "/",
          });

          await webpush.sendNotification(record.subscription, payload);
          results.sent++;
        }
      } catch (err) {
        // 410 Gone = subscription expired/revoked — clean it up
        if (err.statusCode === 410) {
          await kv.del(key);
          results.removed++;
        } else {
          console.error("Push send error:", err.message);
          results.errors++;
        }
      }
    }));

    return res.status(200).json(results);
  } catch (err) {
    console.error("push-notify error:", err);
    return res.status(500).json({ error: err.message });
  }
}
