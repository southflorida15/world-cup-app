import React from "react";

export default function MatchDetailCard({
  match,
  weather,
  broadcast,
  probabilities,
  polymarket,
  fantasyPick,
  interactive = true,
}) {
  if (!match) return null;

  return (
    <div className="space-y-3">
      {/* Teams /}
      <div className="rounded-xl border border-green-700 bg-green-950/40 p-4">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="text-4xl">{match.homeFlag}</div>
            <div className="font-bold">{match.home}</div>
          </div>

          <div className="px-4 text-center">
            <div className="text-2xl font-bold">
              {match.homeGoals != null && match.awayGoals != null
                ? ${match.homeGoals} - ${match.awayGoals}
                : "VS"}
            </div>
            <div className="text-xs opacity-70">
              {match.status || "Upcoming"}
            </div>
          </div>

          <div className="text-center flex-1">
            <div className="text-4xl">{match.awayFlag}</div>
            <div className="font-bold">{match.away}</div>
          </div>
        </div>
      </div>

      {/ Match info /}
      <div className="rounded-xl border p-3">
        <div className="font-semibold">📅 Match Information</div>
        <div>{match.date}</div>
        <div>{match.time}</div>
        <div>{match.group}</div>
      </div>

      {/ Venue /}
      {match.venue && (
        <div className="rounded-xl border p-3">
          <div className="font-semibold">📍 Venue</div>
          <div>{match.venue}</div>

          {match.mapsUrl && (
            <a
              href={match.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-500 underline"
            >
              Open in Maps
            </a>
          )}
        </div>
      )}

      {/ Weather /}
      {weather && (
        <div className="rounded-xl border p-3">
          <div className="font-semibold">🌤 Match Conditions</div>
          <div>{weather.temp}</div>
          <div>{weather.condition}</div>
        </div>
      )}

      {/ Broadcast /}
      {broadcast && (
        <div className="rounded-xl border p-3">
          <div className="font-semibold">📺 Broadcast</div>
          <div>{broadcast.channel}</div>
          <div>{broadcast.streaming}</div>
        </div>
      )}

      {/ Win Probability /}
      {probabilities && (
        <div className="rounded-xl border p-3">
          <div className="font-semibold">🎲 Win Probability</div>
          <div>{match.home}: {probabilities.home}%</div>
          <div>Draw: {probabilities.draw}%</div>
          <div>{match.away}: {probabilities.away}%</div>
        </div>
      )}

      {/ Polymarket /}
      {polymarket && (
        <div className="rounded-xl border p-3">
          <div className="font-semibold">📈 Polymarket</div>
          <div>{match.home}: {polymarket.home}%</div>
          <div>{match.away}: {polymarket.away}%</div>
        </div>
      )}

      {/ Fantasy */}
      {fantasyPick && (
        <div className="rounded-xl border p-3">
          <div className="font-semibold">🎯 My Fantasy Pick</div>
          <div>
            {match.home} {fantasyPick.home} - {fantasyPick.away} {match.away}
          </div>
        </div>
      )}
    </div>
  );
}