import React from "react";

export default function FantasyStatsSummary({
  totalPts = 0,
  exact = 0,
  correct = 0,
  totalPossible = 0,
  C,
}) {
  const accuracy =
    totalPossible > 0
      ? Math.round((totalPts / totalPossible) * 100)
      : 0;

  const cards = [
    [totalPts, "POINTS", C.green],
    [exact, "EXACT", C.gold],
    [correct, "CORRECT", C.blue],
    [accuracy, "ACCURACY %", C.mid],
  ];

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
      {cards.map(([value, label, color]) => (
        <div
          key={label}
          style={{
            flex: 1,
            textAlign: "center",
            background: `${color}18`,
            border: `1px solid ${color}33`,
            borderRadius: 10,
            padding: "8px 4px",
          }}
        >
          <div
            style={{
              fontWeight: 900,
              fontSize: 22,
              color,
            }}
          >
            {value}
            {label === "ACCURACY %" ? "%" : ""}
          </div>

          <div
            style={{
              fontSize: 9,
              color: C.dim,
            }}
          >
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}