"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { parseTimeDuration, formatDurationLabel } from "../lib/timeParser";
import { logTimerEvent, logActivity } from "../lib/activityLogger";

// ─── Constants ───
const TIMER_STATE_KEY = "sk_timerStates";

/**
 * Format total seconds into display string.
 */
function formatTime(seconds, useHours = false) {
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;

  if (useHours || h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Play a 3-tone chime via Web Audio API.
 */
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };
    playTone(523.25, 0, 0.3);
    playTone(659.25, 0.15, 0.3);
    playTone(783.99, 0.3, 0.5);
  } catch {
    // silent fallback
  }
}

function sendNotification(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  } else if ("Notification" in window && Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}

// ─── Persistence helpers ───
function loadTimerStates() {
  try {
    return JSON.parse(localStorage.getItem(TIMER_STATE_KEY)) || {};
  } catch { return {}; }
}

function saveTimerState(habitId, state) {
  try {
    const all = loadTimerStates();
    all[habitId] = { ...state, savedAt: Date.now() };
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(all));
  } catch { /* storage full */ }
}

function clearTimerState(habitId) {
  try {
    const all = loadTimerStates();
    delete all[habitId];
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

function getSavedTimerState(habitId) {
  const all = loadTimerStates();
  return all[habitId] || null;
}

// ─── Individual Timer Logic (per-habit) with persistence ───
function useTimerState(totalSeconds, isOpenEnded, habitName, habitId) {
  // Load persisted state on mount
  const savedState = useRef(getSavedTimerState(habitId));
  const initialState = useMemo(() => {
    const saved = savedState.current;
    if (!saved) return null;

    // Calculate elapsed time since save if timer was running
    if (saved.isRunning && saved.savedAt) {
      const elapsedSinceSave = Math.floor((Date.now() - saved.savedAt) / 1000);
      if (saved.phase === "countdown") {
        const newRemaining = Math.max(0, saved.remaining - elapsedSinceSave);
        if (newRemaining === 0 && isOpenEnded) {
          // Would have transitioned to stopwatch
          const overflowTime = elapsedSinceSave - saved.remaining;
          return {
            remaining: 0,
            phase: "stopwatch",
            stopwatchTime: (saved.stopwatchTime || 0) + overflowTime,
            goalReached: true,
            isRunning: true,
          };
        } else if (newRemaining === 0 && !isOpenEnded) {
          // Would have completed
          return {
            remaining: 0,
            phase: "countdown",
            stopwatchTime: 0,
            goalReached: true,
            isRunning: false,
          };
        }
        return { ...saved, remaining: newRemaining };
      } else {
        // Stopwatch phase — add elapsed time
        return {
          ...saved,
          stopwatchTime: (saved.stopwatchTime || 0) + elapsedSinceSave,
        };
      }
    }
    return saved;
  }, [totalSeconds, isOpenEnded]);

  const [remaining, setRemaining] = useState(initialState?.remaining ?? totalSeconds);
  const [isRunning, setIsRunning] = useState(initialState?.isRunning ?? false);
  const [phase, setPhase] = useState(initialState?.phase ?? "countdown");
  const [stopwatchTime, setStopwatchTime] = useState(initialState?.stopwatchTime ?? 0);
  const [goalReached, setGoalReached] = useState(initialState?.goalReached ?? false);
  const intervalRef = useRef(null);

  // Persist state whenever it changes
  useEffect(() => {
    saveTimerState(habitId, {
      remaining, isRunning, phase, stopwatchTime, goalReached
    });
  }, [habitId, remaining, isRunning, phase, stopwatchTime, goalReached]);

  // Timer tick
  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      if (phase === "countdown") {
        setRemaining((prev) => {
          if (prev <= 1) {
            if (isOpenEnded) {
              setPhase("stopwatch");
              setGoalReached(true);
              logActivity({ action: "timer_goal_reached", habitName });
              return 0;
            } else {
              clearInterval(intervalRef.current);
              setIsRunning(false);
              setGoalReached(true);
              playChime();
              sendNotification("⏰ Timer Complete!", `${habitName} timer has finished!`);
              logActivity({ action: "timer_completed", habitName });
              logTimerEvent({
                habitName,
                targetDuration: totalSeconds,
                actualTime: totalSeconds,
                status: "completed",
                isOpenEnded: false,
                extraTime: 0,
              });
              return 0;
            }
          }
          return prev - 1;
        });
      } else {
        setStopwatchTime((prev) => prev + 1);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, phase, isOpenEnded, habitName, totalSeconds]);

  const start = useCallback(() => {
    if (remaining === 0 && phase === "countdown" && !isOpenEnded) {
      setRemaining(totalSeconds);
      setGoalReached(false);
    }
    setIsRunning(true);
    logActivity({ action: "timer_started", habitName });
  }, [remaining, phase, isOpenEnded, totalSeconds, habitName]);

  const pause = useCallback(() => {
    setIsRunning(false);
    logActivity({ action: "timer_paused", habitName });
  }, [habitName]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setRemaining(totalSeconds);
    setPhase("countdown");
    setStopwatchTime(0);
    setGoalReached(false);
    clearTimerState(habitId);
    logActivity({ action: "timer_reset", habitName });
  }, [totalSeconds, habitName, habitId]);

  const stop = useCallback(() => {
    setIsRunning(false);
    const actualTime = totalSeconds - remaining + stopwatchTime;
    let status = "partial";
    if (goalReached && stopwatchTime > 0) status = "exceeded";
    else if (goalReached) status = "completed";

    logTimerEvent({
      habitName,
      targetDuration: totalSeconds,
      actualTime,
      status,
      isOpenEnded,
      extraTime: stopwatchTime,
    });
    logActivity({ action: "timer_stopped", habitName });

    setRemaining(totalSeconds);
    setPhase("countdown");
    setStopwatchTime(0);
    setGoalReached(false);
    clearTimerState(habitId);
  }, [totalSeconds, remaining, stopwatchTime, goalReached, isOpenEnded, habitName, habitId]);

  const progress = totalSeconds > 0
    ? Math.min(100, ((totalSeconds - remaining) / totalSeconds) * 100)
    : 0;

  return {
    remaining, isRunning, phase, stopwatchTime, goalReached,
    progress,
    start, pause, reset, stop,
  };
}

