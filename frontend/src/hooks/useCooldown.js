import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Countdown used by the "resend" actions so a user can't spam the mailer.
 * `start()` restarts the clock; `remaining` ticks down to 0 once per second.
 */
export default function useCooldown(defaultSeconds = 60) {
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (remaining <= 0) return undefined;
    timerRef.current = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [remaining]);

  const start = useCallback(
    (seconds = defaultSeconds) => setRemaining(Math.max(0, Math.round(seconds))),
    [defaultSeconds]
  );

  const reset = useCallback(() => setRemaining(0), []);

  return { remaining, isCoolingDown: remaining > 0, start, reset };
}

/** 95 → "1:35", 42 → "42s" — short enough to sit inside a button label. */
export function formatCooldown(seconds) {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes}:${String(rest).padStart(2, "0")}`;
  }
  return `${seconds}s`;
}
