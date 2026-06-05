export default async function handler(req, res) {
  const { teamId } = req.query;

  if (!teamId) {
    return res.status(400).json({ error: "Missing teamId query parameter" });
  }

  try {
    const response = await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/players/squads?team=${teamId}`,
      {
        headers: {
          // Uses the same RAPIDAPI_KEY from Vercel env vars.
          // Host is hardcoded since this always hits api-football-v1.
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API-Football returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const players = (data?.response?.[0]?.players || []).map((p) => ({
      id: p.id,
      name: p.name,
      age: p.age,
      number: p.number,
      pos: p.position,
      photo: p.photo,
    }));

    res.status(200).json({ players });
  } catch (error) {
    console.error("squad error:", error.message);
    res.status(500).json({ error: error.message });
  }
}