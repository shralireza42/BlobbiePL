"use client";

import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/client-api";
import { Skeleton } from "@/components/ui";
import {
  characterFor,
  HOW_TO_LEVEL_UP,
  LEVEL_TITLES,
  MAX_LEVEL,
} from "@/lib/levels";

type LevelResponse = {
  level: number;
  title: string;
  points: number;
  currentThreshold: number;
  nextThreshold: number | null;
  progress: number;
  pointsToNext: number;
  character: string;
  isMock: boolean;
};

export function LevelCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["level"],
    queryFn: () => getJson<LevelResponse>("/api/level"),
    refetchInterval: 30_000,
  });

  if (isLoading || !data) return <Skeleton className="h-64 w-full" />;

  const pct = Math.round(data.progress * 100);
  const atMax = data.nextThreshold === null;

  return (
    <div className="card p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-ink bg-paper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={characterFor(data.level)}
              alt={`Level ${data.level}`}
              className="h-full w-full object-cover"
            />
          </span>
          <div>
            <p className="stat-label">Level</p>
            <p className="font-display text-3xl not-italic text-cream">
              {data.level}
              <span className="text-cream-dim">/{MAX_LEVEL}</span>
            </p>
            <p className="text-sm not-italic text-accent-lime">{data.title}</p>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between text-xs not-italic text-cream-dim">
            <span>{data.points} pts</span>
            <span>
              {atMax
                ? "Max level reached"
                : `${data.pointsToNext} pts to Lv ${data.level + 1}`}
            </span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-cream/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-green to-accent-lime transition-all duration-700"
              style={{ width: `${atMax ? 100 : pct}%` }}
            />
          </div>
          {data.isMock && (
            <p className="mt-2 text-[11px] not-italic text-gold">
              Beta Mock Mode — level is simulated. Connect a database to track
              real Airdrop Points.
            </p>
          )}
        </div>
      </div>

      {/* Character ladder (editable art in /public/levels) */}
      <div className="mt-6">
        <p className="stat-label">Character ladder</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {Array.from({ length: MAX_LEVEL + 1 }, (_, lvl) => {
            const reached = lvl <= data.level;
            return (
              <span
                key={lvl}
                title={`Level ${lvl} · ${LEVEL_TITLES[lvl]}`}
                className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 ${
                  lvl === data.level
                    ? "border-accent-lime"
                    : "border-cream/15"
                } ${reached ? "" : "opacity-30 grayscale"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={characterFor(lvl)}
                  alt={`Level ${lvl}`}
                  className="h-full w-full object-cover"
                />
              </span>
            );
          })}
        </div>
      </div>

      {/* How to level up */}
      <div className="mt-6 rounded-2xl border border-cream/10 bg-cream/5 p-4">
        <p className="font-display text-sm not-italic">How to level up</p>
        <ul className="mt-3 space-y-2">
          {HOW_TO_LEVEL_UP.map((tip) => (
            <li key={tip} className="flex gap-2 text-sm not-italic text-cream-dim">
              <span className="text-accent-lime">›</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
