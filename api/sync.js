// /api/sync.js
// Handles cross-device sync via PIN or email magic link.
//
// Actions:
//   POST ?action=pin-create   → generate PIN, store profile in KV, return PIN
//   POST ?action=pin-join     → look up PIN, return profile
//   POST ?action=magic-send   → generate magic token, send email via Resend
//   GET  ?action=magic-verify&token=XX → verify token, return profile
//   POST ?action=push         → save current state to KV (for synced user)
//   POST ?action=pull         → fetch latest state from KV

import { Redis } from "@upstash/redis";
const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const RESEND_API_KEY = process.env.RESEND_API_KEY; // add this to Vercel env vars
const APP_URL        = process.env.APP_URL || "https://world-cup-app-iota.vercel.app";
const APP_NAME       = "WC 2026";

function genPIN() {
  // 6-digit numeric PIN, avoiding ambiguous digits (0, 1)
  const digits = "23456789";
  return Array.from({ length: 6 }, () => digits[Math.floor(Math.random() * digits.length)]).join("");
}

function genToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action, token } = req.query;

  // ── PIN CREATE ────────────────────────────────────────────────────────────
  if (action === "pin-create" && req.method === "POST") {
    try {
      const { uid, saved, favTeams, dark, locationOverride, avatar, displayName, chosenPin } = req.body;
      if (!uid) return res.status(400).json({ error: "uid required" });

      let pin;
      if (chosenPin) {
        // User chose their own PIN — validate it
        if (!/^\d{6}$/.test(chosenPin)) return res.status(400).json({ error: "PIN must be 6 digits" });
        const existing = await kv.get(`pin:${chosenPin}`);
        if (existing && existing.uid !== uid) return res.status(409).json({ error: "That PIN is already taken. Please choose another." });
        pin = chosenPin;
      } else {
        // Generate a unique PIN as fallback
        let attempts = 0;
        do {
          pin = genPIN();
          attempts++;
          if (attempts > 20) return res.status(500).json({ error: "Could not generate unique PIN" });
        } while (await kv.get(`pin:${pin}`));
      }

      const profile = { uid, pin, saved: saved || [], favTeams: favTeams || [], dark, locationOverride, avatar: avatar || null, updatedAt: Date.now() };

      // Store by PIN and by UID
      await kv.set(`pin:${pin}`,  profile, { ex: 60 * 60 * 24 * 180 }); // 180 days
      await kv.set(`uid:${uid}`,  profile, { ex: 60 * 60 * 24 * 180 });

      return res.status(200).json({ ok: true, pin });
    } catch (err) {
      console.error("[sync] pin-create error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── PIN JOIN ──────────────────────────────────────────────────────────────
  if (action === "pin-join" && req.method === "POST") {
    try {
      const { pin } = req.body;
      if (!pin) return res.status(400).json({ error: "pin required" });

      const profile = await kv.get(`pin:${pin.trim()}`);
      if (!profile) return res.status(404).json({ error: "PIN not found" });

      return res.status(200).json({ ok: true, profile });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── MAGIC LINK SEND ───────────────────────────────────────────────────────
  if (action === "magic-send" && req.method === "POST") {
    try {
      const { email, uid, saved, favTeams, dark, locationOverride, avatar } = req.body;
      if (!email || !uid) return res.status(400).json({ error: "email and uid required" });

      const magicToken = genToken();

      // Save profile + pending token
      const profile = { uid, email, saved: saved || [], favTeams: favTeams || [], dark, locationOverride, avatar: avatar || null, updatedAt: Date.now() };
      await kv.set(`magic:${magicToken}`, { ...profile, email }, { ex: 60 * 15 }); // 15 min TTL
      await kv.set(`uid:${uid}`, profile, { ex: 60 * 60 * 24 * 180 });

      // Send email via Resend
      if (!RESEND_API_KEY) {
        // Dev mode — just return the token
        return res.status(200).json({ ok: true, dev: true, token: magicToken });
      }

      const magicUrl = `${APP_URL}/api/sync?action=magic-verify&token=${magicToken}`;
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${APP_NAME} <noreply@world-cup-app-iota.vercel.app>`,
          to: email,
          subject: "⚽ Your WC 2026 sign-in link",
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;background:#060e0a;color:#d4ead9;padding:32px;border-radius:16px">
              <div style="font-size:13px;color:#3d6a4d;font-weight:700;letter-spacing:.15em">FIFA</div>
              <div style="font-size:26px;font-weight:900;color:#d4ead9">WORLD CUP</div>
              <div style="font-size:26px;font-weight:900;color:#4ade80;margin-bottom:24px">2026</div>
              <p style="color:#d4ead9;font-size:15px;margin-bottom:24px">Tap the button below to sign in and sync your saved matches, predictions and favorite teams across all your devices.</p>
              <a href="${magicUrl}" style="display:inline-block;background:linear-gradient(135deg,#4ade80,#22c55e);color:#030a05;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none">⚽ Sign in to WC 2026</a>
              <p style="color:#3d6a4d;font-size:12px;margin-top:24px">This link expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
            </div>
          `,
        }),
      });

      if (!emailRes.ok) {
        const err = await emailRes.json().catch(() => ({}));
        throw new Error(err.message || `Resend returned ${emailRes.status}`);
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[sync] magic-send error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── MAGIC LINK VERIFY ─────────────────────────────────────────────────────
  if (action === "magic-verify" && req.method === "GET") {
    try {
      if (!token) return res.status(400).send("Missing token");

      const profile = await kv.get(`magic:${token}`);
      if (!profile) {
        // Token expired or invalid — redirect to app with error
        return res.redirect(302, `${APP_URL}?sync=expired`);
      }

      // Delete token (one-time use)
      await kv.del(`magic:${token}`);

      // Redirect to app with profile data encoded
      const encoded = encodeURIComponent(JSON.stringify({ uid: profile.uid, email: profile.email }));
      return res.redirect(302, `${APP_URL}?sync=ok&profile=${encoded}`);
    } catch (err) {
      return res.redirect(302, `${APP_URL}?sync=error`);
    }
  }

  // ── PUSH (save state to KV) ───────────────────────────────────────────────
  if (action === "push" && req.method === "POST") {
    try {
      const { uid, saved, favTeams, dark, locationOverride, avatar } = req.body;
      if (!uid) return res.status(400).json({ error: "uid required" });

      const existing = await kv.get(`uid:${uid}`) || {};
      const profile = { ...existing, uid, saved: saved || [], favTeams: favTeams || [], dark, locationOverride, avatar: avatar !== undefined ? avatar : (existing.avatar || null), displayName: displayName !== undefined ? displayName : (existing.displayName || ""), updatedAt: Date.now() };

      await kv.set(`uid:${uid}`, profile, { ex: 60 * 60 * 24 * 180 });
      // If user has a PIN, keep that entry in sync too
      if (existing.pin) {
        await kv.set(`pin:${existing.pin}`, profile, { ex: 60 * 60 * 24 * 180 });
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── PIN CHANGE ───────────────────────────────────────────────────────────
  if (action === "pin-change" && req.method === "POST") {
    try {
      const { uid, oldPin, newPin, saved, favTeams, dark, locationOverride, displayName, avatar } = req.body;
      if (!uid || !newPin) return res.status(400).json({ error: "uid and newPin required" });
      if (!/^\d{6}$/.test(newPin)) return res.status(400).json({ error: "PIN must be 6 digits" });

      // Check new PIN not taken by someone else
      const existing = await kv.get(`pin:${newPin}`);
      if (existing && existing.uid !== uid) return res.status(409).json({ error: "That PIN is already taken. Please choose another." });

      const profile = { uid, pin: newPin, saved: saved || [], favTeams: favTeams || [], dark, locationOverride, displayName: displayName || "", avatar: avatar || null, updatedAt: Date.now() };

      // Delete old PIN key
      if (oldPin && oldPin !== newPin) await kv.del(`pin:${oldPin}`);

      // Save under new PIN and uid
      await kv.set(`pin:${newPin}`, profile, { ex: 60 * 60 * 24 * 180 });
      await kv.set(`uid:${uid}`, profile, { ex: 60 * 60 * 24 * 180 });

      return res.status(200).json({ ok: true, pin: newPin });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── PULL (fetch state from KV) ────────────────────────────────────────────
  if (action === "pull" && req.method === "POST") {
    try {
      const { uid } = req.body;
      if (!uid) return res.status(400).json({ error: "uid required" });

      const profile = await kv.get(`uid:${uid}`);
      if (!profile) return res.status(404).json({ error: "No profile found" });

      return res.status(200).json({ ok: true, profile });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: "Unknown action" });
}
