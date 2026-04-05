/**
 * Smart Time Parser
 * Extracts time durations from habit names/descriptions.
 *
 * Supported patterns:
 *   Hours  → "1 hour fitness", "2hr study", "1.5 hours reading"
 *   Minutes → "10 min walk", "30-minute meditation", "20 mins journaling"
 *   Seconds → "90 second plank", "45sec rest"
 *
 * Returns { detected: true, totalSeconds, label } or { detected: false }
 */

// Order matters: check hours first, then minutes, then seconds
const TIME_PATTERNS = [
  // Hours: "1 hour", "2hrs", "1.5 hours", "2-hour", "3 hr"
  {
    regex: /(\d+(?:\.\d+)?)\s*[-–]?\s*(?:hours?|hrs?)\b/i,
    unit: "hours",
    toSeconds: (val) => val * 3600,
  },
  // Minutes: "10 min", "30-minute", "20 mins", "15minutes"
  {
    regex: /(\d+(?:\.\d+)?)\s*[-–]?\s*(?:minutes?|mins?)\b/i,
    unit: "minutes",
    toSeconds: (val) => val * 60,
  },
  // Seconds: "90 second", "45sec", "60 seconds"
  {
    regex: /(\d+(?:\.\d+)?)\s*[-–]?\s*(?:seconds?|secs?)\b/i,
    unit: "seconds",
    toSeconds: (val) => val,
  },
];

/**
 * Parse a habit name/description for time duration.
 * @param {string} text - The habit name or description
 * @returns {{ detected: boolean, totalSeconds?: number, label?: string }}
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
      };
    }
  }

  return { detected: false };
}

/**
 * Format seconds into a human-readable label.
 * e.g. 3600 → "1h 00m 00s", 90 → "1m 30s"
 */
function formatDurationLabel(seconds) {
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
