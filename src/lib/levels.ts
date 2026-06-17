/**
 * Blobbie level system (0–10), driven by Airdrop Points.
 *
 * Levels are computed server-side from a user's total Airdrop Points. The
 * character artwork for levels 1–10 lives in /public/levels/level-N.svg and is
 * fully editable — replace those files to change the characters. Level 0 uses
 * the default Blobbie logo.
 */

export const MAX_LEVEL = 10;

/** Points required to REACH each level (index = level). */
export const LEVEL_THRESHOLDS: number[] = [
  0, // 0
  50, // 1
  150, // 2
  350, // 3
  700, // 4
  1200, // 5
  2000, // 6
  3200, // 7
  5000, // 8
  8000, // 9
  12000, // 10
];

export const LEVEL_TITLES: string[] = [
  "Fresh Blob", // 0
  "Lil Blob", // 1
  "Blobling", // 2
  "Blob Cadet", // 3
  "Blob Scout", // 4
  "Blob Pro", // 5
  "Blob Captain", // 6
  "Blob Elite", // 7
  "Blob Master", // 8
  "Blob Wizard", // 9
  "Blob Legend", // 10
];

export type LevelInfo = {
  level: number;
  title: string;
  points: number;
  /** Points at the start of the current level. */
  currentThreshold: number;
  /** Points needed for the next level, or null at max. */
  nextThreshold: number | null;
  /** 0–1 progress toward the next level (1 at max). */
  progress: number;
  pointsToNext: number;
  character: string;
};

export function levelFromPoints(points: number): number {
  let level = 0;
  for (let i = 0; i <= MAX_LEVEL; i++) {
    if (points >= LEVEL_THRESHOLDS[i]) level = i;
  }
  return level;
}

/** Character art path for a level. Level 0 falls back to the default logo. */
export function characterFor(level: number): string {
  const clamped = Math.max(0, Math.min(MAX_LEVEL, Math.floor(level)));
  return clamped <= 0 ? "/logo.svg" : `/levels/level-${clamped}.svg`;
}

export function levelInfoFromPoints(points: number): LevelInfo {
  const level = levelFromPoints(points);
  const currentThreshold = LEVEL_THRESHOLDS[level];
  const nextThreshold = level >= MAX_LEVEL ? null : LEVEL_THRESHOLDS[level + 1];
  const span =
    nextThreshold !== null ? nextThreshold - currentThreshold : 1;
  const progress =
    nextThreshold === null
      ? 1
      : Math.min(1, Math.max(0, (points - currentThreshold) / span));
  return {
    level,
    title: LEVEL_TITLES[level],
    points,
    currentThreshold,
    nextThreshold,
    progress,
    pointsToNext: nextThreshold === null ? 0 : Math.max(0, nextThreshold - points),
    character: characterFor(level),
  };
}

/**
 * Deterministic pseudo-level from a wallet address, used in Beta Mock Mode
 * (no database) so the level characters are visible and varied for the demo.
 */
export function mockLevelFromWallet(wallet: string): number {
  let h = 0;
  const w = wallet.toLowerCase();
  for (let i = 0; i < w.length; i++) {
    h = (h * 31 + w.charCodeAt(i)) >>> 0;
  }
  return h % (MAX_LEVEL + 1);
}

/** How players level up — shown on the dashboard. */
export const HOW_TO_LEVEL_UP: string[] = [
  "Earn Airdrop Points by completing Airdrop Hub tasks (connect, join, view, buy a ticket).",
  "Return daily for a streak bonus — points are added every 24 hours.",
  "Buy Daily Rewards Draw tickets — participation grants Airdrop Points automatically.",
  "As your total points cross each threshold, your Blobbie levels up and unlocks a new character.",
  "Your character appears next to your name across the app — including the Global Chat.",
];
