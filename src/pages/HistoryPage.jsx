import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useUser, UserButton } from "@clerk/clerk-react";
import {
  getTimerHistory,
  getActivityLog,
  clearAllHistory,
  clearTimerHistory,
  clearActivityLog,
  deleteTimerHistoryEntry,
} from "../lib/activityLogger";
import { formatTimeClean } from "../lib/timeParser";

const ACTION_LABELS = {
  habit_checked: { icon: "✓", label: "Habit Checked", color: "var(--accent)" },
  habit_unchecked: { icon: "○", label: "Habit Unchecked", color: "var(--text-muted)" },
  habit_created: { icon: "+", label: "Habit Created", color: "var(--green)" },
  habit_deleted: { icon: "✕", label: "Habit Deleted", color: "var(--red)" },
  timer_started: { icon: "▶", label: "Timer Started", color: "var(--accent)" },
  timer_paused: { icon: "⏸", label: "Timer Paused", color: "var(--orange)" },
  timer_reset: { icon: "↺", label: "Timer Reset", color: "var(--text-muted)" },
  timer_completed: { icon: "🏁", label: "Timer Completed", color: "var(--green)" },
  timer_goal_reached: { icon: "🎯", label: "Goal Reached", color: "var(--green)" },
  timer_stopped: { icon: "⏹", label: "Timer Stopped", color: "var(--orange)" },
  timer_auto_crossed: { icon: "❌", label: "Auto-Crossed", color: "var(--red)" },
};

/**
 * Format a date string as "Weekday, Month Day, Year"
 * e.g. "Saturday, April 25, 2026"
 */
