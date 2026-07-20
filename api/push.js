// /api/push.js
// Combined: push subscription management + push notification sending
// POST ?action=subscribe  — saves subscription + match list
// POST ?action=notify     — sends notifications (called by cron, protected)

import { Redis } from "@upstash/redis";
import webpush from "web-push";

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

webpush.setVapidDetails(
  "mailto:admin@world-cup-app-iota.vercel.app",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const MATCH_UTC = {1:"2026-06-11T19:00:00Z",2:"2026-06-12T02:00:00Z",3:"2026-06-12T19:00:00Z",4:"2026-06-13T01:00:00Z",5:"2026-06-13T19:00:00Z",6:"2026-06-13T22:00:00Z",7:"2026-06-14T01:00:00Z",8:"2026-06-14T03:59:00Z",9:"2026-06-14T17:00:00Z",10:"2026-06-14T20:00:00Z",11:"2026-06-14T23:00:00Z",12:"2026-06-15T02:00:00Z",13:"2026-06-15T16:00:00Z",14:"2026-06-15T19:00:00Z",15:"2026-06-15T22:00:00Z",16:"2026-06-16T01:00:00Z",17:"2026-06-16T19:00:00Z",18:"2026-06-16T22:00:00Z",19:"2026-06-17T01:00:00Z",20:"2026-06-17T03:59:00Z",21:"2026-06-17T17:00:00Z",22:"2026-06-17T20:00:00Z",23:"2026-06-17T23:00:00Z",24:"2026-06-18T02:00:00Z",25:"2026-06-18T16:00:00Z",26:"2026-06-18T19:00:00Z",27:"2026-06-18T22:00:00Z",28:"2026-06-19T01:00:00Z",29:"2026-06-19T19:00:00Z",30:"2026-06-19T22:00:00Z",31:"2026-06-20T00:30:00Z",32:"2026-06-20T03:00:00Z",33:"2026-06-20T17:00:00Z",34:"2026-06-20T20:00:00Z",35:"2026-06-21T01:00:00Z",36:"2026-06-21T03:59:00Z",37:"2026-06-21T16:00:00Z",38:"2026-06-21T19:00:00Z",39:"2026-06-21T22:00:00Z",40:"2026-06-22T01:00:00Z",41:"2026-06-22T17:00:00Z",42:"2026-06-22T21:00:00Z",43:"2026-06-23T00:00:00Z",44:"2026-06-23T03:00:00Z",45:"2026-06-23T17:00:00Z",46:"2026-06-23T20:00:00Z",47:"2026-06-23T23:00:00Z",48:"2026-06-24T02:00:00Z",49:"2026-06-24T19:00:00Z",50:"2026-06-24T19:00:00Z",51:"2026-06-24T22:00:00Z",52:"2026-06-24T22:00:00Z",53:"2026-06-25T01:00:00Z",54:"2026-06-25T01:00:00Z",55:"2026-06-25T20:00:00Z",56:"2026-06-25T20:00:00Z",57:"2026-06-25T23:00:00Z",58:"2026-06-25T23:00:00Z",59:"2026-06-26T02:00:00Z",60:"2026-06-26T02:00:00Z",61:"2026-06-26T19:00:00Z",62:"2026-06-26T19:00:00Z",63:"2026-06-27T00:00:00Z",64:"2026-06-27T00:00:00Z",65:"2026-06-27T03:00:00Z",66:"2026-06-27T03:00:00Z",67:"2026-06-27T21:00:00Z",68:"2026-06-27T21:00:00Z",69:"2026-06-27T23:30:00Z",70:"2026-06-27T23:30:00Z",71:"2026-06-28T02:00:00Z",72:"2026-06-28T02:00:00Z"};

const DEFAULT_MINS_BEFORE = 30;
const WINDOW_MIN = 25;
const WINDOW_MAX = 35;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const action = req.query.action;

  // ── Save subscription ─────────────────────────────────────────────────────
  if (action === "subscribe") {
    try {
      const { subscription, matches, minsBefore, uid, pin } = req.body;
      if (!subscription?.endpoint) return res.status(400).json({ error: "No subscription" });
      const key = "push:" + Buffer.from(subscription.endpoint).toString("base64").slice(-40);
      await kv.set(key, { subscription, matches, minsBefore: minsBefore || 60, uid: uid || null, pin: pin || null, updatedAt: Date.now() }, { ex: 60 * 60 * 24 * 90 });
      // If PIN provided, add this device UID to the sync profile's known UIDs
      if (pin && uid) {
        const profile = await kv.get(`pin:${pin}`).catch(() => null);
        if (profile) {
          const knownUids = new Set(profile.knownUids || []);
          knownUids.add(uid);
          await kv.set(`pin:${pin}`, { ...profile, knownUids: [...knownUids] }).catch(() => {});
        }
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("push-subscribe error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Send notifications (cron) ─────────────────────────────────────────────
  if (action === "notify") {
    const auth = req.headers.authorization || "";
    const validSecret = process.env.CRON_SECRET || process.env.PREDICTOR_ADMIN_SECRET;
    // Vercel cron sends Authorization: Bearer $CRON_SECRET
    if (!validSecret || (auth !== `Bearer ${validSecret}` && req.headers["x-vercel-cron"] !== "1")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const now = Date.now();
    const results = { sent: 0, skipped: 0, errors: 0, removed: 0 };

    try {
      const upcomingMatchIds = Object.entries(MATCH_UTC)
        .filter(([, iso]) => {
          const minsUntilKO = (new Date(iso).getTime() - now) / 60000;
          return minsUntilKO >= WINDOW_MIN && minsUntilKO <= WINDOW_MAX;
        })
        .map(([id]) => Number(id));

      if (!upcomingMatchIds.length) {
        return res.status(200).json({ ...results, message: "No matches in window" });
      }

      let cursor = 0;
      const keys = [];
      do {
        const [nextCursor, batch] = await kv.scan(cursor, { match: "push:*", count: 100 });
        cursor = parseInt(nextCursor) || 0;
        keys.push(...batch);
      } while (cursor !== 0);

      if (!keys.length) return res.status(200).json({ ...results, message: "No subscribers" });

      await Promise.all(keys.map(async key => {
        try {
          const record = await kv.get(key);
          if (!record?.subscription || !record?.matches) return;
          const toNotify = record.matches.filter(m => upcomingMatchIds.includes(Number(m.id)));
          if (!toNotify.length) { results.skipped++; return; }
          const minsBeforeKO = record.minsBefore || DEFAULT_MINS_BEFORE;
          for (const m of toNotify) {
            const payload = JSON.stringify({
              title: `⚽ ${m.home} vs ${m.away} — 30 min to kickoff!`,
              body: `🎯 Made your fantasy pick? Picks lock at kickoff! · ${m.time} · ${m.venue?.split(",")[0] || ""}`,
              tag: `wc2026-match-${m.id}`,
              url: "/",
            });
            await webpush.sendNotification(record.subscription, payload);
            results.sent++;
          }
        } catch (err) {
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
      console.error("push-notify error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Broadcast — send custom push to ALL subscribers ──────────────────────
  if (action === "broadcast") {
    const auth = req.headers.authorization || "";
    const validSecret = process.env.CRON_SECRET || process.env.PREDICTOR_ADMIN_SECRET;
    if (!validSecret || auth !== `Bearer ${validSecret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { title, body, url = "/" } = req.body || {};
    if (!title || !body) return res.status(400).json({ error: "title and body required" });

    const results = { sent: 0, skipped: 0, errors: 0, removed: 0 };

    try {
      let cursor = 0;
      const keys = [];
      do {
        const [nextCursor, batch] = await kv.scan(cursor, { match: "push:*", count: 100 });
        cursor = parseInt(nextCursor) || 0;
        keys.push(...batch);
      } while (cursor !== 0);

      if (!keys.length) return res.status(200).json({ ...results, message: "No subscribers" });

      const payload = JSON.stringify({ title, body, tag: `wc2026-broadcast-${Date.now()}`, url });

      await Promise.all(keys.map(async key => {
        try {
          const record = await kv.get(key);
          if (!record?.subscription) { results.skipped++; return; }
          await webpush.sendNotification(record.subscription, payload);
          results.sent++;
        } catch (err) {
          if (err.statusCode === 410) {
            await kv.del(key);
            results.removed++;
          } else {
            console.error("Broadcast push error:", err.message);
            results.errors++;
          }
        }
      }));

      return res.status(200).json({ ok: true, ...results });
    } catch (err) {
      console.error("push-broadcast error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Notify single user by UID ─────────────────────────────────────────────
  if (action === "notify-user") {
    const auth = req.headers.authorization || "";
    const validSecret = process.env.CRON_SECRET || process.env.PREDICTOR_ADMIN_SECRET;
    if (!validSecret || auth !== `Bearer ${validSecret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { uid, pin, title, body, url = "/" } = req.body || {};
    if ((!uid && !pin) || !title || !body) return res.status(400).json({ error: "uid or pin, plus title and body required" });

    try {
      // First pass: collect all subscription keys
      let cursor = 0;
      const keys = [];
      do {
        const [nextCursor, batch] = await kv.scan(cursor, { match: "push:*", count: 100 });
        cursor = parseInt(nextCursor) || 0;
        keys.push(...batch);
      } while (cursor !== 0);

      // Resolve target UIDs from PIN lookup
      let targetUids = new Set();
      if (uid) targetUids.add(uid);
      if (pin) {
        const profile = await kv.get(`pin:${pin}`).catch(() => null);
        if (profile?.uid) targetUids.add(profile.uid);
        // Add all known device UIDs registered under this PIN
        if (profile?.knownUids) profile.knownUids.forEach(u => targetUids.add(u));
      }

      const payload = JSON.stringify({ title, body, tag: `wc2026-user-${Date.now()}`, url });
      let sent = 0, found = false;

      await Promise.all(keys.map(async key => {
        try {
          const record = await kv.get(key);
          if (!record?.subscription) return;
          // Match by UID in targetUids OR by PIN directly stored in subscription
          const matchUid = record.uid && targetUids.has(record.uid);
          const matchPin = pin && record.pin !== null && record.pin !== undefined && 
                           String(record.pin) === String(pin);
          if (!matchUid && !matchPin) return;
          found = true;
          await webpush.sendNotification(record.subscription, payload);
          sent++;
        } catch(e) {
          if (e.statusCode === 410) await kv.del(key).catch(() => {});
        }
      }));

      if (!found) return res.status(404).json({ ok: false, error: `No subscription found. User needs to tap "Notify all" in My Matches first.`, targetUids: [...targetUids] });
      return res.status(200).json({ ok: true, sent, targetUids: [...targetUids] });
    } catch(err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: "Missing action. Use ?action=subscribe, ?action=notify, ?action=broadcast, or ?action=notify-user" });
}
