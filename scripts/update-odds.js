const fs = require("fs/promises");
const path = require("path");

const API_KEY = process.env.ODDS_API_KEY;

const BOOKMAKERS = [
  "pinnacle",
  "draftkings",
  "fanduel",
  "williamhill_us",
  "betmgm",
  "fanatics",
  "hardrockbet",
  "novig",
  "betonlineag",
  "kalshi",
].join(",");

const SPORTS = [
  { file: "nba.json", key: "basketball_nba" },
  { file: "mlb.json", key: "baseball_mlb" },
];

async function fetchOdds(sport) {
  const url = new URL(
    `https://api.the-odds-api.com/v4/sports/${sport.key}/odds`
  );

  url.searchParams.set("apiKey", API_KEY);
  url.searchParams.set("markets", "h2h,spreads,totals");
  url.searchParams.set("oddsFormat", "american");
  url.searchParams.set("bookmakers", BOOKMAKERS);

  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${sport.key} failed: ${res.status} ${text}`);
  }

  const data = await res.json();

  const outPath = path.join(process.cwd(), "data", sport.file);
  await fs.writeFile(outPath, JSON.stringify(data, null, 2));

  console.log(`Updated ${sport.file} with ${data.length} games`);
}

async function main() {
  if (!API_KEY) {
    throw new Error("Missing ODDS_API_KEY");
  }

  for (const sport of SPORTS) {
    await fetchOdds(sport);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});