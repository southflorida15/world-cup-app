// src/engine/momentum/momentumEngine.js
// Momentum Engine Playground
//
// This module keeps Match Momentum isolated from the very large App.jsx file.
// It builds three comparable 90-minute signed momentum series from the same
// match inputs. Positive values belong to the home team; negative values belong
// to the away team. The UI can render all engines with the same chart component.

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const safeNum = n => Number.isFinite(Number(n)) ? Number(n) : 0;

function makeSeed(match, events) {
  return `${match?.home || ""}|${match?.away || ""}|${events?.length || 0}`
    .split("")
    .reduce((a, ch) => ((a * 31 + ch.charCodeAt(0)) >>> 0), 7);
}

function makeRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function statPressure(s = {}) {
  return (
    safeNum(s.shots) * 1.0 +
    safeNum(s.shotsOn) * 3.4 +
    safeNum(s.corners) * 2.2 +
    safeNum(s.blockedShots) * 0.75 +
    safeNum(s.accurateCrosses) * 0.45 +
    safeNum(s.saves) * 0.8 +
    safeNum(s.possession) * 0.035
  );
}

function addGaussian(arr, center, amp, width = 1.5) {
  const start = Math.max(1, Math.floor(center - width * 3));
  const end = Math.min(90, Math.ceil(center + width * 3));
  for (let m = start; m <= end; m++) {
    const d = m - center;
    arr[m - 1] += amp * Math.exp(-(d * d) / (2 * width * width));
  }
}

function smooth(arr, radius = 1) {
  if (!radius) return arr.slice();
  return arr.map((_, i) => {
    let sum = 0;
    let weight = 0;
    for (let d = -radius; d <= radius; d++) {
      const idx = i + d;
      if (idx < 0 || idx >= arr.length) continue;
      const w = radius + 1 - Math.abs(d);
      sum += arr[idx] * w;
      weight += w;
    }
    return weight ? sum / weight : arr[i];
  });
}

function organicBlend(values) {
  return values.map((v, i) => {
    const prev = i > 0 ? values[i - 1] : v;
    const next = i < values.length - 1 ? values[i + 1] : v;
    // Preserve sign changes, but soften comb-like adjacent jumps when the
    // same team owns neighboring minutes. This keeps the one-team-per-minute
    // model while making the chart feel more like a continuous match wave.
    const samePrev = Math.sign(prev || v) === Math.sign(v || prev);
    const sameNext = Math.sign(next || v) === Math.sign(v || next);
    const wp = samePrev ? 0.18 : 0.07;
    const wn = sameNext ? 0.18 : 0.07;
    const wc = 1 - wp - wn;
    return prev * wp + v * wc + next * wn;
  });
}

function deterministicVariance(values, seed) {
  let s = seed >>> 0;
  return values.map((v, i) => {
    // Deterministic pseudo-noise, stable for the same match. Small enough to
    // avoid fake randomness, large enough to prevent identical block heights.
    s = (s * 1103515245 + 12345 + i) >>> 0;
    const n = (s / 4294967296) - 0.5;
    const mag = Math.abs(v);
    if (mag < 3) return v;
    const factor = 0.86 + n * 0.32;
    return v * factor;
  });
}

function preserveEventPeaks(values, events = [], match, normTeam) {
  const out = values.slice();
  events.forEach(ev => {
    const min = clamp(safeNum(ev?.time?.elapsed) || 1, 1, 90);
    const idx = min - 1;
    const side = eventSide(ev, match, normTeam) === "home" ? 1 : -1;
    const base = ev.type === "Goal" ? 46 : (ev.type === "Card" && ev.detail === "Red Card") ? 42 : ev.type === "Card" ? 16 : ev.type === "subst" ? 7 : 0;
    if (!base) return;
    // Ensure the event minute has a visible peak in the correct direction,
    // then lightly shape the neighboring minutes so icons feel attached to
    // the wave rather than pasted on top.
    if (Math.abs(out[idx]) < base || Math.sign(out[idx]) !== side) out[idx] = side * base;
    for (const [d, w] of [[-2,0.25],[-1,0.55],[1,0.45],[2,0.18]]) {
      const j = idx + d;
      if (j < 0 || j >= out.length) continue;
      const target = side * base * w;
      if (Math.abs(out[j]) < Math.abs(target) * 0.8) out[j] += target * 0.65;
    }
  });
  return out;
}

