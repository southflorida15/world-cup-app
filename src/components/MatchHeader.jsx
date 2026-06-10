import React from "react";

export default function MatchHeader({
  match,
  localTime,
  hasScore,
  live,
  sc,
  favTeams,
  statusLabel,
  Crest,
  C,
}) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg,${C.s1},${C.s2})`,
        padding: "16px 18px 20px",
        position: "relative",
      }}
    >
      <div
        style={{
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: C.dim,
            fontWeight: 700,
            letterSpacing: "0.1em",
          }}
        >
          {match.group
            ? `GROUP ${match.group}`
            : (match.stage || "WORLD CUP 2026").toUpperCase()}
        </div>

        {match.date && (
          <div
            style={{
              fontSize: 13,
              color: C.mid,
              marginTop: 2,
            }}
          >
            {match.date} · {localTime}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Crest team={match.home} size={64} />

          <span
            style={{
              fontWeight: 700,
              fontSize: 16,
              color: favTeams.includes(match.home)
                ? C.gold
                : C.text,
              textAlign: "center",
            }}
          >
            {match.home}
          </span>
        </div>

        <div
          style={{
            textAlign: "center",
            minWidth: 80,
          }}
        >
          {hasScore ? (
            <>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 44,
                  color: live ? C.green : C.text,
                  fontFamily: "monospace",
                  lineHeight: 1,
                }}
              >
                {sc.hg}–{sc.ag}
              </div>

              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: live ? C.green : C.dim,
                  marginTop: 4,
                }}
              >
                {live ? "🔴 " : ""}
                {statusLabel(sc.status, sc.elapsed) || "FT"}
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.dim,
                }}
              >
                VS
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: C.dim,
                  marginTop: 4,
                }}
              >
                Upcoming
              </div>
            </>
          )}
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Crest team={match.away} size={64} />

          <span
            style={{
              fontWeight: 700,
              fontSize: 16,
              color: favTeams.includes(match.away)
                ? C.gold
                : C.text,
              textAlign: "center",
            }}
          >
            {match.away}
          </span>
        </div>
      </div>
    </div>
  );
}