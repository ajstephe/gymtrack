/** Best-effort tactile feedback — silently no-ops where the Vibration API isn't available (iOS Safari, desktop). */
function fire(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // ignore — vibration is a nicety, never worth surfacing an error over
  }
}

/** A light tick for routine confirmations: logging a set, saving an edit, a toggle. */
export function hapticTap() {
  fire(8);
}

/** A firmer double-pulse for a destructive action landing (delete confirmed). */
export function hapticImpact() {
  fire([12, 30, 12]);
}

/** A distinct celebratory pattern for hitting a new personal record. */
export function hapticSuccess() {
  fire([15, 40, 15, 40, 25]);
}