function formatDateHeading(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Get date key (YYYY-MM-DD) from an ISO timestamp
 */
function getDateKey(isoString) {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/**
 * Get day dot CSS class based on aggregate daily progress.
 * gray: no activity, amber: <50%, teal: 50-99%, green: 100%
 */
function getDayDotClass(tasks) {
  const withTarget = tasks.filter(t => t.targetDuration > 0);
  if (withTarget.length === 0) {
    // No target-based tasks — check if any time was logged
    const anyTime = tasks.some(t => t.totalTime > 0);
    return anyTime ? "dot-teal" : "dot-gray";
  }
  const totalTarget = withTarget.reduce((sum, t) => sum + t.targetDuration, 0);
  const totalSpent = withTarget.reduce((sum, t) => sum + Math.min(t.totalTime, t.targetDuration), 0);
  const pct = totalTarget > 0 ? (totalSpent / totalTarget) * 100 : 0;
  if (pct >= 100) return "dot-green";
  if (pct >= 50) return "dot-teal";
  if (pct > 0) return "dot-amber";
  return "dot-gray";
}

/**
 * Get progress bar color class.
 */
function getProgressColor(pct) {
  return pct >= 100 ? "progress-green" : "progress-red";
}

export default function HistoryPage() {
  const { user } = useUser();
  const [tab, setTab] = useState("timers");
  const [timerHistory, setTimerHistory] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [history, logs] = await Promise.all([getTimerHistory(), getActivityLog()]);
      setTimerHistory(history);
      setActivityLog(logs);
    } catch {
      setTimerHistory([]);
      setActivityLog([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  // ─── Group timer history by date, aggregate per task per day ───
  const groupedHistory = useMemo(() => {
    // Group entries by date → then by task name, summing actual time
    const dateMap = {};

    timerHistory.forEach((entry) => {
      const dateKey = getDateKey(entry.timestamp);
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {};
      }

      const taskName = entry.habitName;
      if (!dateMap[dateKey][taskName]) {
        dateMap[dateKey][taskName] = {
          habitName: taskName,
          totalTime: 0,
          targetDuration: entry.targetDuration || 0,
          entryIds: [],
        };
      }

      dateMap[dateKey][taskName].totalTime += (entry.actualTime || 0);
      // Keep the highest target duration seen for this task
      if ((entry.targetDuration || 0) > dateMap[dateKey][taskName].targetDuration) {
        dateMap[dateKey][taskName].targetDuration = entry.targetDuration;
      }
      dateMap[dateKey][taskName].entryIds.push(entry.id);
    });

    // Convert to sorted array: newest date first
    const sortedDates = Object.keys(dateMap).sort((a, b) => b.localeCompare(a));

    return sortedDates.map((dateKey) => {
      const tasks = Object.values(dateMap[dateKey]).sort((a, b) =>
        b.totalTime - a.totalTime
      );
      return {
        dateKey,
        dateLabel: formatDateHeading(dateKey),
        tasks,
        dotClass: getDayDotClass(tasks),
      };
    });
  }, [timerHistory]);

  const handleClear = async (target) => {
    if (target === "all") await clearAllHistory();
    else if (target === "timers") await clearTimerHistory();
    else if (target === "activity") await clearActivityLog();
    await refreshData();
    setShowClearConfirm(false);
  };

  const handleDeleteEntry = async (id) => {
    setDeletingId(id);
    const ok = await deleteTimerHistoryEntry(id);
    if (ok) {
      setTimerHistory((prev) => prev.filter((e) => e.id !== id));
    }
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  // Delete all entries for a task on a specific day
  const handleDeleteDayTask = async (entryIds) => {
    setDeletingId(entryIds[0]);
    for (const id of entryIds) {
      await deleteTimerHistoryEntry(id);
    }
    setTimerHistory((prev) => prev.filter((e) => !entryIds.includes(e.id)));
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  return (
    <div className="app-wrapper">
      <div style={{ position: "relative", zIndex: 10 }}>
        <header className="header">
          <div className="header-left">
            <h1><span className="accent">SK&apos;</span> HABIT <strong>TRACKER</strong></h1>
            <p className="header-subtitle">History &amp; Activity Log</p>
          </div>
          <div className="header-right">
            <div className="header-profile">
              <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: { width: 36, height: 36 } } }} />
              <span className="header-profile-name">{user?.fullName || user?.firstName || user?.username || "User"}</span>
            </div>
            <Link to="/" className="header-nav-link">📊 Tracker</Link>
            <Link to="/expenses" className="header-nav-link">💰 Expenses</Link>
          </div>
        </header>

        <div className="history-page">
          <div className="history-tabs">
            <button className={`history-tab ${tab === "timers" ? "active" : ""}`} onClick={() => setTab("timers")}>
              <span className="history-tab-icon">⏱</span> Timer History
              {timerHistory.length > 0 && <span className="history-tab-count">{timerHistory.length}</span>}
            </button>
            <button className={`history-tab ${tab === "activity" ? "active" : ""}`} onClick={() => setTab("activity")}>
              <span className="history-tab-icon">📋</span> Activity Log
              {activityLog.length > 0 && <span className="history-tab-count">{activityLog.length}</span>}
            </button>
            <div className="history-tab-spacer" />
            <button className="history-clear-btn" onClick={() => setShowClearConfirm(true)}>🗑 Clear History</button>
          </div>

          {loading && (
            <div className="history-empty"><span className="history-empty-icon">⏳</span><p>Loading history…</p></div>
          )}

          {/* ─── Timer History: Date-Grouped View ─── */}
          {!loading && tab === "timers" && (
            <div className="history-section">
              {groupedHistory.length === 0 ? (
                <div className="history-empty">
                  <span className="history-empty-icon">⏱</span>
                  <p>No timer sessions recorded yet.</p>
                  <p className="history-empty-sub">Start a timer from the Active Timer panel to see your sessions here.</p>
                </div>
              ) : (
                <div className="history-date-groups">
                  {groupedHistory.map((group) => (
                    <div key={group.dateKey} className="history-date-group">
                      <div className="history-date-heading">
                        <span className={`history-date-dot ${group.dotClass}`} />
                        <h3>{group.dateLabel}</h3>
                      </div>
                      <div className="history-task-list">
                        {group.tasks.map((task) => {
                          const taskKey = `${group.dateKey}_${task.habitName}`;
                          const taskPct = task.targetDuration > 0
                            ? Math.min(100, Math.round((task.totalTime / task.targetDuration) * 100))
                            : (task.totalTime > 0 ? 100 : 0);
                          return (
                            <div key={taskKey} className="history-task-row">
                              <span className="history-task-branch">└──</span>
                              <span className="history-task-name">{task.habitName}</span>
                              <span className={`history-task-dots ${taskPct >= 100 ? "dots-green" : "dots-red"}`} />
                              <span className={`history-task-time ${task.totalTime === 0 ? "zero" : ""}`}>
                                {formatTimeClean(task.totalTime)}
                              </span>
                              <span className="history-task-actions">
                                {confirmDeleteId === taskKey ? (
                                  <span className="history-delete-confirm">
                                    <button
                                      className="history-delete-yes"
                                      onClick={() => handleDeleteDayTask(task.entryIds)}
                                      disabled={deletingId === task.entryIds[0]}
                                      title="Confirm delete"
                                    >
                                      {deletingId === task.entryIds[0] ? "…" : "✓"}
                                    </button>
                                    <button
                                      className="history-delete-no"
                                      onClick={() => setConfirmDeleteId(null)}
                                      title="Cancel"
                                    >✕</button>
                                  </span>
                                ) : (
                                  <button
                                    className="history-delete-btn"
                                    onClick={() => setConfirmDeleteId(taskKey)}
                                    title="Delete this entry"
                                  >🗑</button>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Activity Log ─── */}
          {!loading && tab === "activity" && (
            <div className="history-section">
              {activityLog.length === 0 ? (
                <div className="history-empty">
                  <span className="history-empty-icon">📋</span>
                  <p>No activity recorded yet.</p>
                  <p className="history-empty-sub">Activities like timer starts, pauses, resets, and completions will appear here.</p>
                </div>
              ) : (
                <div className="activity-log-list">
                  {activityLog.map((entry) => {
                    const info = ACTION_LABELS[entry.action] || { icon: "•", label: entry.action, color: "var(--text-muted)" };
                    return (
                      <div key={entry.id} className="activity-log-item">
                        <span className="activity-icon" style={{ color: info.color }}>{info.icon}</span>
                        <div className="activity-info">
                          <span className="activity-action">{info.label}</span>
                          <span className="activity-habit">{entry.habitName}</span>
                          {entry.detail && <span className="activity-detail">{entry.detail}</span>}
                        </div>
                        <span className="activity-time">{formatDateTime(entry.timestamp)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {showClearConfirm && (
          <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
            <div className="modal-card history-clear-modal" onClick={(e) => e.stopPropagation()}>
              <h2 className="modal-title">Clear History</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "20px" }}>
                This action cannot be undone. Choose what to clear:
              </p>
              <div className="history-clear-options">
                <button className="history-clear-option" onClick={() => handleClear("timers")}>
                  <span>⏱</span> Clear Timer History <span className="history-clear-count">({timerHistory.length})</span>
                </button>
                <button className="history-clear-option" onClick={() => handleClear("activity")}>
                  <span>📋</span> Clear Activity Log <span className="history-clear-count">({activityLog.length})</span>
                </button>
                <button className="history-clear-option danger" onClick={() => handleClear("all")}>
                  <span>🗑</span> Clear Everything
                </button>
              </div>
              <button className="btn-cancel" onClick={() => setShowClearConfirm(false)} style={{ marginTop: "12px", width: "100%" }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
