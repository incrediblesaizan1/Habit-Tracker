"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";
import {
  getTimerHistory,
  getActivityLog,
  clearAllHistory,
  clearTimerHistory,
  clearActivityLog,
  deleteTimerHistoryEntry,
} from "../lib/activityLogger";
import { formatDurationLabel } from "../lib/timeParser";

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

const STATUS_STYLES = {
  completed: { label: "Completed", color: "#22c55e", bg: "rgba(34,197,94,0.1)", icon: "✓" },
  partial: { label: "Partial", color: "#f97316", bg: "rgba(249,115,22,0.1)", icon: "◐" },
  exceeded: { label: "Exceeded", color: "#14b8a6", bg: "rgba(20,184,166,0.1)", icon: "🔥" },
  crossed: { label: "Crossed", color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: "✕" },
  incomplete: { label: "Incomplete", color: "#eab308", bg: "rgba(234,179,8,0.1)", icon: "○" },
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatSeconds(s) {
  if (!s && s !== 0) return "—";
  return formatDurationLabel(Math.round(s));
}

export default function HistoryPage() {
  const { user } = useUser();
  const [tab, setTab] = useState("timers"); // "timers" | "activity"
  const [timerHistory, setTimerHistory] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [sortField, setSortField] = useState("timestamp");
  const [sortDir, setSortDir] = useState("desc");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Load data from server (async)
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [history, logs] = await Promise.all([
        getTimerHistory(),
        getActivityLog(),
      ]);
      setTimerHistory(history);
      setActivityLog(logs);
    } catch {
      // Fallback: empty
      setTimerHistory([]);
      setActivityLog([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Sort timer history
  const sortedTimerHistory = [...timerHistory].sort((a, b) => {
    let aVal, bVal;
    if (sortField === "timestamp") {
      aVal = new Date(a.timestamp).getTime();
      bVal = new Date(b.timestamp).getTime();
    } else if (sortField === "habitName") {
      aVal = a.habitName?.toLowerCase() || "";
      bVal = b.habitName?.toLowerCase() || "";
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    } else if (sortField === "targetDuration") {
      aVal = a.targetDuration || 0;
      bVal = b.targetDuration || 0;
    } else if (sortField === "actualTime") {
      aVal = a.actualTime || 0;
      bVal = b.actualTime || 0;
    } else if (sortField === "status") {
      aVal = a.status || "";
      bVal = b.status || "";
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === "asc" ? aVal - bVal : bVal - aVal;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

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

  const sortIcon = (field) => {
    if (sortField !== field) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  };

  return (
    <div className="app-wrapper">
      <div style={{ position: "relative", zIndex: 10 }}>
        {/* ─── HEADER ─── */}
        <header className="header">
          <div className="header-left">
            <h1>
              <span className="accent">SK&apos;</span> HABIT{" "}
              <strong>TRACKER</strong>
            </h1>
            <p className="header-subtitle">History &amp; Activity Log</p>
          </div>
          <div className="header-right">
            <div className="header-profile">
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: { avatarBox: { width: 36, height: 36 } },
                }}
              />
              <span className="header-profile-name">
                {user?.fullName || user?.firstName || user?.username || "User"}
              </span>
            </div>
            <Link href="/" className="header-nav-link">
              📊 Tracker
            </Link>
            <Link href="/expenses" className="header-nav-link">
              💰 Expenses
            </Link>
          </div>
        </header>

        {/* ─── PAGE CONTENT ─── */}
        <div className="history-page">
          {/* Tab Switcher */}
          <div className="history-tabs">
            <button
              className={`history-tab ${tab === "timers" ? "active" : ""}`}
              onClick={() => setTab("timers")}
            >
              <span className="history-tab-icon">⏱</span>
              Timer History
              {timerHistory.length > 0 && (
                <span className="history-tab-count">{timerHistory.length}</span>
              )}
            </button>
            <button
              className={`history-tab ${tab === "activity" ? "active" : ""}`}
              onClick={() => setTab("activity")}
            >
              <span className="history-tab-icon">📋</span>
              Activity Log
              {activityLog.length > 0 && (
                <span className="history-tab-count">{activityLog.length}</span>
              )}
            </button>
            <div className="history-tab-spacer" />
            <button
              className="history-clear-btn"
              onClick={() => setShowClearConfirm(true)}
            >
              🗑 Clear History
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="history-empty">
              <span className="history-empty-icon">⏳</span>
              <p>Loading history…</p>
            </div>
          )}

          {/* Timer History Tab */}
          {!loading && tab === "timers" && (
            <div className="history-section">
              {sortedTimerHistory.length === 0 ? (
                <div className="history-empty">
                  <span className="history-empty-icon">⏱</span>
                  <p>No timer sessions recorded yet.</p>
                  <p className="history-empty-sub">
                    Start a timer from the Active Timer panel to see your sessions here.
                  </p>
                </div>
              ) : (
                <div className="history-table-wrap">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th onClick={() => handleSort("habitName")} className="sortable">
                          Habit {sortIcon("habitName")}
                        </th>
                        <th onClick={() => handleSort("targetDuration")} className="sortable">
                          Target {sortIcon("targetDuration")}
                        </th>
                        <th onClick={() => handleSort("actualTime")} className="sortable">
                          Actual {sortIcon("actualTime")}
                        </th>
                        <th onClick={() => handleSort("timestamp")} className="sortable">
                          Date {sortIcon("timestamp")}
                        </th>
                        <th onClick={() => handleSort("status")} className="sortable">
                          Status {sortIcon("status")}
                        </th>
                        <th className="history-actions-th"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTimerHistory.map((entry) => {
                        const st = STATUS_STYLES[entry.status] || STATUS_STYLES.partial;
                        const pct = entry.targetDuration > 0
                          ? Math.min(100, Math.round((entry.actualTime / entry.targetDuration) * 100))
                          : 100;
                        return (
                          <tr key={entry.id} className={entry.status === "crossed" || entry.status === "incomplete" ? "history-row-missed" : ""}>
                            <td className="history-cell-habit">
                              <span className="history-habit-name">{entry.habitName}</span>
                              {entry.isOpenEnded && (
                                <span className="history-open-tag">OPEN</span>
                              )}
                            </td>
                            <td>{formatSeconds(entry.targetDuration)}</td>
                            <td>
                              <div className="history-actual-cell">
                                <span>{formatSeconds(entry.actualTime)}</span>
                                {entry.extraTime > 0 && (
                                  <span className="history-extra">
                                    +{formatSeconds(entry.extraTime)}
                                  </span>
                                )}
                                {entry.targetDuration > 0 && (
                                  <div className="history-progress-bar">
                                    <div
                                      className="history-progress-fill"
                                      style={{
                                        width: `${pct}%`,
                                        background: st.color,
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="history-cell-date">
                              {formatDateTime(entry.timestamp)}
                            </td>
                            <td>
                              <span
                                className="history-status-badge"
                                style={{ color: st.color, background: st.bg }}
                              >
                                <span className="history-status-icon">{st.icon}</span>
                                {st.label}
                                {entry.targetDuration > 0 && (
                                  <span className="history-status-pct"> {pct}%</span>
                                )}
                              </span>
                            </td>
                            <td className="history-cell-actions">
                              {confirmDeleteId === entry.id ? (
                                <span className="history-delete-confirm">
                                  <button
                                    className="history-delete-yes"
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    disabled={deletingId === entry.id}
                                    title="Confirm delete"
                                  >
                                    {deletingId === entry.id ? "…" : "✓"}
                                  </button>
                                  <button
                                    className="history-delete-no"
                                    onClick={() => setConfirmDeleteId(null)}
                                    title="Cancel"
                                  >
                                    ✕
                                  </button>
                                </span>
                              ) : (
                                <button
                                  className="history-delete-btn"
                                  onClick={() => setConfirmDeleteId(entry.id)}
                                  title="Delete this entry"
                                >
                                  🗑
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Activity Log Tab */}
          {!loading && tab === "activity" && (
            <div className="history-section">
              {activityLog.length === 0 ? (
                <div className="history-empty">
                  <span className="history-empty-icon">📋</span>
                  <p>No activity recorded yet.</p>
                  <p className="history-empty-sub">
                    Activities like timer starts, pauses, resets, and completions
                    will appear here.
                  </p>
                </div>
              ) : (
                <div className="activity-log-list">
                  {activityLog.map((entry) => {
                    const info = ACTION_LABELS[entry.action] || {
                      icon: "•", label: entry.action, color: "var(--text-muted)",
                    };
                    return (
                      <div key={entry.id} className="activity-log-item">
                        <span
                          className="activity-icon"
                          style={{ color: info.color }}
                        >
                          {info.icon}
                        </span>
                        <div className="activity-info">
                          <span className="activity-action">{info.label}</span>
                          <span className="activity-habit">{entry.habitName}</span>
                          {entry.detail && (
                            <span className="activity-detail">{entry.detail}</span>
                          )}
                        </div>
                        <span className="activity-time">
                          {formatDateTime(entry.timestamp)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Clear Confirmation Dialog */}
        {showClearConfirm && (
          <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
            <div className="modal-card history-clear-modal" onClick={(e) => e.stopPropagation()}>
              <h2 className="modal-title">Clear History</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "20px" }}>
                This action cannot be undone. Choose what to clear:
              </p>
              <div className="history-clear-options">
                <button
                  className="history-clear-option"
                  onClick={() => handleClear("timers")}
                >
                  <span>⏱</span> Clear Timer History
                  <span className="history-clear-count">({timerHistory.length})</span>
                </button>
                <button
                  className="history-clear-option"
                  onClick={() => handleClear("activity")}
                >
                  <span>📋</span> Clear Activity Log
                  <span className="history-clear-count">({activityLog.length})</span>
                </button>
                <button
                  className="history-clear-option danger"
                  onClick={() => handleClear("all")}
                >
                  <span>🗑</span> Clear Everything
                </button>
              </div>
              <button
                className="btn-cancel"
                onClick={() => setShowClearConfirm(false)}
                style={{ marginTop: "12px", width: "100%" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
