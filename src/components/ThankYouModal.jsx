import React from "react";

export default function ThankYouModal({ onClose, dark }) {
  const bg = dark ? "#08120d" : "#ffffff";
  const titleColor = "#4ade80";
  const bodyColor = dark ? "#d4ead9" : "#1a3828";
  const border = "#1a3828";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: 20,
          padding: 28,
          textAlign: "center",
          boxShadow: "0 12px 40px rgba(0,0,0,.35)",
        }}
      >
        <div
          style={{
            fontSize: 48,
            marginBottom: 12,
          }}
        >
          🏆
        </div>

        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: titleColor,
            marginBottom: 12,
          }}
        >
          Thank You!
        </div>

        <div
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: bodyColor,
            marginBottom: 24,
          }}
        >
          Thank you for following the FIFA World Cup 2026 with us.
          <br />
          <br />
          We hope this app made your tournament experience better!
          <br />
          <br />
          See you again in 2030!
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "12px 20px",
            borderRadius: 12,
            border: `1px solid ${border}`,
            background: "transparent",
            color: titleColor,
            fontSize: 15,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}