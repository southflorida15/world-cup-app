import React, { useEffect, useState } from "react";

function formatCountdown(ms) {
  if (ms <= 0) return "Locked";

  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `Locks in ${days}d ${hours}h`;
  if (hours > 0) return `Locks in ${hours}h ${minutes}m`;
  return `Locks in ${minutes}m`;
}

export default function FantasyPickLockStatus({
  locked,
  kickoffTime,
  C,
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

const kickoffMs = kickoffTime ? new Date(kickoffTime).getTime() : null;
const remaining = kickoffMs ? kickoffMs - now : 0;
const isLocked = locked || remaining <= 0;

const TWO_HOURS = 2 * 60 * 60 * 1000;
const TWELVE_HOURS = 12 * 60 * 60 * 1000;

const pillColor = isLocked
  ? C.red
  : remaining <= TWO_HOURS
    ? C.red
    : remaining <= TWELVE_HOURS
      ? C.gold
      : C.green;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        background: `${pillColor}18`,
border: `1px solid ${pillColor}33`,
color: pillColor,
lineHeight: 1,
minHeight: 22,
        whiteSpace: "nowrap",
      }}
    >
      <span>{isLocked ? "🔒" : "⏳"}</span>
      <span>
        {isLocked ? "Locked" : formatCountdown(remaining)}
      </span>
    </div>
  );
}