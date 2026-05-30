"use client";

import React, { useState } from "react";
import nbaData from "../data/nba.json";
import mlbData from "../data/mlb.json";

const BOOKS = [
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
];
const BOOK_LABELS = {
  pinnacle: "Pinnacle",
  draftkings: "DraftKings",
  fanduel: "FanDuel",
  williamhill_us: "Caesars",
  betmgm: "BetMGM",
  polymarket: "Polymarket",
  prophetx: "ProphetX",
  novig: "Novig",
  betonlineag: "BetOnline",
  kalshi: "Kalshi",
};

const BOOK_LOGOS = {
  pinnacle: "/logos/pinnacle.png",
  draftkings: "/logos/draftkings.png",
  fanduel: "/logos/fanduel.png",
  williamhill_us: "/logos/caesars.png",
  prophetx: "/logos/prophetx.png",
  polymarket: "/logos/polymarket.png",
  betmgm: "/logos/betmgm.png",
  novig: "/logos/novig.png",
  betonlineag: "/logos/betonline.png",
  kalshi: "/logos/kalshi.png",
};

const SPORTS = {
  NBA: nbaData,
  MLB: mlbData,
};

const MARKETS = {
  h2h: "Moneyline",
  spreads: "Spread",
  totals: "Total",
};

function formatOdds(price) {
  if (price === undefined || price === null || price === "-") return "-";
  const n = Number(price);
  if (!Number.isFinite(n)) return "-";
  return n > 0 ? `+${n}` : `${n}`;
}

function formatLine(line) {
  if (line === undefined || line === null || line === "-") return "-";
  const n = Number(line);
  if (!Number.isFinite(n)) return line;
  return n > 0 ? `+${n}` : `${n}`;
}

function americanToProbability(odds) {
  const n = Number(odds);
  if (!Number.isFinite(n)) return null;
  if (n > 0) return 100 / (n + 100);
  return Math.abs(n) / (Math.abs(n) + 100);
}

function probabilityToAmerican(probability) {
  const p = Number(probability);
  if (!Number.isFinite(p) || p <= 0 || p >= 1) return "-";

  if (p >= 0.5) {
    return Math.round((-100 * p) / (1 - p));
  }

  return Math.round((100 * (1 - p)) / p);
}

function getFairOdds(books) {
  const noVigProbabilities = books
    .map((book) => {
      const sideAProbability = americanToProbability(book.sideA?.price);
      const sideBProbability = americanToProbability(book.sideB?.price);

      if (!sideAProbability || !sideBProbability) return null;

      const totalProbability = sideAProbability + sideBProbability;
      if (!totalProbability) return null;

      return sideAProbability / totalProbability;
    })
    .filter((probability) => Number.isFinite(probability));

  if (!noVigProbabilities.length) return "-";

  const averageProbability =
    noVigProbabilities.reduce((sum, probability) => sum + probability, 0) /
    noVigProbabilities.length;

  return probabilityToAmerican(averageProbability);
}

function getMarket(book, marketKey) {
  return book.markets?.find((market) => market.key === marketKey);
}

function getConsensusLine(game, marketKey, selectionName) {
  const points = [];

  game.bookmakers?.forEach((book) => {
    const market = getMarket(book, marketKey);
    if (!market) return;

    market.outcomes?.forEach((outcome) => {
      if (outcome.name === selectionName && outcome.point !== undefined) {
        points.push(Number(outcome.point));
      }
    });
  });

  if (!points.length) return "-";

  const counts = {};
  points.forEach((point) => {
    counts[point] = (counts[point] || 0) + 1;
  });

  return Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
}

function getBestPrice(books) {
  const prices = books
    .map((book) => Number(book.sideA?.price))
    .filter((price) => Number.isFinite(price));

  if (!prices.length) return "-";
  return Math.max(...prices);
}

function getBestBookKey(books) {
  const bestPrice = getBestPrice(books);
  if (bestPrice === "-") return null;

  return books.find((book) => Number(book.sideA?.price) === Number(bestPrice))
    ?.book;
}