function finalizeMomentum(values, options, context = {}) {
  const seed = context.seed ?? 7;
  let shaped = organicBlend(values);
  shaped = deterministicVariance(shaped, seed);
  shaped = preserveEventPeaks(shaped, context.events, context.match, context.normTeam);
  shaped = organicBlend(shaped);
  return normalizeSigned(shaped, options);
}

function rollingAverage(arr, radius = 4) {
  return arr.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let d = -radius; d <= radius; d++) {
      const idx = i + d;
      if (idx < 0 || idx >= arr.length) continue;
      sum += arr[idx];
      count++;
    }
    return count ? sum / count : arr[i];
  });
}

function normalizeSigned(values, { power = 0.62, maxOut = 84, floor = 0.7, dead = 0.012 } = {}) {
  const maxAbs = Math.max(10, ...values.map(v => Math.abs(v || 0)));
  return values.map((v, i) => {
    const raw = safeNum(v);
    if (Math.abs(raw) / maxAbs < dead) {
      const sign = raw < 0 ? -1 : 1;
      return { minute: i + 1, signed: sign * floor };
    }
    const sign = raw < 0 ? -1 : 1;
    const mag = Math.abs(raw) / maxAbs;
    return { minute: i + 1, signed: sign * Math.pow(mag, power) * maxOut };
  });
}

function eventSide(ev, match, normTeam) {
  const team = normTeam ? normTeam(ev?.team?.name || "") : (ev?.team?.name || "");
  return team === match?.home ? "home" : "away";
}

function distributeSyntheticEpisodes({ home, away, stats, rand }) {
  const hp = statPressure(stats?.home || {});
  const ap = statPressure(stats?.away || {});
  const total = Math.max(1, hp + ap);

  const homeCount = clamp(Math.round(2 + safeNum(stats?.home?.shots) / 9 + safeNum(stats?.home?.corners) / 5), 3, 9);
  const awayCount = clamp(Math.round(2 + safeNum(stats?.away?.shots) / 9 + safeNum(stats?.away?.corners) / 5), 2, 8);

  const homeAmp = 8 + 12 * (hp / total);
  const awayAmp = 8 + 12 * (ap / total);

  for (let i = 0; i < homeCount; i++) {
    const center = (90 / (homeCount + 1)) * (i + 1) + (rand() - 0.5) * 7;
    addGaussian(home, center, homeAmp * (0.75 + rand() * 0.75), 1.15 + rand() * 1.0);
  }
  for (let i = 0; i < awayCount; i++) {
    const center = (90 / (awayCount + 1)) * (i + 1) + (rand() - 0.5) * 7;
    addGaussian(away, center, awayAmp * (0.75 + rand() * 0.75), 1.15 + rand() * 1.0);
  }
}

function addEventThreat({ home, away, match, events, normTeam }) {
  events.forEach(ev => {
    const min = clamp(safeNum(ev?.time?.elapsed) || 1, 1, 90);
    const side = eventSide(ev, match, normTeam);
    const own = side === "home" ? home : away;
    const opp = side === "home" ? away : home;

    if (ev.type === "Goal") {
      // Goal: the scoring team gets a short explosive spike; the conceding
      // team gets a smaller immediate response after the restart.
      addGaussian(own, min, 70, 1.0);
      addGaussian(own, min + 1.4, 26, 1.3);
      addGaussian(opp, min + 3.0, 18, 1.8);
    } else if (ev.type === "Card" && ev.detail === "Red Card") {
      // Red card: the carded team gets a negative tactical shock; opponent
      // pressure rises briefly but should not create a full-match plateau.
      addGaussian(opp, min, 50, 1.05);
      addGaussian(opp, min + 2.5, 24, 1.7);
      addGaussian(own, min, 12, 0.9);
    } else if (ev.type === "Card") {
      addGaussian(opp, min, 15, 0.9);
    } else if (ev.type === "subst") {
      addGaussian(own, min, 7, 0.75);
    }
  });
}

