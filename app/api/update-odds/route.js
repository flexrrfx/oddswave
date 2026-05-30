const BOOKMAKERS = [
  "pinnacle",
  "draftkings",
  "fanduel",
  "williamhill_us",
  "betmgm",
  "prophetx",
  "polymarket",
  "novig",
  "betonlineag",
  "kalshi",
].join(",");

async function fetchSport(sport) {
  const url =
    `https://api.the-odds-api.com/v4/sports/${sport}/odds` +
    `?apiKey=${process.env.ODDS_API_KEY}` +
    `&regions=us` +
    `&markets=h2h,spreads,totals` +
    `&oddsFormat=american` +
    `&bookmakers=${BOOKMAKERS}`;

  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();

  return data.filter((game) => new Date(game.commence_time) > new Date());
}

async function redisSet(key, value) {
  const res = await fetch(`${process.env.KV_REST_API_URL}/set/${key}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  });

  if (!res.ok) {
    throw new Error(`Redis set failed for ${key}`);
  }
}

export async function GET() {
  const [nba, mlb] = await Promise.all([
    fetchSport("basketball_nba"),
    fetchSport("baseball_mlb"),
  ]);

  const payload = {
    nba,
    mlb,
    updatedAt: new Date().toISOString(),
  };

  await redisSet("oddswave:odds", payload);

  return Response.json({
    success: true,
    nbaGames: nba.length,
    mlbGames: mlb.length,
    updatedAt: payload.updatedAt,
  });
}