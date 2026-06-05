export default async function handler(req, res) {
  try {
    const response = await fetch('YOUR_FIXTURES_ENDPOINT', {
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST,
      },
    });

    const data = await response.json();

    const source = data.response || [];

    const matches = source.map((m) => ({
      fixture: {
        id: m.fixture?.id || m.id,
        status: {
          short:
            m.fixture?.status?.short === 'FT'
              ? 'FT'
              : m.fixture?.status?.short === '1H' ||
                m.fixture?.status?.short === '2H'
              ? 'LIVE'
              : 'NS',
          elapsed: m.fixture?.status?.elapsed ?? null,
        },
      },

      teams: {
        home: {
          name: m.teams?.home?.name || m.home?.name || 'Unknown',
        },
        away: {
          name: m.teams?.away?.name || m.away?.name || 'Unknown',
        },
      },

      goals: {
        home:
          m.goals?.home ??
          m.score?.home ??
          m.home?.score ??
          0,
        away:
          m.goals?.away ??
          m.score?.away ??
          m.away?.score ??
          0,
      },
    }));

    res.status(200).json({ response: matches });
  } catch (error) {
    console.error('API ERROR:', error);
    res.status(500).json({ error: error.message });
  }
}