function buildRelativeThreatEngine({ match, events = [], stats = {}, normTeam }) {
  const rand = makeRand(makeSeed(match, events));
  const home = Array(90).fill(0);
  const away = Array(90).fill(0);

  distributeSyntheticEpisodes({ home, away, stats, rand });
  addEventThreat({ home, away, match, events, normTeam });

  const hp = statPressure(stats?.home || {});
  const ap = statPressure(stats?.away || {});
  const total = Math.max(1, hp + ap);
  const bias = (hp - ap) / total;

  // Add tiny shared texture to both teams. Because the chart uses home-away,
  // shared texture cancels out unless one team is genuinely ahead.
  for (let i = 0; i < 90; i++) {
    const texture = 2.2 * Math.sin((i + 1) / 4.7) + 1.6 * Math.sin((i + 1) / 11.3);
    home[i] += Math.max(0, texture + bias * 2.0);
    away[i] += Math.max(0, -texture - bias * 2.0);
  }

  const homeS = smooth(home, 1);
  const awayS = smooth(away, 1);
  const direct = homeS.map((h, i) => h - awayS[i]);

  // ESPN-style breathing: display the local advantage, not total accumulated
  // dominance. This prevents possession-heavy teams from creating a permanent
  // wall above the baseline.
  const avg = rollingAverage(direct, 4);
  const relative = direct.map((v, i) => {
    const local = v - avg[i];
    // Make the chart read like minute-by-minute relative threat, not a
    // possession wall. The local component drives visible waves; the direct
    // component preserves match ownership.
    return v * 0.36 + local * 1.05;
  });

  return finalizeMomentum(relative, { power: 0.76, maxOut: 88, floor: 0.45, dead: 0.022 }, { seed: makeSeed(match, events), events, match, normTeam });
}

function buildSpikesEngine({ match, events = [], stats = {}, normTeam }) {
  const home = Array(90).fill(0);
  const away = Array(90).fill(0);
  addEventThreat({ home, away, match, events, normTeam });

  // Very light stat-based texture so empty stretches don't completely vanish.
  const hp = statPressure(stats?.home || {});
  const ap = statPressure(stats?.away || {});
  const total = Math.max(1, hp + ap);
  const bias = ((hp - ap) / total) * 3.5;
  const direct = home.map((h, i) => h - away[i] + bias * (0.5 + 0.5 * Math.sin((i + 1) / 6)));
  return finalizeMomentum(smooth(direct, 1), { power: 0.48, maxOut: 86, floor: 0.55, dead: 0.018 }, { seed: makeSeed(match, events) ^ 0x51f15e, events, match, normTeam });
}

function buildBalancedEngine({ match, events = [], momentum = [], stats = {}, normTeam }) {
  if (Array.isArray(momentum) && momentum.length) {
    const rows = momentum.slice(0, 90).map((m, i) => safeNum(m.signed ?? (safeNum(m.home) - safeNum(m.away))));
    return finalizeMomentum(rows, { power: 0.66, maxOut: 80, floor: 0.75, dead: 0.013 }, { seed: makeSeed(match, events) ^ 0xbadc0de, events, match, normTeam });
  }

  const rand = makeRand(makeSeed(match, events) ^ 0x9e3779b9);
  const home = Array(90).fill(0);
  const away = Array(90).fill(0);
  distributeSyntheticEpisodes({ home, away, stats, rand });
  addEventThreat({ home, away, match, events, normTeam });
  const direct = smooth(home, 2).map((h, i) => h - smooth(away, 2)[i]);
  return finalizeMomentum(direct, { power: 0.62, maxOut: 80, floor: 0.75, dead: 0.013 }, { seed: makeSeed(match, events) ^ 0x9e3779b9, events, match, normTeam });
}

export function buildMomentumEngineRows({ match, events = [], momentum = [], stats = {}, normTeam }) {
  const safeEvents = Array.isArray(events) ? events : [];
  return {
    hybrid: buildRelativeThreatEngine({ match, events: safeEvents, stats, normTeam }),
    spikes: buildSpikesEngine({ match, events: safeEvents, stats, normTeam }),
    balanced: buildBalancedEngine({ match, events: safeEvents, momentum, stats, normTeam }),
  };
}
