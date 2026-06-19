import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isMemberStatus,
  detectFollow,
  shouldGrantBonus,
  isValidTelegramAuth,
  computeTelegramHash,
  type TelegramAuthData,
} from "../src/lib/social/pure";

// --- Telegram membership status mapping ---
test("isMemberStatus: valid statuses count as joined", () => {
  for (const s of ["creator", "administrator", "member", "restricted"]) {
    assert.equal(isMemberStatus(s), true, `${s} should be a member`);
  }
});

test("isMemberStatus: invalid/unknown statuses are not joined", () => {
  for (const s of ["left", "kicked", "unknown", "", undefined, null]) {
    assert.equal(isMemberStatus(s as string), false);
  }
});

// --- X follow detection ---
test("detectFollow: true when target id present", () => {
  assert.equal(detectFollow(["1", "2", "999"], "999"), true);
});

test("detectFollow: false when absent or no target", () => {
  assert.equal(detectFollow(["1", "2"], "999"), false);
  assert.equal(detectFollow(["1"], ""), false);
});

// --- Bonus grant once only ---
test("shouldGrantBonus: only when both confirmed and not already granted", () => {
  assert.equal(shouldGrantBonus(true, true, false), true);
  assert.equal(shouldGrantBonus(true, true, true), false, "already granted");
  assert.equal(shouldGrantBonus(true, false, false), false, "only X");
  assert.equal(shouldGrantBonus(false, true, false), false, "only TG");
  assert.equal(shouldGrantBonus(false, false, false), false);
});

// --- Telegram auth hash validation ---
const BOT = "123456:test-bot-token";

function signed(now: number): TelegramAuthData {
  const base = {
    id: 42,
    username: "blobfan",
    auth_date: Math.floor(now / 1000),
  };
  const hash = computeTelegramHash(base, BOT);
  return { ...base, hash };
}

test("isValidTelegramAuth: accepts a correctly signed, fresh payload", () => {
  const now = Date.now();
  assert.equal(isValidTelegramAuth(signed(now), BOT, 24 * 60 * 60 * 1000, now), true);
});

test("isValidTelegramAuth: rejects a tampered payload", () => {
  const now = Date.now();
  const data = signed(now);
  const tampered = { ...data, id: 99 }; // hash no longer matches
  assert.equal(isValidTelegramAuth(tampered, BOT, 24 * 60 * 60 * 1000, now), false);
});

test("isValidTelegramAuth: rejects wrong bot token", () => {
  const now = Date.now();
  assert.equal(isValidTelegramAuth(signed(now), "wrong:token", 24 * 60 * 60 * 1000, now), false);
});

test("isValidTelegramAuth: rejects a stale login", () => {
  const old = Date.now() - 48 * 60 * 60 * 1000;
  assert.equal(isValidTelegramAuth(signed(old), BOT, 24 * 60 * 60 * 1000, Date.now()), false);
});

test("isValidTelegramAuth: rejects missing hash/token", () => {
  assert.equal(
    isValidTelegramAuth({ id: 1, auth_date: 1, hash: "" } as TelegramAuthData, BOT),
    false,
  );
});
