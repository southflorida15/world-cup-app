const STORAGE_KEY = "wc_fantasy_picks";

export function loadFantasyPicks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveFantasyPick(matchId, home, away) {
  const picks = loadFantasyPicks();

  picks[matchId] = {
    home,
    away,
    updatedAt: Date.now(),
  };

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(picks)
  );

  return picks;
}

export function getFantasyPick(matchId) {
  const picks = loadFantasyPicks();
  return picks[matchId] || null;
}

export function deleteFantasyPick(matchId) {
  const picks = loadFantasyPicks();

  delete picks[matchId];

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(picks)
  );

  return picks;
}