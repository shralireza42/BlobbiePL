"use client";

import { useEffect, useState } from "react";

export function useCountdown(target?: number | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = target ? Math.max(0, target - now) : 0;
  return { remaining, isOver: !!target && remaining <= 0 };
}
