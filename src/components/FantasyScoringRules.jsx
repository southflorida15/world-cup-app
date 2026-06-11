import React from "react";

export default function FantasyScoringRules({ C }) {
  return (
    <div
      style={{
        marginTop: 10,
        padding: 10,
        background: C.bg,
        borderRadius: 8,
        fontSize: 12,
        color: C.mid,
        lineHeight: 1.8,
      }}
    >
      <div>
        ⚽⚽⚽ <strong style={{ color: C.green }}>3 pts</strong> — Exact score
      </div>
      <div>
        ⚽ <strong style={{ color: C.gold }}>1 pt</strong> — Correct result
      </div>
      <div>
        ❌ <strong style={{ color: C.red }}>0 pts</strong> — Wrong result
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: C.dim }}>
        Fantasy picks auto-save as you type. Picks lock when the match starts;
        future matches remain editable.
      </div>
    </div>
  );
}