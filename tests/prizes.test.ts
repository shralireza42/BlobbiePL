import { test } from "node:test";
import assert from "node:assert/strict";
import { topWinnerChancePct, computeOdds } from "../src/lib/prizes";

test("topWinnerChancePct: zero tickets => 0%", () => {
  assert.equal(topWinnerChancePct(0, 300), 0);
  assert.equal(topWinnerChancePct(5, 0), 0);
});

test("topWinnerChancePct: proportional to tickets over the pool", () => {
  assert.equal(topWinnerChancePct(3, 300), 1); // 3 / 300 = 1%
  assert.equal(topWinnerChancePct(30, 300), 10);
  assert.equal(topWinnerChancePct(150, 300), 50);
});

test("topWinnerChancePct: never exceeds 100%", () => {
  assert.equal(topWinnerChancePct(400, 300), 100);
});

test("computeOdds: exposes topWinnerPct alongside winChancePct", () => {
  const odds = computeOdds(300, 30);
  assert.equal(odds.topWinnerPct, 10);
  assert.equal(typeof odds.winChancePct, "number");
});
