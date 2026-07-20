import React from "react";
import { getBroadcastsForMatch } from "../utils/broadcasts";

export default function BroadcastBadges({ match, country, compact = false }) {
  const b = getBroadcastsForMatch(match, country);

  if (!b.hasBroadcasts) {
    return (
      <div style={{
        fontSize: compact ? 11 : 12,
        color: "#7aaa8a",
        marginTop: compact ? 4 : 6,
        lineHeight: 1.35
      }}>
        📺 Broadcasters to be confirmed
      </div>
    );
  }

  return (
    <div style={{
      fontSize: compact ? 11 : 12,
      color: "#d4ead9",
      marginTop: compact ? 4 : 6,
      lineHeight: 1.45,
      display: "grid",
      gap: 2
    }}>
      {b.tv.length > 0 && (
        <div>📺 {b.tv.join(" • ")}</div>
      )}
      {b.stream.length > 0 && (
        <div>▶️ {b.stream.join(" • ")}</div>
      )}
    </div>
  );
}
