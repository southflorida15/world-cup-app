import React from "react";

export default function MatchInfoSection({
  match,
  modalWx,
  bc,
  isUS,
  simOdds,
  p1,
  p2,
  finished,
  openMaps,
  C,
}) {
  return (
    <>
      {/* VENUE */}
      <div
        onClick={() => openMaps(match.venue)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          background: C.s1,
          border: `1px solid ${C.b1}`,
          borderRadius: 10,
          marginBottom: 12,
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 20 }}>📍</span>

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: C.blue,
              textDecoration: "underline",
              textDecorationStyle: "dotted",
            }}
          >
            {match.venue.split(",")[0]}
          </div>

          <div
            style={{
              fontSize: 11,
              color: C.dim,
              marginTop: 2,
            }}
          >
            {match.venue.split(",").slice(1).join(",").trim()} · Tap for
            directions
          </div>
        </div>

        {modalWx ? (
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontSize: 18, lineHeight: 1 }}>
              {modalWx.icon}
            </div>

            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.text,
              }}
            >
              {modalWx.temp}°F
              <span style={{ color: C.dim }}>
                {" "}
                / {modalWx.tempC}°C
              </span>
            </div>

            <div
              style={{
                fontSize: 9,
                color: C.dim,
              }}
            >
              at venue
            </div>
          </div>
        ) : null}
      </div>

      {/* TV */}
      {match.tv && (
        <div
          style={{
            padding: "10px 14px",
            background: C.s1,
            border: `1px solid ${C.b1}`,
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: bc.streaming ? 6 : 0,
            }}
          >
            <span style={{ fontSize: 16 }}>📺</span>

            <div
              style={{
                fontSize: 13,
                color: C.gold,
                fontWeight: 600,
              }}
            >
              {isUS ? match.tv : `${bc.note} ${bc.primary}`}
            </div>
          </div>

          {bc.streaming && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 16 }}>💻</span>

              <div
                style={{
                  fontSize: 12,
                  color: C.mid,
                }}
              >
                {bc.streaming}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ODDS */}
      {!finished && simOdds && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 11,
              color: C.dim,
              fontWeight: 700,
              letterSpacing: "0.1em",
              marginBottom: 8,
            }}
          >
            WIN PROBABILITY
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
            }}
          >
            {[
              {
                label: match.home,
                sim: simOdds.win1,
                poly: p1?.poly,
                color: C.green,
              },
              {
                label: "Draw",
                sim: simOdds.draw,
                poly: null,
                color: C.gold,
              },
              {
                label: match.away,
                sim: simOdds.win2,
                poly: p2?.poly,
                color: C.red,
              },
            ].map(({ label, sim, poly, color }) => (
              <div
                key={label}
                style={{
                  background: C.s1,
                  border: `1px solid ${color}33`,
                  borderRadius: 10,
                  padding: "10px 6px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color,
                    lineHeight: 1,
                  }}
                >
                  {sim}%
                </div>

                <div
                  style={{
                    fontSize: 9,
                    color: C.dim,
                    marginTop: 2,
                    marginBottom: poly ? 4 : 0,
                  }}
                >
                  Simulator
                </div>

                {poly && (
                  <div
                    style={{
                      borderTop: `1px solid ${color}22`,
                      paddingTop: 4,
                      fontSize: 11,
                      color: C.dim,
                    }}
                  >
                    {poly}% 🏆
                  </div>
                )}

                <div
                  style={{
                    fontSize: 10,
                    color: C.mid,
                    marginTop: 4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}