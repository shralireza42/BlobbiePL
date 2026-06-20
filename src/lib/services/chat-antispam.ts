import "server-only";

/**
 * In-memory chat anti-spam with escalating penalties:
 *   1st offense  → warn ("don't spam")
 *   2nd offense  → mute (15 min)
 *   3rd+ offense → ban from chat (15 min)
 *
 * Spam = too many messages in a short window, messages sent too fast, or
 * repeated identical messages. Offenses decay after a quiet period.
 */

type Rec = {
  times: number[];
  lastBody: string;
  offenses: number;
  lastOffenseAt: number;
};

const globalForSpam = globalThis as unknown as {
  chatSpam?: Map<string, Rec>;
};
const store: Map<string, Rec> = (globalForSpam.chatSpam ??= new Map<string, Rec>());

const WINDOW_MS = 10_000; // rolling window
const MAX_IN_WINDOW = 5; // > this many in the window = spam
const MIN_GAP_MS = 700; // faster than this between messages = spam
const DUP_WINDOW_MS = 30_000; // identical message within this = spam
const OFFENSE_DECAY_MS = 30 * 60_000; // forget offenses after 30 min of calm

/** Penalty duration for spam mutes/bans (minutes). */
export const SPAM_PENALTY_MINUTES = 15;

export type SpamResult = {
  action: "allow" | "warn" | "mute" | "ban";
  message?: string;
};

export function checkSpam(wallet: string, body: string): SpamResult {
  const key = wallet.toLowerCase();
  const now = Date.now();
  const rec =
    store.get(key) ?? { times: [], lastBody: "", offenses: 0, lastOffenseAt: 0 };

  if (now - rec.lastOffenseAt > OFFENSE_DECAY_MS) rec.offenses = 0;

  const recent = rec.times.filter((t) => now - t < WINDOW_MS);
  const norm = body.trim().toLowerCase();
  const last = recent[recent.length - 1] ?? 0;

  const tooMany = recent.length >= MAX_IN_WINDOW;
  const tooFast = recent.length > 0 && now - last < MIN_GAP_MS;
  const duplicate = norm.length > 0 && norm === rec.lastBody && now - last < DUP_WINDOW_MS;
  const isSpam = tooMany || tooFast || duplicate;

  if (!isSpam) {
    rec.times = [...recent, now];
    rec.lastBody = norm;
    store.set(key, rec);
    return { action: "allow" };
  }

  rec.offenses += 1;
  rec.lastOffenseAt = now;
  rec.times = [...recent, now];
  store.set(key, rec);

  if (rec.offenses === 1) {
    return { action: "warn", message: "Please slow down — don't spam the chat." };
  }
  if (rec.offenses === 2) {
    return {
      action: "mute",
      message: `You've been muted for ${SPAM_PENALTY_MINUTES} minutes for spamming.`,
    };
  }
  return {
    action: "ban",
    message: `You've been banned from chat for ${SPAM_PENALTY_MINUTES} minutes for spamming.`,
  };
}

if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, rec] of store.entries()) {
        const lastActivity = Math.max(rec.lastOffenseAt, rec.times[rec.times.length - 1] ?? 0);
        if (now - lastActivity > OFFENSE_DECAY_MS) store.delete(key);
      }
    },
    10 * 60_000,
  ).unref?.();
}