function buildRows(game, marketKey) {
  const rows = [];

  if (marketKey === "h2h") {
    [game.away_team, game.home_team].forEach((team) => {
      const opponent = team === game.away_team ? game.home_team : game.away_team;
      const books = [];

      game.bookmakers?.forEach((book) => {
        const market = getMarket(book, "h2h");
        if (!market) return;

        const sideA = market.outcomes?.find((o) => o.name === team);
        const sideB = market.outcomes?.find((o) => o.name === opponent);

        if (!sideA || !sideB) return;

        books.push({
          book: book.key,
          title: book.title || BOOK_LABELS[book.key] || book.key,
          sideA: {
            name: team,
            price: sideA.price,
            line: "ML",
          },
          sideB: {
            name: opponent,
            price: sideB.price,
            line: "ML",
          },
        });
      });

      rows.push({
        id: `${game.id}-${marketKey}-${team}`,
        selection: team,
        line: "ML",
        bestPrice: getBestPrice(books),
        bestBook: getBestBookKey(books),
        fairOdds: getFairOdds(books),
        books,
      });
    });
  }

  if (marketKey === "spreads") {
    [game.away_team, game.home_team].forEach((team) => {
      const opponent = team === game.away_team ? game.home_team : game.away_team;
      const line = getConsensusLine(game, "spreads", team);
      const books = [];

      game.bookmakers?.forEach((book) => {
        const market = getMarket(book, "spreads");
        if (!market) return;

        const sideA = market.outcomes?.find(
          (o) => o.name === team && Number(o.point) === Number(line)
        );

        const sideB = market.outcomes?.find(
          (o) => o.name === opponent && Number(o.point) === Number(line) * -1
        );

        if (!sideA || !sideB) return;

        books.push({
          book: book.key,
          title: book.title || BOOK_LABELS[book.key] || book.key,
          sideA: {
            name: team,
            price: sideA.price,
            line: sideA.point,
          },
          sideB: {
            name: opponent,
            price: sideB.price,
            line: sideB.point,
          },
        });
      });

      rows.push({
        id: `${game.id}-${marketKey}-${team}-${line}`,
        selection: team,
        line,
        bestPrice: getBestPrice(books),
        bestBook: getBestBookKey(books),
        fairOdds: getFairOdds(books),
        books,
      });
    });
  }

  if (marketKey === "totals") {
    ["Over", "Under"].forEach((side) => {
      const oppositeSide = side === "Over" ? "Under" : "Over";
      const line = getConsensusLine(game, "totals", side);
      const books = [];

      game.bookmakers?.forEach((book) => {
        const market = getMarket(book, "totals");
        if (!market) return;

        const sideA = market.outcomes?.find(
          (o) => o.name === side && Number(o.point) === Number(line)
        );

        const sideB = market.outcomes?.find(
          (o) => o.name === oppositeSide && Number(o.point) === Number(line)
        );

        if (!sideA || !sideB) return;

        books.push({
          book: book.key,
          title: book.title || BOOK_LABELS[book.key] || book.key,
          sideA: {
            name: side,
            price: sideA.price,
            line: sideA.point,
          },
          sideB: {
            name: oppositeSide,
            price: sideB.price,
            line: sideB.point,
          },
        });
      });

      rows.push({
        id: `${game.id}-${marketKey}-${side}-${line}`,
        selection: side,
        line,
        bestPrice: getBestPrice(books),
        bestBook: getBestBookKey(books),
        fairOdds: getFairOdds(books),
        books,
      });
    });
  }

  return rows;
}

