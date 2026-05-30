export async function GET() {
  const API_KEY = process.env.ODDS_API_KEY;

  const bookmakers = [
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

  const nbaUrl =
    `https://api.the-odds-api.com/v4/sports/basketball_nba/odds` +
    `?apiKey=${API_KEY}` +
    `&regions=us` +
    `&markets=h2h,spreads,totals` +
    `&oddsFormat=american` +
    `&bookmakers=${bookmakers}`;

  const mlbUrl =
    `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds` +
    `?apiKey=${API_KEY}` +
    `&regions=us` +
    `&markets=h2h,spreads,totals` +
    `&oddsFormat=american` +
    `&bookmakers=${bookmakers}`;

  const [nbaRes, mlbRes] = await Promise.all([
    fetch(nbaUrl, { cache: "no-store" }),
    fetch(mlbUrl, { cache: "no-store" }),
  ]);

  const nba = await nbaRes.json();
  const mlb = await mlbRes.json();

  return Response.json({
    nba,
    mlb,
    updatedAt: new Date().toISOString(),
  });
}