// ─── Main Panel Component (Horizontal Bar) ───
export default function ActiveTimerPanel({ habits, placement = "full" }) {
  const timedHabits = useMemo(() => {
    return habits
      .map((h) => {
        const info = parseTimeDuration(h.name);
        if (!info.detected) return null;
        return { ...h, timerInfo: info };
      })
      .filter(Boolean);
  }, [habits]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex >= timedHabits.length) {
      setActiveIndex(Math.max(0, timedHabits.length - 1));
    }
  }, [timedHabits.length, activeIndex]);

  if (timedHabits.length === 0) return null;

  const activeHabit = timedHabits[activeIndex];

  return (
    <div className={`active-timer-bar timer-placement-${placement}`}>
      {/* Left: Habit Tabs */}
      {timedHabits.length > 1 && (
        <div className="atb-tabs-section">
          {timedHabits.map((h, i) => (
            <button
              key={h.id}
              className={`atb-tab ${i === activeIndex ? "active" : ""}`}
              onClick={() => setActiveIndex(i)}
              title={h.name}
            >
              <span className="atb-tab-name">{h.name}</span>
              <span className="atb-tab-dur">{h.timerInfo.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Center + Right: Timer Display */}
      {activeHabit && (
        <HorizontalTimerDisplay
          key={activeHabit.id}
          habit={activeHabit}
          totalSeconds={activeHabit.timerInfo.totalSeconds}
          label={activeHabit.timerInfo.label}
          isOpenEnded={activeHabit.timerInfo.isOpenEnded}
          singleHabit={timedHabits.length === 1}
        />
      )}
    </div>
  );
}

// ─── Horizontal Timer Display for a single habit ───
function HorizontalTimerDisplay({ habit, totalSeconds, label, isOpenEnded, singleHabit }) {
  const timer = useTimerState(totalSeconds, isOpenEnded, habit.name, habit.id);
  const useHours = totalSeconds >= 3600;

  const RING_R = 24;
  const RING_CIRC = 2 * Math.PI * RING_R;
  const ringOffset = RING_CIRC - (timer.progress / 100) * RING_CIRC;

  // Determine visual state class
  let stateClass = "";
  if (timer.goalReached && timer.phase === "stopwatch") stateClass = "state-stopwatch";
  else if (timer.goalReached) stateClass = "state-completed";
  else if (timer.isRunning) stateClass = "state-running";
  else if (timer.remaining < totalSeconds) stateClass = "state-paused";

  // Phase badge text
  let phaseBadge = "";
  if (timer.phase === "stopwatch") phaseBadge = "GOAL REACHED";
  else if (timer.goalReached && !isOpenEnded) phaseBadge = "COMPLETED";
  else if (timer.isRunning) phaseBadge = "COUNTDOWN";
  else if (timer.remaining < totalSeconds) phaseBadge = "PAUSED";

  // Sub-label for time
  let timeSub = "";
  if (timer.phase === "stopwatch") {
    timeSub = "EXTRA TIME";
  } else {
    timeSub = "REMAINING";
  }

  return (
    <div className={`atb-timer-row ${stateClass}`}>
      {/* Habit name (shown only when single habit — no tabs visible) */}
      {singleHabit && (
        <div className="atb-habit-label">
          <span className="atb-habit-name-text">{habit.name}</span>
          {isOpenEnded && <span className="atb-open-tag">OPEN</span>}
        </div>
      )}

      {/* Compact Ring + Time */}
      <div className="atb-ring-time">
        <div className="atb-ring-compact">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle
              className="atb-ring-bg"
              cx="28" cy="28" r={RING_R}
              strokeWidth="4" fill="none"
            />
            <circle
              className="atb-ring-progress"
              cx="28" cy="28" r={RING_R}
              strokeWidth="4" fill="none"
              strokeDasharray={RING_CIRC}
              strokeDashoffset={ringOffset}
              strokeLinecap="round"
            />
            {timer.phase === "stopwatch" && (
              <circle
                className="atb-ring-extra"
                cx="28" cy="28" r={RING_R - 7}
                strokeWidth="2" fill="none"
                strokeDasharray="4 3"
                strokeLinecap="round"
              />
            )}
          </svg>
        </div>
        <div className="atb-time-block">
          <span className="atb-time-display">
            {timer.phase === "stopwatch"
              ? formatTime(timer.stopwatchTime, useHours)
              : formatTime(timer.remaining, useHours)}
          </span>
          <span className="atb-time-sub">{timeSub}</span>
        </div>
      </div>

      {/* Phase Badge */}
      {phaseBadge && (
        <span className={`atb-phase-badge ${stateClass}`}>{phaseBadge}</span>
      )}

      {/* Stopwatch extra info */}
      {timer.phase === "stopwatch" && (
        <span className="atb-extra-info">
          🎯 +{formatTime(timer.stopwatchTime, useHours)}
        </span>
      )}

      {/* Controls */}
      <div className="atb-controls">
        {!timer.isRunning ? (
          <button className="atb-btn atb-btn-start" onClick={timer.start} title="Start">
            <svg width="12" height="14" viewBox="0 0 14 16" fill="currentColor">
              <path d="M0 0L14 8L0 16Z" />
            </svg>
            <span>Start</span>
          </button>
        ) : (
          <button className="atb-btn atb-btn-pause" onClick={timer.pause} title="Pause">
            <svg width="10" height="12" viewBox="0 0 12 14" fill="currentColor">
              <rect x="0" y="0" width="4" height="14" />
              <rect x="8" y="0" width="4" height="14" />
            </svg>
            <span>Pause</span>
          </button>
        )}
        <button className="atb-btn atb-btn-reset" onClick={timer.reset} title="Reset">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 1v5h5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M1 6A6 6 0 1 1 3 11" strokeLinecap="round" />
          </svg>
          <span>Reset</span>
        </button>
        {(timer.isRunning || timer.remaining < totalSeconds || timer.stopwatchTime > 0) && (
          <button className="atb-btn atb-btn-stop" onClick={timer.stop} title="Stop & Log">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
              <rect x="0" y="0" width="12" height="12" rx="2" />
            </svg>
            <span>Stop</span>
          </button>
        )}
      </div>
    </div>
  );
}
