/**
 * Smart Time Parser v2
 * Extracts time durations from habit names/descriptions.
 *
 * Supported patterns:
 *   Hours  → "1 hour fitness", "2hr study", "1.5 hours reading"
 *   Minutes → "10 min walk", "30-minute meditation", "20 mins journaling"
 *   Seconds → "90 second plank", "45sec rest"
 *
 * Open-ended patterns:
 *   "6+ hour study"       → 6 hours, isOpenEnded: true
 *   "2-3 hour workout"    → 2 hours (lower bound), isOpenEnded: true
 *   "at least 1hr reading"→ 1 hour, isOpenEnded: true
 *   "30+ min walk"        → 30 minutes, isOpenEnded: true
 *
 * Returns { detected, totalSeconds, label, isOpenEnded } or { detected: false }
 */

const UNIT_DEFS = [
  { regex: /hours?|hrs?/i, unit: "hours", toSeconds: (v) => v * 3600 },
  { regex: /minutes?|mins?/i, unit: "minutes", toSeconds: (v) => v * 60 },
  { regex: /seconds?|secs?/i, unit: "seconds", toSeconds: (v) => v },
];

// Build pattern list — order matters (check most specific first)
function buildPatterns() {
  const patterns = [];

  for (const u of UNIT_DEFS) {
    const unitStr = u.regex.source;

    // Range pattern: "2-3 hour", "2–3 hours" (uses lower bound, open-ended)
    patterns.push({
      regex: new RegExp(`(\\d+(?:\\.\\d+)?)\\s*[-–]\\s*\\d+(?:\\.\\d+)?\\s*[-–]?\\s*(?:${unitStr})\\b`, "i"),
      ...u,
      openEnded: true,
    });

    // Open-ended with "+": "6+ hour", "30+ min"
    patterns.push({
      regex: new RegExp(`(\\d+(?:\\.\\d+)?)\\s*\\+\\s*[-–]?\\s*(?:${unitStr})\\b`, "i"),
      ...u,
      openEnded: true,
    });

    // "at least" prefix: "at least 1hr", "at least 30 minutes"
    patterns.push({
      regex: new RegExp(`at\\s+least\\s+(\\d+(?:\\.\\d+)?)\\s*[-–]?\\s*(?:${unitStr})\\b`, "i"),
      ...u,
      openEnded: true,
    });

    // Standard pattern: "1 hour", "30-minute", "45sec"
    patterns.push({
      regex: new RegExp(`(\\d+(?:\\.\\d+)?)\\s*[-–]?\\s*(?:${unitStr})\\b`, "i"),
      ...u,
      openEnded: false,
    });
  }

  return patterns;
}

const TIME_PATTERNS = buildPatterns();

/**
 * Parse a habit name/description for time duration.
 * @param {string} text - The habit name or description
 * @returns {{ detected: boolean, totalSeconds?: number, label?: string, isOpenEnded?: boolean }}
 */
export function parseTimeDuration(text) {
  if (!text || typeof text !== "string") {
    return { detected: false };
  }

  for (const pattern of TIME_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match) {
      const numericValue = parseFloat(match[1]);

      // Edge case: zero or negative values → ignore
      if (numericValue <= 0 || !isFinite(numericValue)) {
        continue;
      }

      const totalSeconds = Math.round(pattern.toSeconds(numericValue));

      // Sanity: cap at 24 hours (86400 seconds)
      if (totalSeconds > 86400) {
        continue;
      }

      return {
        detected: true,
        totalSeconds,
        label: formatDurationLabel(totalSeconds),
        isOpenEnded: pattern.openEnded,
      };
    }
  }

  return { detected: false };
}

/**
 * Format seconds into a human-readable label.
 * e.g. 3600 → "1h 00m 00s", 90 → "1m 30s"
 */
export function formatDurationLabel(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  }
  if (m > 0) {
    return `${m}m ${String(s).padStart(2, "0")}s`;
  }
  return `${s}s`;
}
