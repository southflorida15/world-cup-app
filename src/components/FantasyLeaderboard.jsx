import React from "react";

export default function FantasyLeaderboard({
  totalPoints = 0,
  exactPicks = 0,
  correctResults = 0,
  totalPredictions = 0,
}) {
  const accuracy =
    totalPredictions > 0
      ? Math.round(
          (correctResults / totalPredictions) * 100
        )
      : 0;

  const cards = [
    {
      label: "Points",
      value: totalPoints,
      icon: "🏆",
    },
    {
      label: "Exact Picks",
      value: exactPicks,
      icon: "🎯",
    },
    {
      label: "Correct Results",
      value: correctResults,
      icon: "⚽",
    },
    {
      label: "Accuracy",
      value: ${accuracy}%,
      icon: "📈",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit,minmax(140px,1fr))",
        gap: 12,
      }}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,.08)",
            borderRadius: 12,
            padding: 14,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 22,
              marginBottom: 8,
            }}
          >
            {card.icon}
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            {card.value}
          </div>

          <div
            style={{
              fontSize: 12,
              opacity: 0.7,
            }}
          >
            {card.label}
          </div>
        </div>
      ))}
    </div>
  );
}