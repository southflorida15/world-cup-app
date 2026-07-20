import React from "react";

export default function ThankYouModal({ onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "32px",
          maxWidth: "500px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        }}
      >
        <h2>🏆 Thank You!</h2>

        <p>
          Thank you for following the FIFA World Cup 2026 journey with us.
          We hope you enjoyed the matches, brackets, fantasy, stats, and
          tournament experience.
        </p>

        <button
          onClick={onClose}
          style={{
            marginTop: "20px",
            padding: "12px 24px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Continue to the App
        </button>
      </div>
    </div>
  );
}