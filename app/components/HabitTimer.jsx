"use client";
import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Format total seconds into display string.
 * If total duration >= 1 hour => HH:MM:SS
 * Otherwise => MM:SS
 */
function formatTime(seconds, totalDuration) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (totalDuration >= 3600) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * HabitTimer — A countdown timer widget for time-enabled habits.
 * Props:
 *   totalSeconds: number — total countdown duration
 *   label: string — human-readable duration label
 */
export default function HabitTimer({ totalSeconds, label }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  // Progress percentage (how much time has elapsed)
  const progress =
    totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;

  // Timer tick
  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            setIsCompleted(true);
            triggerCompletion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, remaining]);

  // Completion alert — audio chime + browser notification
  const triggerCompletion = useCallback(() => {
    // Play a chime using Web Audio API
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();

      // Play a pleasant two-tone chime
      const playTone = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          ctx.currentTime + startTime + duration,
        );
        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
      };

      playTone(523.25, 0, 0.3); // C5
      playTone(659.25, 0.15, 0.3); // E5
      playTone(783.99, 0.3, 0.5); // G5
    } catch {
      // Audio not supported — silent fallback
    }

    // Browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("⏰ Timer Complete!", {
        body: "Your habit timer has finished. Great job!",
        icon: "⏰",
      });
    } else if (
      "Notification" in window &&
      Notification.permission !== "denied"
    ) {
      Notification.requestPermission();
    }
  }, []);

  const handleStart = () => {
    if (remaining === 0) {
      // Reset first if completed
      setRemaining(totalSeconds);
      setIsCompleted(false);
    }
    setIsRunning(true);
    setIsCompleted(false);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setRemaining(totalSeconds);
    setIsCompleted(false);
  };

  // Determine display color based on state
  let timerClass = "habit-timer";
  if (isCompleted) timerClass += " timer-completed";
  else if (isRunning) timerClass += " timer-running";
  else if (remaining < totalSeconds) timerClass += " timer-paused";

  return (
    <div className={timerClass}>
      {/* Timer icon + label */}
      <div className="timer-header">
        <span className="timer-icon">⏱</span>
        <span className="timer-label">{label}</span>
      </div>

      {/* Circular progress + time display */}
      <div className="timer-display-wrap">
        <svg
          className="timer-ring"
          width="52"
          height="52"
          viewBox="0 0 52 52"
        >
          <circle
            className="timer-ring-bg"
            cx="26"
            cy="26"
            r="22"
            strokeWidth="4"
            fill="none"
          />
          <circle
            className="timer-ring-progress"
            cx="26"
            cy="26"
            r="22"
            strokeWidth="4"
            fill="none"
            strokeDasharray={2 * Math.PI * 22}
            strokeDashoffset={
              2 * Math.PI * 22 - (progress / 100) * 2 * Math.PI * 22
            }
            strokeLinecap="round"
          />
        </svg>
        <span className="timer-time">
          {formatTime(remaining, totalSeconds)}
        </span>
      </div>

      {/* Controls */}
      <div className="timer-controls">
        {!isRunning ? (
          <button
            className="timer-btn timer-btn-start"
            onClick={handleStart}
            title="Start"
          >
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
              <path d="M0 0L10 6L0 12Z" />
            </svg>
          </button>
        ) : (
          <button
            className="timer-btn timer-btn-pause"
            onClick={handlePause}
            title="Pause"
          >
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
              <rect x="0" y="0" width="3" height="12" />
              <rect x="7" y="0" width="3" height="12" />
            </svg>
          </button>
        )}
        <button
          className="timer-btn timer-btn-reset"
          onClick={handleReset}
          title="Reset"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1v4h4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M1 5A5 5 0 1 1 2.5 9.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Completion flash overlay */}
      {isCompleted && (
        <div className="timer-complete-flash">
          <span className="timer-complete-check">✓</span>
        </div>
      )}
    </div>
  );
}
