import React from "react";
import FantasyLeaderboard from "../components/FantasyLeaderboard";

export default function Fantasy() {
  return (
    <div style={{ padding: 16 }}>
      <h2>Fantasy Picks</h2>

      <FantasyLeaderboard
        totalPoints={0}
        exactPicks={0}
        correctResults={0}
        totalPredictions={0}
      />
    </div>
  );
}