export default async function handler(req, res) {
  try {
    const response = await fetch(
      'https://api-football-v1.p.rapidapi.com/v3/fixtures?live=all',
      {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': process.env.RAPIDAPI_HOST,
        },
      }
    );

    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}