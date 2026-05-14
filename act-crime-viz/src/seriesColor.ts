/** FNV-1a 32-bit */
function fnv1a32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mix bits so nearby string hashes do not cluster in the same palette bucket. */
function mix32(n: number): number {
  let x = n >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 2246822519);
  x ^= x >>> 13;
  x = Math.imul(x, 3266489917);
  x ^= x >>> 16;
  return x >>> 0;
}

/**
 * Dense OKLCH grid on dark-UI–friendly L/C, many hue steps — stable index via key hash.
 * (Perceptually more separated than a single HSL ring from one 32-bit value.)
 */
function buildDistinctOkLch(): readonly string[] {
  const out: string[] = [];
  const hueCount = 24;
  const Ls = [0.58, 0.645, 0.705, 0.765];
  const Cs = [0.11, 0.15, 0.19];
  for (let hi = 0; hi < hueCount; hi++) {
    const h = hi * (360 / hueCount);
    for (const l of Ls) {
      for (const c of Cs) {
        out.push(`oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(2)})`);
      }
    }
  }
  return out;
}

const SERIES_COLORS = buildDistinctOkLch();

/** Stable color per series id (dataKey / category id). */
export function colorForSeriesKey(key: string): string {
  const raw = mix32(fnv1a32(key));
  // `Math.imul` is signed i32 — product can be negative; `%` then yields a negative
  // index → undefined → Recharts falls back to its default (mostly blue).
  const spread = Math.imul(raw, 2654435769) >>> 0;
  return SERIES_COLORS[spread % SERIES_COLORS.length];
}
