import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useUser, UserButton } from "@clerk/clerk-react";
import {
  getTimerHistory,
  clearTimerHistory,
  deleteTimerHistoryEntry,
} from "../lib/activityLogger";
import { formatTimeClean } from "../lib/timeParser";

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
  const [timerHistory, setTimerHistory] = useState([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const history = await getTimerHistory();
      setTimerHistory(history);
    } catch {
      setTimerHistory([]);
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

  const handleClear = async () => {
    await clearTimerHistory();
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
            <button className="history-tab active">
              <span className="history-tab-icon">⏱</span> Timer History
              {timerHistory.length > 0 && <span className="history-tab-count">{timerHistory.length}</span>}
            </button>
            <div className="history-tab-spacer" />
            <button className="history-clear-btn" onClick={() => setShowClearConfirm(true)}>🗑 Clear History</button>
          </div>

          {loading && (
            <div className="history-empty"><span className="history-empty-icon">⏳</span><p>Loading history…</p></div>
          )}

          {/* ─── Timer History: Date-Grouped View ─── */}
          {!loading && (
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
                              <div className="history-task-progress">
                                <div
                                  className={`history-task-progress-fill ${taskPct >= 100 ? "fill-green" : "fill-red"}`}
                                  style={{ width: `${taskPct}%` }}
                                />
                              </div>
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
        </div>

        {showClearConfirm && (
          <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
            <div className="modal-card history-clear-modal" onClick={(e) => e.stopPropagation()}>
              <h2 className="modal-title">Clear History</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "20px" }}>
                This action cannot be undone.
              </p>
              <div className="history-clear-options">
                <button className="history-clear-option danger" onClick={handleClear}>
                  <span>🗑</span> Clear All Timer History <span className="history-clear-count">({timerHistory.length})</span>
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