function MarketSection({ game, marketKey }) {
  const [openRow, setOpenRow] = useState(null);
  const rows = buildRows(game, marketKey);

  if (!rows.length) return null;

  return (
    <>
      {rows.map((row) => (
        <React.Fragment key={row.id}>
          <tr
            onClick={() => setOpenRow(openRow === row.id ? null : row.id)}
className="cursor-pointer border-b border-zinc-800 transition-all duration-150 hover:bg-violet-500/5 hover:shadow-[inset_3px_0_0_rgba(34,211,238,0.9)]"          >
            <td className="px-4 py-3">
              <div className="font-black">
                {marketKey === "h2h"
                  ? row.selection
                  : `${row.selection} ${formatLine(row.line)}`}
              </div>

              <div className="text-sm text-zinc-500">{MARKETS[marketKey]}</div>
            </td>

            <td className="px-4 py-5 text-center">
              <div className="flex items-center justify-center gap-2">
                {row.bestBook && (
                  <img
                    src={BOOK_LOGOS[row.bestBook]}
                    alt={BOOK_LABELS[row.bestBook]}
                    className="h-10 w-10 rounded-lg bg-zinc-900 object-contain p-1"
                  />
                )}

                <span className="font-black text-violet-300">
                  {formatOdds(row.bestPrice)}
                </span>
              </div>
            </td>

           

            

            {BOOKS.map((bookKey) => {
              const book = row.books.find((item) => item.book === bookKey);
              const isBest = bookKey === row.bestBook;

              return (
                <td
                  key={`${row.id}-${bookKey}`}
                  className="px-4 py-5 text-center"
                >
                  <span
                    className={`font-black ${
                      isBest ? "text-violet-300" : "text-zinc-300"
                    }`}
                  >
                    {formatOdds(book?.sideA?.price)}
                  </span>
                </td>
              );
            })}
          </tr>

          {openRow === row.id && (
            <tr>
            <td colSpan={2 + BOOKS.length} className="bg-black px-5 py-4">
                <div className="flex gap-3 overflow-x-auto">
                  {row.books.map((book) => {
                    const isBest = book.book === row.bestBook;

                    return (
                      <div
                        key={book.book}
                        className={`min-w-[190px] rounded-xl border bg-[#0d1119] p-4 ${
                          isBest
                            ? "border-violet-500 shadow-[0_0_18px_rgba(168,85,247,0.20)]"
                            : "border-zinc-800"
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-center gap-2">
                          <img
                            src={BOOK_LOGOS[book.book]}
                            alt={book.title}
                            className="h-10 w-10 rounded-lg bg-zinc-900 object-contain p-1"
                          />

                          {isBest && (
                            <span className="rounded bg-violet-500/20 px-2 py-1 text-[10px] font-black text-violet-300">
                              BEST
                            </span>
                          )}
                        </div>

                        <div className="mb-3 text-center text-xs text-zinc-400">
                          {book.title}
                        </div>

                        <div className="space-y-2">
                          <div className="rounded-lg bg-zinc-900 px-2 py-2">
                            <div className="truncate text-[11px] text-zinc-400">
                              {marketKey === "h2h"
                                ? book.sideA.name
                                : `${book.sideA.name} ${formatLine(
                                    book.sideA.line
                                  )}`}
                            </div>

                            <div
                              className={`font-black ${
                                isBest ? "text-cyan-300" : "text-white"
                              }`}
                            >
                              {formatOdds(book.sideA.price)}
                            </div>
                          </div>

                          <div className="rounded-lg bg-zinc-900 px-2 py-2">
                            <div className="truncate text-[11px] text-zinc-400">
                              {marketKey === "h2h"
                                ? book.sideB.name
                                : `${book.sideB.name} ${formatLine(
                                    book.sideB.line
                                  )}`}
                            </div>

                            <div className="font-black text-white">
                              {formatOdds(book.sideB.price)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </td>
            </tr>
          )}
        </React.Fragment>
      ))}
    </>
  );
}

export default function Home() {
  const [sport, setSport] = useState("NBA");
  const [market, setMarket] = useState("h2h");
  const games = SPORTS[sport];

  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <div className="sticky top-0 z-20 border-b border-zinc-800 bg-[#090c12] px-6 py-5">
        <div className="grid grid-cols-3 items-center gap-4">
          <div className="flex items-center">
            <img
              src="/logos/oddswavelogo.png"
              alt="OddsWave"
              className="h-28 w-auto object-contain"
            />
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-black tracking-wide text-white">
              OddsWave Odds Screen
            </h1>

            <div className="mt-4 flex justify-center gap-2">
              {Object.entries(MARKETS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setMarket(key)}
                  className={`rounded-lg border px-4 py-2 font-bold ${
                    market === key
                      ? "border-violet-400 bg-violet-500/20 text-violet-300"
                      : "border-zinc-700 bg-zinc-900 text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 font-bold text-white"
            >
              <option value="NBA">NBA</option>
              <option value="MLB">MLB</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6">
        {games.map((game) => (
          <div
            key={game.id}
            className="mb-10 overflow-visible rounded-xl border border-zinc-800 bg-[#0b0e14] shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition hover:border-violet-500/30 hover:shadow-[0_0_28px_rgba(168,85,247,0.12)]"
          >
            <div className="border-b border-zinc-800 bg-[#0d1119] p-5">
              <h2 className="text-2xl font-black">
                {game.away_team} @ {game.home_team}
              </h2>

              <p className="mt-1 text-sm text-zinc-400">
                {new Date(game.commence_time).toLocaleDateString([], {
                  month: "numeric",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                •{" "}
                {new Date(game.commence_time).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                • {MARKETS[market]} • Last updated at{" "}
                {new Date().toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1500px] border-collapse">
                <thead>
                  <tr className="bg-[#171b24] text-xs uppercase text-zinc-300">
                    <th className="px-4 py-4 text-left">Selection</th>
                    <th className="px-4 py-4 text-center">Best Price</th>

                    {BOOKS.map((bookKey) => (
                      <th key={bookKey} className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <img
                            src={BOOK_LOGOS[bookKey]}
                            alt={BOOK_LABELS[bookKey]}
                            className="h-10 w-10 rounded-lg bg-zinc-900 object-contain p-1"
                          />

                          <span className="text-[10px] normal-case text-zinc-400">
                            {BOOK_LABELS[bookKey]}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  <MarketSection game={game} marketKey={market} />
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}