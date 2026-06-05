export default async function handler(req, res) {
  try {
    const response = await fetch(
      'YOUR_FIXTURES_ENDPOINT',
      {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': process.env.RAPIDAPI_HOST,
        },
      }
    );

    const data = await response.json();

    const matches = (data.response?.matches || []).map(m => ({
      fixture: {
        id: m.id,
        status: {
          short: m.status?.finished
            ? 'FT'
            : m.status?.started
            ? 'LIVE'
            : 'NS',
          elapsed: m.status?.elapsed || null,
        }
      },
      teams: {
        home: { name: m.home?.name },
        away: { name: m.away?.name }
      },
      goals: {
        home: m.home?.score ?? 0,
        away: m.away?.score ?? 0
      }
    }));

    res.status(200).json({ response: matches });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}