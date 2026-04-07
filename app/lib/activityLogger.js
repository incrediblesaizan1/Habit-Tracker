/**
 * Activity Logger — Server-backed history tracking (MongoDB)
 *
 * Two stores:
 *   1. timerHistory — completed/stopped timer sessions → POST /api/timer-history
 *   2. activityLog  — all habit-related actions → POST /api/activity-log
 *
 * All data is stored on the server so it syncs across devices.
 * Fetching is done via GET requests.
 */

// ─── Timer History ───

/**
 * Log a timer session to the server.
 * @param {{ habitName, targetDuration, actualTime, status, isOpenEnded, extraTime }} entry
 *   status: "completed" | "partial" | "exceeded"
 */
export function logTimerEvent({
  habitName,
  targetDuration,
  actualTime,
  status,
  isOpenEnded = false,
  extraTime = 0,
}) {
  // Fire-and-forget POST to server
  fetch("/api/timer-history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      habitName,
      targetDuration,
      actualTime,
      status,
      isOpenEnded,
      extraTime,
    }),
  }).catch(() => {
    // Silent fail — server may be unreachable
  });
}

/**
 * Get all timer history entries from the server (newest first).
 * Returns a Promise.
 */
export async function getTimerHistory() {
  try {
    const res = await fetch("/api/timer-history");
    if (res.ok) {
      return await res.json();
    }
    return [];
  } catch {
    return [];
  }
}

// ─── Activity Log ───

/**
 * Log a general activity to the server.
 * @param {{ action, habitName, detail? }} entry
 */
export function logActivity({ action, habitName, detail = "" }) {
  // Fire-and-forget POST to server
  fetch("/api/activity-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, habitName, detail }),
  }).catch(() => {
    // Silent fail
  });
}

/**
 * Get all activity log entries from the server (newest first).
 * Returns a Promise.
 */
export async function getActivityLog() {
  try {
    const res = await fetch("/api/activity-log");
    if (res.ok) {
      return await res.json();
    }
    return [];
  } catch {
    return [];
  }
}

// ─── Clear ───

export async function clearTimerHistory() {
  try {
    await fetch("/api/timer-history", { method: "DELETE" });
  } catch {
    // Ignore
  }
}

export async function clearActivityLog() {
  try {
    await fetch("/api/activity-log", { method: "DELETE" });
  } catch {
    // Ignore
  }
}

export async function clearAllHistory() {
  await Promise.all([clearTimerHistory(), clearActivityLog()]);
}
