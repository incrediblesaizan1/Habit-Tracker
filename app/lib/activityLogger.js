/**
 * Activity Logger — localStorage-based history tracking
 *
 * Two stores:
 *   1. timerHistory — completed/stopped timer sessions
 *   2. activityLog  — all habit-related actions
 */

const TIMER_HISTORY_KEY = "sk_timerHistory";
const ACTIVITY_LOG_KEY = "sk_activityLog";
const MAX_ENTRIES = 500;

// ─── Timer History ───

/**
 * Log a timer session.
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
  try {
    const history = getTimerHistory();
    history.unshift({
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      habitName,
      targetDuration,
      actualTime,
      status,
      isOpenEnded,
      extraTime,
      timestamp: new Date().toISOString(),
    });
    // Cap history size
    if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;
    localStorage.setItem(TIMER_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Storage full or unavailable
  }
}

/**
 * Get all timer history entries (newest first).
 */
export function getTimerHistory() {
  try {
    return JSON.parse(localStorage.getItem(TIMER_HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

// ─── Activity Log ───

/**
 * Log a general activity.
 * @param {{ action, habitName, detail? }} entry
 *   action: "habit_checked" | "habit_unchecked" | "habit_created" | "habit_deleted"
 *           | "timer_started" | "timer_paused" | "timer_reset" | "timer_completed"
 *           | "timer_goal_reached" | "timer_stopped"
 */
export function logActivity({ action, habitName, detail = "" }) {
  try {
    const log = getActivityLog();
    log.unshift({
      id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      habitName,
      detail,
      timestamp: new Date().toISOString(),
    });
    if (log.length > MAX_ENTRIES) log.length = MAX_ENTRIES;
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(log));
  } catch {
    // Storage full or unavailable
  }
}

/**
 * Get all activity log entries (newest first).
 */
export function getActivityLog() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_LOG_KEY)) || [];
  } catch {
    return [];
  }
}

// ─── Clear ───

export function clearTimerHistory() {
  try {
    localStorage.removeItem(TIMER_HISTORY_KEY);
  } catch {
    // Ignore
  }
}

export function clearActivityLog() {
  try {
    localStorage.removeItem(ACTIVITY_LOG_KEY);
  } catch {
    // Ignore
  }
}

export function clearAllHistory() {
  clearTimerHistory();
  clearActivityLog();
}
