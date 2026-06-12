// BracketMatchCard.jsx
// Standalone bracket match card with venue city + tap to open match detail.
// Drop into src/components/ and integrate into BracketMatchup / WideBracketView.
//
// Props:
//   match       — match ID number (e.g. 73)
//   t1, t2      — team names or "TBD"
//   winner      — winning team name (or null)
//   onPick      — called with team name when user picks a winner
//   interactive — show pick buttons
//   compact     — smaller size (for tree view)
//   onMatchTap  — called with MATCHES entry when user taps the card header/venue
//   C           — color theme object (pass from parent)
//   Crest       — Crest component (pass from parent)

import React from "react";

// Venue lookup for all 32 knockout matches (IDs 73–104)
// City extracted from MATCHES venue field
const KO_CITY = {
  73:  "Los Angeles",
  74:  "Houston",
  75:  "Boston",
  76:  "Guadalupe",
  77:  "Dallas",
  78:  "East Rutherford",
  79:  "Los Angeles",
  80:  "Kansas City",
  81:  "Miami",
  82:  "Seattle",
  83:  "Atlanta",
  84:  "Vancouver",
  85:  "Philadelphia",
  86:  "Zapopan",
  87:  "Toronto",
  88:  "Kansas City",
  89:  "Houston",
  90:  "Philadelphia",
  91:  "East Rutherford",
  92:  "Mexico City",
  93:  "Dallas",
  94:  "Seattle",
  95:  "Atlanta",
  96:  "Vancouver",
  97:  "Boston",
  98:  "Los Angeles",
  99:  "Miami",
  100: "Kansas City",
  101: "Dallas",
  102: "Atlanta",
  103: "Miami",
  104: "East Rutherford",
};

// Date lookup for knockout matches
const KO_DATE = {
  73:"Jun 28", 74:"Jun 29", 75:"Jun 29", 76:"Jun 29",
  77:"Jun 30", 78:"Jun 30", 79:"Jul 1",  80:"Jul 1",
  81:"Jul 2",  82:"Jul 2",  83:"Jul 3",  84:"Jul 3",
  85:"Jul 3",  86:"Jul 3",  87:"Jul 4",  88:"Jul 4",
  89:"Jul 4",  90:"Jul 4",  91:"Jul 5",  92:"Jul 5",
  93:"Jul 6",  94:"Jul 6",  95:"Jul 7",  96:"Jul 7",
  97:"Jul 9",  98:"Jul 10", 99:"Jul 11", 100:"Jul 11",
  101:"Jul 14",102:"Jul 15",103:"Jul 18",104:"Jul 19",
};

export default function BracketMatchCard({
  match,
  t1,
  t2,
  winner,
  onPick,
  interactive = false,
  compact = false,
  onMatchTap = null,
  C,
  Crest,
}) {
  const canPick = interactive && t1 && t2 && t1 !== "TBD" && t2 !== "TBD";
  const city = KO_CITY[match] || "";
  const date = KO_DATE[match] || "";
  const hasTeams = t1 && t1 !== "TBD" && t2 && t2 !== "TBD";

  const teamRow = (team, i) => {
    const isW = winner && team === winner;
    const disabled = !canPick || !team || team === "TBD";
    return (
      <button
        key={i}
        onClick={() => !disabled && onPick?.(team)}
        disabled={disabled}
        title={canPick ? `Pick ${team}` : undefined}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: compact ? "7px 8px" : "10px 10px",
          background: isW ? `${C.green}24` : "transparent",
          border: "none",
          borderBottom: i === 0 ? `1px solid ${C.b1}` : "none",
          cursor: canPick ? "pointer" : "default",
          textAlign: "left",
          opacity: team ? 1 : 0.65,
        }}
      >
        <Crest team={team || "TBD"} size={compact ? 16 : 22} />
        <span
          style={{
            fontSize: compact ? 12 : 14,
            color: isW ? C.green : team ? C.text : C.dim,
            fontWeight: isW ? 800 : 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 1,
          }}
        >
          {team || "TBD"}
        </span>
        {isW && (
          <span style={{ fontSize: 12, color: C.green, fontWeight: 900 }}>
            ✓
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      style={{
        position: "relative",
        background: `linear-gradient(135deg,${C.s1},${C.s2})`,
        border: `1px solid ${winner ? C.greenS : C.b1}`,
        borderRadius: 12,
        overflow: "hidden",
        width: "100%",
        boxShadow: winner ? "0 4px 16px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      {/* Header — match number + venue city + tap target */}
      <div
        onClick={() => hasTeams && onMatchTap?.(match)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: compact ? "4px 8px" : "6px 10px",
          borderBottom: `1px solid ${C.b1}`,
          background: `${C.gold}10`,
          cursor: hasTeams && onMatchTap ? "pointer" : "default",
          gap: 6,
        }}
      >
        {/* Left: match number */}
        <span
          style={{
            fontSize: 10,
            color: C.gold,
            fontWeight: 900,
            letterSpacing: "0.08em",
            flexShrink: 0,
          }}
        >
          M{match || "—"}
        </span>

        {/* Center: venue city + date */}
        {city && (
          <span
            style={{
              fontSize: 9,
              color: C.dim,
              fontWeight: 600,
              textAlign: "center",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            📍 {city}{date ? ` · ${date}` : ""}
          </span>
        )}

        {/* Right: pick status or tap hint */}
        <span
          style={{
            fontSize: 9,
            color: hasTeams && onMatchTap ? C.blue : canPick ? C.green : C.dim,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {hasTeams && onMatchTap
            ? "Details ›"
            : interactive
            ? canPick
              ? "TAP PICK"
              : "LOCKED"
            : ""}
        </span>
      </div>

      {teamRow(t1, 0)}
      {teamRow(t2, 1)}
    </div>
  );
}
