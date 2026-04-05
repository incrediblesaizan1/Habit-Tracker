"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { parseTimeDuration, formatDurationLabel } from "../lib/timeParser";
import { logTimerEvent, logActivity } from "../lib/activityLogger";

/**
 * Format total seconds into display string.
 * Always HH:MM:SS if totalDuration >= 1 hour, else MM:SS
 */
function formatTime(seconds, useHours = false) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

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

// ─── Individual Timer Logic (per-habit) ───
function useTimerState(totalSeconds, isOpenEnded, habitName) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState("countdown"); // "countdown" | "stopwatch"
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [goalReached, setGoalReached] = useState(false);
  const intervalRef = useRef(null);
  const startedAtRef = useRef(null);

  // Total elapsed time for logging
  const elapsedTime = totalSeconds - remaining + stopwatchTime;

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      if (phase === "countdown") {
        setRemaining((prev) => {
          if (prev <= 1) {
            // Countdown reached zero
            if (isOpenEnded) {
              // Switch to stopwatch phase
              setPhase("stopwatch");
              setGoalReached(true);
              logActivity({ action: "timer_goal_reached", habitName });
              // Don't stop — continue as stopwatch
              return 0;
            } else {
              // Fixed duration: complete
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
        // Stopwatch phase — count up
        setStopwatchTime((prev) => prev + 1);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, phase, isOpenEnded, habitName, totalSeconds]);

  const start = useCallback(() => {
    if (!startedAtRef.current) startedAtRef.current = Date.now();
    setIsRunning(true);
    if (remaining === 0 && phase === "countdown" && !isOpenEnded) {
      // Reset if completed fixed-duration
      setRemaining(totalSeconds);
      setGoalReached(false);
    }
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
    startedAtRef.current = null;
    logActivity({ action: "timer_reset", habitName });
  }, [totalSeconds, habitName]);

  const stop = useCallback(() => {
    // Stop and log the session
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

    // Reset state
    setRemaining(totalSeconds);
    setPhase("countdown");
    setStopwatchTime(0);
    setGoalReached(false);
    startedAtRef.current = null;
  }, [totalSeconds, remaining, stopwatchTime, goalReached, isOpenEnded, habitName]);

  const progress = totalSeconds > 0
    ? Math.min(100, ((totalSeconds - remaining) / totalSeconds) * 100)
    : 0;

  return {
    remaining, isRunning, phase, stopwatchTime, goalReached,
    progress, elapsedTime,
    start, pause, reset, stop,
  };
}

// ─── Main Panel Component ───
export default function ActiveTimerPanel({ habits, isFullWidth = false }) {
  // Find all timer-enabled habits
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

  // Clamp activeIndex if habits list changes
  useEffect(() => {
    if (activeIndex >= timedHabits.length) {
      setActiveIndex(Math.max(0, timedHabits.length - 1));
    }
  }, [timedHabits.length, activeIndex]);

  if (timedHabits.length === 0) return null;

  const activeHabit = timedHabits[activeIndex];

  return (
    <div className={`active-timer-panel ${isFullWidth ? "full-width" : "side-panel"}`}>
      <div className="atp-header">
        <span className="atp-icon">⏱</span>
        <h3 className="atp-title">Active Timer</h3>
        {timedHabits.length > 1 && (
          <span className="atp-count">{timedHabits.length} timers</span>
        )}
      </div>

      {/* Habit Tabs */}
      {timedHabits.length > 1 && (
        <div className="atp-tabs">
          {timedHabits.map((h, i) => (
            <button
              key={h.id}
              className={`atp-tab ${i === activeIndex ? "active" : ""}`}
              onClick={() => setActiveIndex(i)}
              title={h.name}
            >
              <span className="atp-tab-name">{h.name}</span>
              <span className="atp-tab-duration">{h.timerInfo.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Timer Display */}
      {activeHabit && (
        <TimerDisplay
          key={activeHabit.id}
          habit={activeHabit}
          totalSeconds={activeHabit.timerInfo.totalSeconds}
          label={activeHabit.timerInfo.label}
          isOpenEnded={activeHabit.timerInfo.isOpenEnded}
        />
      )}
    </div>
  );
}

// ─── Timer Display for a single habit ───
function TimerDisplay({ habit, totalSeconds, label, isOpenEnded }) {
  const timer = useTimerState(totalSeconds, isOpenEnded, habit.name);
  const useHours = totalSeconds >= 3600;

  const RING_R = 62;
  const RING_CIRC = 2 * Math.PI * RING_R;
  const ringOffset = RING_CIRC - (timer.progress / 100) * RING_CIRC;

  // Determine visual state class
  let stateClass = "";
  if (timer.goalReached && timer.phase === "stopwatch") stateClass = "state-stopwatch";
  else if (timer.goalReached) stateClass = "state-completed";
  else if (timer.isRunning) stateClass = "state-running";
  else if (timer.remaining < totalSeconds) stateClass = "state-paused";

  // Status label
  let statusLabel = "";
  if (timer.phase === "stopwatch") {
    statusLabel = `Goal reached! Extra time: ${formatTime(timer.stopwatchTime, useHours)}`;
  } else if (timer.goalReached && !isOpenEnded) {
    statusLabel = "✓ Completed!";
  } else if (timer.isRunning) {
    statusLabel = `Goal: ${label} remaining`;
  } else if (timer.remaining < totalSeconds) {
    statusLabel = "Paused";
  } else {
    statusLabel = isOpenEnded ? `${label}+ goal` : `${label} goal`;
  }

  return (
    <div className={`atp-timer ${stateClass}`}>
      {/* Habit name */}
      <div className="atp-habit-name">
        {isOpenEnded && <span className="atp-open-badge">OPEN</span>}
        <span>{habit.name}</span>
      </div>

      {/* Ring + Time */}
      <div className="atp-ring-area">
        <div className="atp-ring-wrap">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle
              className="atp-ring-bg"
              cx="70" cy="70" r={RING_R}
              strokeWidth="6" fill="none"
            />
            <circle
              className="atp-ring-progress"
              cx="70" cy="70" r={RING_R}
              strokeWidth="6" fill="none"
              strokeDasharray={RING_CIRC}
              strokeDashoffset={ringOffset}
              strokeLinecap="round"
            />
            {/* Stopwatch overlay ring */}
            {timer.phase === "stopwatch" && (
              <circle
                className="atp-ring-extra"
                cx="70" cy="70" r={RING_R - 10}
                strokeWidth="3" fill="none"
                strokeDasharray="6 4"
                strokeLinecap="round"
              />
            )}
          </svg>
          <div className="atp-ring-text">
            <span className="atp-time-display">
              {timer.phase === "stopwatch"
                ? formatTime(timer.stopwatchTime, useHours)
                : formatTime(timer.remaining, useHours)}
            </span>
            <span className="atp-time-sub">
              {timer.phase === "stopwatch" ? "extra" : "remaining"}
            </span>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="atp-status">{statusLabel}</div>

      {/* Controls */}
      <div className="atp-controls">
        {!timer.isRunning ? (
          <button className="atp-btn atp-btn-start" onClick={timer.start} title="Start">
            <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor">
              <path d="M0 0L14 8L0 16Z" />
            </svg>
            <span>Start</span>
          </button>
        ) : (
          <button className="atp-btn atp-btn-pause" onClick={timer.pause} title="Pause">
            <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
              <rect x="0" y="0" width="4" height="14" />
              <rect x="8" y="0" width="4" height="14" />
            </svg>
            <span>Pause</span>
          </button>
        )}
        <button className="atp-btn atp-btn-reset" onClick={timer.reset} title="Reset">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 1v5h5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M1 6A6 6 0 1 1 3 11" strokeLinecap="round" />
          </svg>
          <span>Reset</span>
        </button>
        {(timer.isRunning || timer.remaining < totalSeconds || timer.stopwatchTime > 0) && (
          <button className="atp-btn atp-btn-stop" onClick={timer.stop} title="Stop & Log">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect x="0" y="0" width="12" height="12" rx="2" />
            </svg>
            <span>Stop</span>
          </button>
        )}
      </div>

      {/* Goal reached flash */}
      {timer.goalReached && timer.phase === "stopwatch" && (
        <div className="atp-goal-badge">
          <span>🎯 Goal Reached!</span>
        </div>
      )}
    </div>
  );
}
