/**
 * Smart Time Parser v3
 * Uses the user's suggested consolidated regex approach.
 *
 * Supported patterns:
 *   "6+ Hour Study"     → 6 hours, isOpenEnded: true
 *   "2-3 hour workout"  → 2 hours (lower bound), isOpenEnded: true
 *   "30+ min walk"      → 30 minutes, isOpenEnded: true
 *   "10 min walk"       → 10 minutes, fixed
 *   "1 hour fitness"    → 1 hour, fixed
 *   "1.5hr reading"     → 90 minutes, fixed
 *   "90 second plank"   → 90 seconds, fixed
 *   "45sec rest"        → 45 seconds, fixed
 *   "at least 1hr"      → 1 hour, isOpenEnded: true
 *
 * Returns { detected, totalSeconds, label, isOpenEnded } or { detected: false }
 */

// Consolidated regex: captures number, optional +, optional range upper bound, and unit
// Groups: (1) number, (2) optional "+", (3) optional upper-bound number, (4) unit
const TIME_REGEX = /(\d+\.?\d*)\s*(\+)?\s*(?:[-–]\s*(\d+\.?\d*)\s*)?(?:[-–]?\s*)(hours?|hrs?|h|minutes?|mins?|m(?!o)|seconds?|secs?|s)\b/i;

// "at least" prefix pattern
const AT_LEAST_REGEX = /at\s+least\s+(\d+\.?\d*)\s*[-–]?\s*(hours?|hrs?|h|minutes?|mins?|m(?!o)|seconds?|secs?|s)\b/i;

function unitToSeconds(value, unit) {
  const u = unit.toLowerCase();
  if (/^(h|hr|hrs|hour|hours)$/.test(u)) return value * 3600;
  if (/^(m|min|mins|minute|minutes)$/.test(u)) return value * 60;
  if (/^(s|sec|secs|second|seconds)$/.test(u)) return value;
  return 0;
}

/**
 * Parse a habit name/description for time duration.
 * @param {string} text - The habit name or description
 * @returns {{ detected: boolean, totalSeconds?: number, label?: string, isOpenEnded?: boolean }}
 */
export function parseTimeDuration(text) {
  if (!text || typeof text !== "string") {
    return { detected: false };
  }

  // Check "at least" pattern first
  const atLeastMatch = text.match(AT_LEAST_REGEX);
  if (atLeastMatch) {
    const value = parseFloat(atLeastMatch[1]);
    if (value > 0 && isFinite(value)) {
      const totalSeconds = Math.round(unitToSeconds(value, atLeastMatch[2]));
      if (totalSeconds > 0 && totalSeconds <= 86400) {
        return {
          detected: true,
          totalSeconds,
          label: formatDurationLabel(totalSeconds),
          isOpenEnded: true,
        };
      }
    }
  }

  // Main time regex
  const match = text.match(TIME_REGEX);
  if (match) {
    const value = parseFloat(match[1]);
    const hasPlus = !!match[2]; // "+" present
    const hasRange = !!match[3]; // upper bound present (e.g. "2-3")
    const unit = match[4];

    if (value <= 0 || !isFinite(value)) {
      return { detected: false };
    }

    const totalSeconds = Math.round(unitToSeconds(value, unit));

    // Sanity: must be > 0 and <= 24 hours
    if (totalSeconds <= 0 || totalSeconds > 86400) {
      return { detected: false };
    }

    const isOpenEnded = hasPlus || hasRange;

    return {
      detected: true,
      totalSeconds,
      label: formatDurationLabel(totalSeconds),
      isOpenEnded,
    };
  }

  return { detected: false };
}

/**
 * Format seconds into a human-readable label (omits zero-value leading units).
 * e.g. 3600 → "1h", 3661 → "1h 1m 1s", 90 → "1m 30s", 0 → "0s"
 * Never shows decimals — always whole seconds.
 */
export function formatDurationLabel(seconds) {
  return formatTimeClean(seconds);
}

/**
 * Canonical time display: Xh Ym Zs format.
 * Omits zero-value units (e.g. 5m 12s, not 0h 5m 12s).
 * 0 → "0s", 65 → "1m 5s", 3661 → "1h 1m 1s"
 */
export function formatTimeClean(totalSeconds) {
  const abs = Math.abs(Math.floor(totalSeconds || 0));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;

  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}
