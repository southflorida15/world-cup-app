// src/utils/broadcastCountry.js
// Country preference helper for broadcaster lookups.
// Priority: saved user preference -> browser locale -> US fallback.

export const BROADCAST_COUNTRY_STORAGE_KEY = "broadcastCountry";

export const BROADCAST_COUNTRIES = [
  { code: "MX", name: "Mexico", label: "🇲🇽 Mexico" },
  { code: "BR", name: "Brazil", label: "🇧🇷 Brazil" },
  { code: "US", name: "United States", label: "🇺🇸 United States" },
  { code: "CA", name: "Canada", label: "🇨🇦 Canada" },
  { code: "AR", name: "Argentina", label: "🇦🇷 Argentina" },
  { code: "ES", name: "Spain", label: "🇪🇸 Spain" },
  { code: "GB", name: "United Kingdom", label: "🇬🇧 United Kingdom" },
  { code: "OTHER", name: "Other", label: "🌍 Other" },
];

const SUPPORTED_CODES = new Set(BROADCAST_COUNTRIES.map(c => c.code));

export function normalizeCountryCode(value, fallback = "US") {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return fallback;
  if (raw === "UK") return "GB";
  if (raw === "MEX") return "MX";
  if (raw === "BRA") return "BR";
  if (SUPPORTED_CODES.has(raw)) return raw;
  const two = raw.slice(0, 2);
  return SUPPORTED_CODES.has(two) ? two : fallback;
}

export function detectCountryFromBrowser(fallback = "US") {
  if (typeof navigator === "undefined") return fallback;
  const locales = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
  for (const locale of locales) {
    const parts = String(locale).split("-");
    if (parts.length > 1) {
      const detected = normalizeCountryCode(parts[parts.length - 1], "");
      if (detected) return detected;
    }
  }
  return fallback;
}

export function getSavedBroadcastCountry() {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(BROADCAST_COUNTRY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveBroadcastCountry(country) {
  const code = normalizeCountryCode(country);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(BROADCAST_COUNTRY_STORAGE_KEY, code);
    } catch {
      // Ignore storage failures, such as private browsing restrictions.
    }
  }
  return code;
}

export function getBroadcastCountry(fallback = "US") {
  return normalizeCountryCode(
    getSavedBroadcastCountry() || detectCountryFromBrowser(fallback),
    fallback
  );
}

export function getBroadcastCountryLabel(country) {
  const code = normalizeCountryCode(country);
  return BROADCAST_COUNTRIES.find(c => c.code === code)?.label || "🌍 Other";
}
