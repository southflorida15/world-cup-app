// src/components/WatchingFromSelector.jsx
import React, { useMemo, useState } from "react";
import {
  BROADCAST_COUNTRIES,
  getBroadcastCountry,
  getBroadcastCountryLabel,
  saveBroadcastCountry,
} from "../utils/broadcastCountry";

export default function WatchingFromSelector({ C = {}, compact = false, onChange }) {
  const initial = useMemo(() => getBroadcastCountry("US"), []);
  const [country, setCountry] = useState(initial);
  const [open, setOpen] = useState(false);

  function choose(code) {
    const saved = saveBroadcastCountry(code);
    setCountry(saved);
    setOpen(false);
    onChange?.(saved);
  }

  const text = C.text || "inherit";
  const dim = C.dim || "#888";
  const border = C.b1 || "rgba(255,255,255,.16)";

  return (
    <div style={{ marginTop: compact ? 8 : 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: dim, fontWeight: 800, textTransform: "uppercase", letterSpacing: .5 }}>
            Watching from
          </div>
          <div style={{ color: text, fontWeight: 900, marginTop: 3 }}>
            {getBroadcastCountryLabel(country)}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          style={{
            border: `1px solid ${border}`,
            background: "rgba(255,255,255,.06)",
            color: text,
            borderRadius: 999,
            padding: "8px 12px",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Change
        </button>
      </div>

      {open && (
        <div style={{
          marginTop: 10,
          display: "grid",
          gap: 8,
          gridTemplateColumns: compact ? "1fr" : "repeat(auto-fit, minmax(160px, 1fr))",
        }}>
          {BROADCAST_COUNTRIES.map(item => {
            const selected = item.code === country;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => choose(item.code)}
                style={{
                  textAlign: "left",
                  border: `1px solid ${selected ? (C.accent || border) : border}`,
                  background: selected ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.04)",
                  color: text,
                  borderRadius: 14,
                  padding: "10px 12px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                <span>{item.label}</span>
                {selected && <span style={{ float: "right" }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
