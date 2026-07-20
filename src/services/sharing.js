export function buildMatchShareUrl(match, extras = {}) {
  const params = new URLSearchParams();

  Object.entries({
    id: match?.id,
    home: match?.home,
    away: match?.away,
    date: match?.date,
    time: match?.time,
    venue: match?.venue,
    group: match?.group,
    stage: match?.stage,

    ...extras,
  }).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      params.set(k, String(v));
    }
  });

  return `${window.location.origin}/match?${params.toString()}`;
}

export async function copyMatchLink(url) {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export async function nativeShare({ title, text, url }) {
  if (!navigator.share) return false;

  try {
    await navigator.share({
      title,
      text,
      url,
    });
    return true;
  } catch {
    return false;
  }
}

export async function shareMatch({
  match,
  url,
  title,
  text,
}) {
  const ok = await nativeShare({
    title:
      title ||
      `${match.home} vs ${match.away}`,
    text:
      text ||
      `${match.home} vs ${match.away}`,
    url,
  });

  if (ok) return "shared";

  const copied = await copyMatchLink(url);

  return copied ? "copied" : "failed";
}