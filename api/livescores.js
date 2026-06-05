export default async function handler(req, res) {
  // Build today's date in YYYYMMDD format (what this API expects)
  const today = new Date();
  const dateStr =
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, "0") +
    String(today.getDate()).padStart(2, "0");

  let data;
  try {
    const response = await fetch(
      `https://free-api-live-football-data.p.rapidapi.com/football-get-matches-by-date?date=${dateStr}`,
      {
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": process.env.RAPIDAPI_HOST,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`RapidAPI returned ${response.status}: ${response.statusText}`);
    }

    data = await response.json();
    console.log("API RAW:", JSON.stringify(data, null, 2));

    // Normalise — the API can nest matches in a few different ways
    const source = Array.isArray(data?.response)
      ? data.response
      : Array.isArray(data?.response?.matches)
      ? data.response.matches
      : Array.isArray(data?.response?.fixtures)
      ? data.response.fixtures
      : Array.isArray(data?.matches)
      ? data.matches
      : [];

    const matches = source.map((m) => ({
      fixture: {
        id: m.fixture?.id ?? m.id ?? null,
        status: {
          short: m.fixture?.status?.short ?? m.status ?? "NS",
          elapsed: m.fixture?.status?.elapsed ?? m.elapsed ?? null,
        },
      },
      teams: {
        home: { name: m.teams?.home?.name ?? m.home?.name ?? "Unknown" },
        away: { name: m.teams?.away?.name ?? m.away?.name ?? "Unknown" },
      },
      goals: {
        home: m.goals?.home ?? m.score?.home ?? m.home?.score ?? null,
        away: m.goals?.away ?? m.score?.away ?? m.away?.score ?? null,
      },
    }));

    res.status(200).json({ response: matches });
  } catch (error) {
    console.error("livescores error:", error.message);
    res.status(500).json({ error: error.message });
  }
}