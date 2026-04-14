import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { parseTimeDuration } from "../lib/timeParser";
import { logTimerEvent, logActivity } from "../lib/activityLogger";

// ─── Constants ───
const MODAL_STATE_KEY = "sk_timerModal";
const CUSTOM_TIMERS_KEY = "sk_customTimers";
const SYNC_INTERVAL_MS = 30000; // 30 seconds polling

/**
 * Get today's date string in YYYY-MM-DD format.
 */
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Format total seconds into display string.
 */
function formatTime(seconds, useHours = false) {
  const abs = Math.abs(Math.floor(seconds));
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

// ─── Server sync helpers ───
async function fetchServerTimerStates() {
  try {
    const res = await fetch("/api/timer-state");
    if (res.ok) return await res.json();
  } catch { /* ignore */ }
  return {};
}

async function saveServerTimerState(habitId, state) {
  try {
    await fetch("/api/timer-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitId, ...state }),
    });
  } catch { /* ignore */ }
}

async function deleteServerTimerState(habitId) {
  try {
    await fetch("/api/timer-state", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitId }),
    });
  } catch { /* ignore */ }
}

async function deleteServerTimerStates(habitIds) {
  try {
    await fetch("/api/timer-state", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitIds }),
    });
  } catch { /* ignore */ }
}

// ─── Modal state persistence (local only — UI preference) ───
function saveModalState(state) {
  try { localStorage.setItem(MODAL_STATE_KEY, JSON.stringify(state)); }
  catch { /* ignore */ }
}
function loadModalState() {
  try { return JSON.parse(localStorage.getItem(MODAL_STATE_KEY)); }
  catch { return null; }
}
function clearModalState() {
  try { localStorage.removeItem(MODAL_STATE_KEY); }
  catch { /* ignore */ }
}

// ─── Custom timers persistence (local only for now) ───
function loadCustomTimers() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_TIMERS_KEY)) || []; }
  catch { return []; }
}
function saveCustomTimers(timers) {
  try { localStorage.setItem(CUSTOM_TIMERS_KEY, JSON.stringify(timers)); }
  catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════════════
// ─── Timestamp-based Timer Hook (server-synced, tab-throttle-proof) ──
// ═══════════════════════════════════════════════════════════════════
function useTimerState(totalSeconds, isOpenEnded, habitName, habitId, onComplete, serverStates) {
  // Compute initial state from server snapshot
  const serverSnapshot = serverStates?.[habitId] || null;

  const computeInitial = () => {
    // If server state belongs to a previous day, start fresh
    if (serverSnapshot && serverSnapshot.timerDate && serverSnapshot.timerDate !== getTodayKey()) {
      return {
        isRunning: false,
        phase: "countdown",
        startedAt: 0,
        elapsedBeforePause: 0,
        stopwatchTime: 0,
        goalReached: false,
      };
    }
    if (!serverSnapshot) {
      return {
        isRunning: false,
        phase: "countdown",
        startedAt: 0,
        elapsedBeforePause: 0,
        stopwatchTime: 0,
        goalReached: false,
      };
    }
    return {
      isRunning: serverSnapshot.isRunning || false,
      phase: serverSnapshot.phase || "countdown",
      startedAt: serverSnapshot.startedAt || 0,
      elapsedBeforePause: serverSnapshot.elapsedBeforePause || 0,
      stopwatchTime: serverSnapshot.stopwatchTime || 0,
      goalReached: serverSnapshot.goalReached || false,
    };
  };

  const initial = useRef(computeInitial());

  const [isRunning, setIsRunning] = useState(initial.current.isRunning);
  const [phase, setPhase] = useState(initial.current.phase);
  const [startedAt, setStartedAt] = useState(initial.current.startedAt);
  const [elapsedBeforePause, setElapsedBeforePause] = useState(initial.current.elapsedBeforePause);
  const [stopwatchTime, setStopwatchTime] = useState(initial.current.stopwatchTime);
  const [goalReached, setGoalReached] = useState(initial.current.goalReached);
  const [justCompleted, setJustCompleted] = useState(false);

  // Display values computed from timestamps
  const [displayRemaining, setDisplayRemaining] = useState(totalSeconds);
  const [displayStopwatch, setDisplayStopwatch] = useState(0);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const goalReachedRef = useRef(goalReached);
  goalReachedRef.current = goalReached;
  const completionFiredRef = useRef(false);

  // ── Compute current elapsed seconds from timestamps ──
  const computeElapsed = useCallback(() => {
    let elapsed = elapsedBeforePause;
    if (isRunning && startedAt > 0) {
      elapsed += (Date.now() - startedAt) / 1000;
    }
    return Math.max(0, elapsed);
  }, [isRunning, startedAt, elapsedBeforePause]);

  // ── Tick: update display values using wall clock ──
  useEffect(() => {
    const updateDisplay = () => {
      const elapsed = computeElapsed();

      if (phase === "countdown") {
        const rem = Math.max(0, totalSeconds - elapsed);
        setDisplayRemaining(Math.ceil(rem));

        // Check for completion
        if (rem <= 0 && !completionFiredRef.current) {
          completionFiredRef.current = true;
          if (isOpenEnded) {
            // Transition to stopwatch
            setPhase("stopwatch");
            setGoalReached(true);
            const overflowTime = Math.max(0, elapsed - totalSeconds);
            setStopwatchTime(overflowTime);
            setDisplayStopwatch(Math.floor(overflowTime));
            if (onCompleteRef.current) onCompleteRef.current(habitId, habitName);
            logActivity({ action: "timer_goal_reached", habitName });

            // Save transition to server
            const now = Date.now();
            const state = {
              remaining: 0, isRunning: true, phase: "stopwatch",
              stopwatchTime: overflowTime, goalReached: true,
              startedAt: now, elapsedBeforePause: 0,
              totalSeconds, timerDate: getTodayKey(),
            };
            saveServerTimerState(habitId, state);
          } else {
            // Fixed duration complete
            setIsRunning(false);
            setGoalReached(true);
            setJustCompleted(true);
            setDisplayRemaining(0);
            playChime();
            sendNotification("⏰ Timer Complete!", `${habitName} timer has finished!`);
            if (onCompleteRef.current) onCompleteRef.current(habitId, habitName);
            logActivity({ action: "timer_completed", habitName });
            logTimerEvent({
              habitName, targetDuration: totalSeconds,
              actualTime: totalSeconds, status: "completed",
              isOpenEnded: false, extraTime: 0,
            });

            // Save completed state to server
            const state = {
              remaining: 0, isRunning: false, phase: "countdown",
              stopwatchTime: 0, goalReached: true,
              startedAt: 0, elapsedBeforePause: totalSeconds,
              totalSeconds, timerDate: getTodayKey(),
            };
            saveServerTimerState(habitId, state);

            setTimeout(() => setJustCompleted(false), 3000);
          }
        }
      } else {
        // Stopwatch phase
        const baseStopwatch = stopwatchTime;
        let swElapsed = baseStopwatch;
        if (isRunning && startedAt > 0) {
          swElapsed = baseStopwatch + (Date.now() - startedAt) / 1000;
        }
        setDisplayStopwatch(Math.floor(Math.max(0, swElapsed)));
        setDisplayRemaining(0);
      }
    };

    updateDisplay();

    if (!isRunning) return;

    // Use setInterval for regular updates, but compute from wall clock
    const intervalId = setInterval(updateDisplay, 500); // 500ms for smooth updates
    return () => clearInterval(intervalId);
  }, [isRunning, phase, startedAt, elapsedBeforePause, stopwatchTime, totalSeconds, isOpenEnded, habitName, habitId, computeElapsed]);

  // ── Sync from server when serverStates changes (polling update) ──
  const lastSyncRef = useRef(null);
  useEffect(() => {
    if (!serverSnapshot) return;

    // If server state belongs to a previous day, reset to fresh state
    const today = getTodayKey();
    if (serverSnapshot.timerDate && serverSnapshot.timerDate !== today) {
      // Timer is from yesterday — reset locally, server cleanup handled by useMidnightCheck
      setIsRunning(false);
      setPhase("countdown");
      setStartedAt(0);
      setElapsedBeforePause(0);
      setStopwatchTime(0);
      setGoalReached(false);
      setDisplayRemaining(totalSeconds);
      setDisplayStopwatch(0);
      completionFiredRef.current = false;
      lastSyncRef.current = null;
      return;
    }

    // Avoid re-applying the same snapshot
    const snapshotKey = JSON.stringify(serverSnapshot);
    if (lastSyncRef.current === snapshotKey) return;
    lastSyncRef.current = snapshotKey;

    // Only sync if the server state is different from local
    const serverRunning = serverSnapshot.isRunning || false;
    const serverPhase = serverSnapshot.phase || "countdown";
    const serverStartedAt = serverSnapshot.startedAt || 0;
    const serverElapsed = serverSnapshot.elapsedBeforePause || 0;
    const serverGoalReached = serverSnapshot.goalReached || false;
    const serverStopwatch = serverSnapshot.stopwatchTime || 0;

    // Update local state from server
    setIsRunning(serverRunning);
    setPhase(serverPhase);
    setStartedAt(serverStartedAt);
    setElapsedBeforePause(serverElapsed);
    setGoalReached(serverGoalReached);
    setStopwatchTime(serverStopwatch);
    completionFiredRef.current = serverGoalReached;
  }, [serverSnapshot, totalSeconds]);

  // ── Actions ──
  const start = useCallback(() => {
    const now = Date.now();
    let newPhase = phase;
    let newElapsed = elapsedBeforePause;
    let newGoal = goalReached;

    if (displayRemaining === 0 && phase === "countdown" && !isOpenEnded) {
      // Restart after completion
      newElapsed = 0;
      newGoal = false;
      completionFiredRef.current = false;
    }

    setStartedAt(now);
    setElapsedBeforePause(newElapsed);
    setGoalReached(newGoal);
    setIsRunning(true);
    logActivity({ action: "timer_started", habitName });

    // Save to server
    saveServerTimerState(habitId, {
      remaining: Math.max(0, totalSeconds - newElapsed),
      isRunning: true, phase: newPhase,
      stopwatchTime: stopwatchTime, goalReached: newGoal,
      startedAt: now, elapsedBeforePause: newElapsed,
      totalSeconds, timerDate: getTodayKey(),
    });
  }, [phase, elapsedBeforePause, goalReached, displayRemaining, isOpenEnded, stopwatchTime, totalSeconds, habitName, habitId]);

  const pause = useCallback(() => {
    // Accumulate elapsed time from the current running segment
    const elapsed = computeElapsed();
    const now = Date.now();

    if (phase === "stopwatch") {
      const swElapsed = stopwatchTime + (isRunning && startedAt > 0 ? (now - startedAt) / 1000 : 0);
      setStopwatchTime(Math.max(0, swElapsed));
    }

    setElapsedBeforePause(elapsed);
    setStartedAt(0);
    setIsRunning(false);
    logActivity({ action: "timer_paused", habitName });

    // Save to server
    const remaining = phase === "countdown" ? Math.max(0, totalSeconds - elapsed) : 0;
    const swTime = phase === "stopwatch"
      ? stopwatchTime + (isRunning && startedAt > 0 ? (now - startedAt) / 1000 : 0)
      : 0;

    saveServerTimerState(habitId, {
      remaining, isRunning: false, phase,
      stopwatchTime: Math.max(0, swTime), goalReached,
      startedAt: 0, elapsedBeforePause: elapsed,
      totalSeconds, timerDate: getTodayKey(),
    });
  }, [computeElapsed, phase, stopwatchTime, isRunning, startedAt, totalSeconds, goalReached, habitName, habitId]);

  const reset = useCallback(() => {
    // Log history for any time that was actually spent before resetting
    const elapsed = computeElapsed();
    if (elapsed > 0) {
      const actualTime = phase === "countdown"
        ? Math.min(elapsed, totalSeconds)
        : totalSeconds + (stopwatchTime + (startedAt > 0 ? (Date.now() - startedAt) / 1000 : 0));

      let status = "incomplete";
      const swTime = phase === "stopwatch"
        ? stopwatchTime + (startedAt > 0 ? (Date.now() - startedAt) / 1000 : 0)
        : 0;
      if (goalReached && swTime > 0) status = "exceeded";
      else if (goalReached) status = "completed";

      logTimerEvent({
        habitName, targetDuration: totalSeconds, actualTime: Math.round(actualTime),
        status, isOpenEnded, extraTime: Math.round(Math.max(0, swTime)),
      });
    }

    setIsRunning(false);
    setPhase("countdown");
    setStartedAt(0);
    setElapsedBeforePause(0);
    setStopwatchTime(0);
    setGoalReached(false);
    setJustCompleted(false);
    setDisplayRemaining(totalSeconds);
    setDisplayStopwatch(0);
    completionFiredRef.current = false;
    logActivity({ action: "timer_reset", habitName });

    // Delete from server
    deleteServerTimerState(habitId);
  }, [computeElapsed, phase, totalSeconds, stopwatchTime, startedAt, goalReached, isOpenEnded, habitName, habitId]);

  const stop = useCallback(() => {
    const elapsed = computeElapsed();
    setIsRunning(false);

    const actualTime = phase === "countdown"
      ? Math.min(elapsed, totalSeconds)
      : totalSeconds + (stopwatchTime + (startedAt > 0 ? (Date.now() - startedAt) / 1000 : 0));

    let status = "partial";
    const swTime = phase === "stopwatch"
      ? stopwatchTime + (startedAt > 0 ? (Date.now() - startedAt) / 1000 : 0)
      : 0;
    if (goalReached && swTime > 0) status = "exceeded";
    else if (goalReached) status = "completed";

    logTimerEvent({
      habitName, targetDuration: totalSeconds, actualTime: Math.round(actualTime),
      status, isOpenEnded, extraTime: Math.round(Math.max(0, swTime)),
    });
    logActivity({ action: "timer_stopped", habitName });

    setPhase("countdown");
    setStartedAt(0);
    setElapsedBeforePause(0);
    setStopwatchTime(0);
    setGoalReached(false);
    setJustCompleted(false);
    setDisplayRemaining(totalSeconds);
    setDisplayStopwatch(0);
    completionFiredRef.current = false;

    // Delete from server
    deleteServerTimerState(habitId);
  }, [computeElapsed, phase, totalSeconds, stopwatchTime, startedAt, goalReached, isOpenEnded, habitName, habitId]);

  const progress = totalSeconds > 0
    ? Math.min(100, ((totalSeconds - displayRemaining) / totalSeconds) * 100) : 0;

  return {
    remaining: displayRemaining,
    isRunning,
    phase,
    stopwatchTime: displayStopwatch,
    goalReached,
    justCompleted,
    progress,
    start,
    pause,
    reset,
    stop,
  };
}

// ═══════════════════════════════════════════════════════════════════
// ─── Midnight Auto-Cross Hook (Server-backed) ──────────────────
// ═══════════════════════════════════════════════════════════════════
function useMidnightCheck(habits, setDayStatus, isDayCompleted, serverStates) {
  // Track which habitId+timerDate combos we've already processed to avoid duplicate logging
  const processedRef = useRef(new Set());
  // Track the current day so we can detect midnight transitions
  const currentDayRef = useRef(getTodayKey());

  useEffect(() => {
    if (!habits || !setDayStatus || !serverStates) return;

    const runCheck = () => {
      const today = getTodayKey();

      // If the day has changed since last check, reset processed set
      // so we can re-evaluate any stale timers
      if (currentDayRef.current !== today) {
        processedRef.current = new Set();
        currentDayRef.current = today;
      }

      const staleHabitIds = [];

      habits.forEach((h) => {
        const info = parseTimeDuration(h.name);
        if (!info.detected) return;

        const serverState = serverStates[h.id];
        if (!serverState) return;

        const timerDate = serverState.timerDate || "";

        // If the timer belongs to a previous day (not today)
        if (timerDate && timerDate !== today) {
          const processKey = `${h.id}_${timerDate}`;
          if (processedRef.current.has(processKey)) return; // already handled
          processedRef.current.add(processKey);

          const wasCompleted = serverState.goalReached === true;

          // Calculate actual time spent — include running segment if timer was active
          let actualElapsed = serverState.elapsedBeforePause || 0;
          if (serverState.isRunning && serverState.startedAt > 0) {
            // Timer was still running when day changed;
            // calculate how much time passed since startedAt until end of timerDate day (23:59:59)
            const parts = timerDate.split("-");
            if (parts.length === 3) {
              const endOfDay = new Date(
                parseInt(parts[0], 10),
                parseInt(parts[1], 10) - 1,
                parseInt(parts[2], 10),
                23, 59, 59, 999
              ).getTime();
              // Cap the running segment to end-of-day so we don't over-count
              const runEnd = Math.min(endOfDay, Date.now());
              const runningSegment = Math.max(0, (runEnd - serverState.startedAt) / 1000);
              actualElapsed += runningSegment;
            }
          }

          const serverTotalSec = serverState.totalSeconds || info.totalSeconds || 0;

          if (!wasCompleted) {
            // Timer was started/running on a previous day but NOT completed → mark as crossed
            const parts = timerDate.split("-");
            if (parts.length === 3) {
              const timerDay = parseInt(parts[2], 10);
              if (timerDay > 0) {
                // Only cross if not already completed for that day
                if (!isDayCompleted || !isDayCompleted(h.id, timerDay)) {
                  setDayStatus(h.id, timerDay, "crossed");
                  logActivity({
                    action: "timer_auto_crossed",
                    habitName: h.name,
                    detail: `Auto-crossed for ${timerDate} (timer incomplete)`,
                  });

                  // Log timer history so the actual time spent is recorded
                  if (actualElapsed > 0) {
                    logTimerEvent({
                      habitName: h.name,
                      targetDuration: serverTotalSec,
                      actualTime: Math.round(Math.min(actualElapsed, serverTotalSec)),
                      status: "crossed",
                      isOpenEnded: info.isOpenEnded || false,
                      extraTime: 0,
                    });
                  }
                }
              }
            }
          } else {
            // Timer was completed — still record final history if not already done
            // (e.g., open-ended timers that were still running in stopwatch mode)
            if (actualElapsed > 0 && serverState.phase === "stopwatch") {
              const swTime = serverState.stopwatchTime || 0;
              let swActual = swTime;
              if (serverState.isRunning && serverState.startedAt > 0) {
                swActual += Math.max(0, (Date.now() - serverState.startedAt) / 1000);
              }
              logTimerEvent({
                habitName: h.name,
                targetDuration: serverTotalSec,
                actualTime: Math.round(serverTotalSec + swActual),
                status: "exceeded",
                isOpenEnded: true,
                extraTime: Math.round(swActual),
              });
            }
          }

          // Reset the timer state for the new day regardless
          staleHabitIds.push(h.id);
        }
      });

      // Bulk delete stale timer states from server
      if (staleHabitIds.length > 0) {
        deleteServerTimerStates(staleHabitIds);
      }
    };

    // Run check immediately
    runCheck();

    // Schedule next check at midnight, then re-check every minute after that
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();

    const midnightTimer = setTimeout(() => {
      runCheck();
    }, msUntilMidnight);

    // Also poll every 60 seconds to catch edge cases (tab was in background, etc.)
    const pollInterval = setInterval(runCheck, 60000);

    return () => {
      clearTimeout(midnightTimer);
      clearInterval(pollInterval);
    };
  }, [habits, setDayStatus, isDayCompleted, serverStates]);
}


// ═══════════════════════════════════════════
// ─── Main Panel Component (Horizontal Bar) ───
// ═══════════════════════════════════════════
export default function ActiveTimerPanel({ habits, placement = "full", setDayStatus, isDayCompleted }) {
  const [customTimers, setCustomTimers] = useState([]);
  const [showAddTimer, setShowAddTimer] = useState(false);
  const [serverStates, setServerStates] = useState(null);
  const [serverLoaded, setServerLoaded] = useState(false);

  // Load custom timers on mount
  useEffect(() => {
    setCustomTimers(loadCustomTimers());
  }, []);

  // ── Fetch server timer states on mount ──
  useEffect(() => {
    fetchServerTimerStates().then((states) => {
      setServerStates(states);
      setServerLoaded(true);
    });
  }, []);

  // ── Poll server every 30s for cross-device sync ──
  useEffect(() => {
    if (!serverLoaded) return;

    const intervalId = setInterval(() => {
      fetchServerTimerStates().then((states) => {
        setServerStates(states);
      });
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [serverLoaded]);

  // ── Re-fetch on tab visibility change (user switches back to this tab) ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchServerTimerStates().then((states) => {
          setServerStates(states);
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const timedHabits = useMemo(() => {
    const habitTimers = habits
      .map((h) => {
        const info = parseTimeDuration(h.name);
        if (!info.detected) return null;
        return { ...h, timerInfo: info, isCustom: false };
      })
      .filter(Boolean);

    // Merge custom timers
    const custom = customTimers.map((ct) => ({
      id: ct.id,
      name: ct.name,
      timerInfo: {
        detected: true,
        totalSeconds: ct.totalSeconds,
        label: formatDurationLabel(ct.totalSeconds),
        isOpenEnded: ct.isOpenEnded || false,
      },
      isCustom: true,
    }));

    return [...habitTimers, ...custom];
  }, [habits, customTimers]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalHabitId, setModalHabitId] = useState(null);

  // Midnight auto-cross (uses server states)
  useMidnightCheck(habits, setDayStatus, isDayCompleted, serverStates);

  // Restore modal state on mount
  useEffect(() => {
    if (!serverLoaded || !serverStates) return;
    const saved = loadModalState();
    if (saved && saved.isOpen && saved.habitId) {
      const timerState = serverStates[saved.habitId];
      if (timerState && (timerState.isRunning || timerState.elapsedBeforePause > 0)) {
        setModalOpen(true);
        setModalHabitId(saved.habitId);
        const idx = timedHabits.findIndex(h => h.id === saved.habitId);
        if (idx >= 0) setActiveIndex(idx);
      } else {
        clearModalState();
      }
    }
  }, [serverLoaded, serverStates, timedHabits]);

  useEffect(() => {
    if (activeIndex >= timedHabits.length) {
      setActiveIndex(Math.max(0, timedHabits.length - 1));
    }
  }, [timedHabits.length, activeIndex]);

  // Auto-complete callback
  const handleTimerComplete = useCallback((habitId, habitName) => {
    if (!setDayStatus || !habitId) return;
    const today = new Date().getDate();
    if (isDayCompleted && isDayCompleted(habitId, today)) return;
    setDayStatus(habitId, today, "completed");
  }, [setDayStatus, isDayCompleted]);

  // Minimize modal (does NOT stop timer)
  const handleMinimize = useCallback(() => {
    setModalOpen(false);
    clearModalState();
  }, []);

  // Persist modal state changes
  useEffect(() => {
    if (modalOpen && modalHabitId) {
      saveModalState({ isOpen: true, habitId: modalHabitId });
    }
  }, [modalOpen, modalHabitId]);

  // Add custom timer
  const handleAddCustomTimer = useCallback((name, hours, minutes, seconds, isOpenEnded) => {
    const totalSecs = (hours * 3600) + (minutes * 60) + seconds;
    if (totalSecs <= 0) return;
    const newTimer = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      totalSeconds: totalSecs,
      isOpenEnded,
    };
    const updated = [...customTimers, newTimer];
    setCustomTimers(updated);
    saveCustomTimers(updated);
    setShowAddTimer(false);
  }, [customTimers]);

  // Remove custom timer
  const handleRemoveCustomTimer = useCallback((timerId) => {
    const updated = customTimers.filter(t => t.id !== timerId);
    setCustomTimers(updated);
    saveCustomTimers(updated);
    deleteServerTimerState(timerId);
  }, [customTimers]);

  if (!serverLoaded) {
    return (
      <div className={`active-timer-bar timer-placement-${placement}`} style={{ justifyContent: "center", minHeight: "60px" }}>
        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading timers…</span>
      </div>
    );
  }

  if (timedHabits.length === 0 && !showAddTimer) {
    // Show only a plus button when there are no timers
    return (
      <div className={`active-timer-bar timer-placement-${placement}`} style={{ justifyContent: "center", minHeight: "60px" }}>
        <button className="atb-btn atb-btn-add-timer" onClick={() => setShowAddTimer(true)} title="Add Custom Timer">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 1v12M1 7h12" strokeLinecap="round" />
          </svg>
          <span>Add Timer</span>
        </button>
        {showAddTimer && typeof document !== "undefined" && createPortal(
          <AddTimerModal onAdd={handleAddCustomTimer} onClose={() => setShowAddTimer(false)} />,
          document.body
        )}
      </div>
    );
  }

  const activeHabit = timedHabits[activeIndex];

  return (
    <>
      {/* Horizontal Timer Bar */}
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
                {h.isCustom && (
                  <span
                    className="atb-tab-remove"
                    onClick={(e) => { e.stopPropagation(); handleRemoveCustomTimer(h.id); }}
                    title="Remove custom timer"
                  >×</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Center + Right: Timer Display */}
        {activeHabit && (
          <TimerWithSharedState
            key={activeHabit.id}
            habit={activeHabit}
            totalSeconds={activeHabit.timerInfo.totalSeconds}
            label={activeHabit.timerInfo.label}
            isOpenEnded={activeHabit.timerInfo.isOpenEnded}
            singleHabit={timedHabits.length === 1}
            onComplete={handleTimerComplete}
            modalOpen={modalOpen}
            onModalOpen={() => { setModalHabitId(activeHabit.id); setModalOpen(true); }}
            onMinimize={handleMinimize}
            isCustom={activeHabit.isCustom}
            onRemoveCustom={() => handleRemoveCustomTimer(activeHabit.id)}
            serverStates={serverStates}
          />
        )}

        {/* Plus button to add custom timer */}
        <button
          className="atb-btn atb-btn-add-timer"
          onClick={() => setShowAddTimer(true)}
          title="Add Custom Timer"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 1v12M1 7h12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Add Timer Modal */}
      {showAddTimer && typeof document !== "undefined" && createPortal(
        <AddTimerModal onAdd={handleAddCustomTimer} onClose={() => setShowAddTimer(false)} />,
        document.body
      )}
    </>
  );
}

// ═══════════════════════════════════════════
// ─── Timer With Shared State ───
// Both bar and modal use the SAME timer instance
// ═══════════════════════════════════════════
function TimerWithSharedState({
  habit, totalSeconds, label, isOpenEnded, singleHabit,
  onComplete, modalOpen, onModalOpen, onMinimize, isCustom, onRemoveCustom,
  serverStates
}) {
  const timer = useTimerState(totalSeconds, isOpenEnded, habit.name, habit.id, onComplete, serverStates);
  const useHours = totalSeconds >= 3600;

  // When Start is clicked: start timer AND open modal
  const handleStart = useCallback(() => {
    timer.start();
    onModalOpen();
    saveModalState({ isOpen: true, habitId: habit.id });
  }, [timer, onModalOpen, habit.id]);

  return (
    <>
      <HorizontalTimerDisplay
        habit={habit}
        totalSeconds={totalSeconds}
        label={label}
        isOpenEnded={isOpenEnded}
        singleHabit={singleHabit}
        timer={timer}
        useHours={useHours}
        onStart={handleStart}
        onModalOpen={onModalOpen}
        isCustom={isCustom}
        onRemoveCustom={onRemoveCustom}
      />
      {modalOpen && typeof document !== "undefined" && createPortal(
        <TimerModal
          habit={habit}
          totalSeconds={totalSeconds}
          label={label}
          isOpenEnded={isOpenEnded}
          timer={timer}
          useHours={useHours}
          onMinimize={onMinimize}
        />,
        document.body
      )}
    </>
  );
}

// ═══════════════════════════════════════════
// ─── Horizontal Timer Display (bar row) ───
// ═══════════════════════════════════════════
function HorizontalTimerDisplay({
  habit, totalSeconds, label, isOpenEnded, singleHabit,
  timer, useHours, onStart, onModalOpen, isCustom, onRemoveCustom
}) {
  const RING_R = 24;
  const RING_CIRC = 2 * Math.PI * RING_R;
  const ringOffset = RING_CIRC - (timer.progress / 100) * RING_CIRC;

  let stateClass = "";
  if (timer.goalReached && timer.phase === "stopwatch") stateClass = "state-stopwatch";
  else if (timer.goalReached) stateClass = "state-completed";
  else if (timer.isRunning) stateClass = "state-running";
  else if (timer.remaining < totalSeconds) stateClass = "state-paused";

  let phaseBadge = "";
  if (timer.phase === "stopwatch") phaseBadge = "EXTRA TIME";
  else if (timer.goalReached && !isOpenEnded) phaseBadge = "COMPLETED";
  else if (timer.isRunning) phaseBadge = "COUNTDOWN";
  else if (timer.remaining < totalSeconds) phaseBadge = "PAUSED";

  let timeSub = timer.phase === "stopwatch" ? "EXTRA TIME" : "REMAINING";

  // Auto-dismiss modal after fixed-duration completion
  useEffect(() => {
    if (timer.justCompleted && !isOpenEnded) {
      const t = setTimeout(() => {
        clearModalState();
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [timer.justCompleted, isOpenEnded]);

  return (
    <div className={`atb-timer-row ${stateClass}`}>
      {singleHabit && (
        <div className="atb-habit-label">
          <span className="atb-habit-name-text">{habit.name}</span>
          {isOpenEnded && <span className="atb-open-tag">OPEN</span>}
          {isCustom && (
            <button
              className="atb-custom-remove-btn"
              onClick={onRemoveCustom}
              title="Remove custom timer"
            >×</button>
          )}
        </div>
      )}

      {/* Clickable ring area to reopen modal when running */}
      <div
        className="atb-ring-time"
        onClick={timer.isRunning || timer.remaining < totalSeconds ? onModalOpen : undefined}
        style={{ cursor: timer.isRunning || timer.remaining < totalSeconds ? "pointer" : "default" }}
        title={timer.isRunning ? "Click to expand timer" : ""}
      >
        <div className="atb-ring-compact">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle className="atb-ring-bg" cx="28" cy="28" r={RING_R} strokeWidth="4" fill="none" />
            <circle className="atb-ring-progress" cx="28" cy="28" r={RING_R} strokeWidth="4" fill="none"
              strokeDasharray={RING_CIRC} strokeDashoffset={ringOffset} strokeLinecap="round" />
            {timer.phase === "stopwatch" && (
              <circle className="atb-ring-extra" cx="28" cy="28" r={RING_R - 7}
                strokeWidth="2" fill="none" strokeDasharray="4 3" strokeLinecap="round" />
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

      {phaseBadge && <span className={`atb-phase-badge ${stateClass}`}>{phaseBadge}</span>}

      {timer.phase === "stopwatch" && (
        <span className="atb-extra-info">🎯 +{formatTime(timer.stopwatchTime, useHours)}</span>
      )}

      <div className="atb-controls">
        {!timer.isRunning ? (
          <button className="atb-btn atb-btn-start" onClick={onStart} title="Start">
            <svg width="12" height="14" viewBox="0 0 14 16" fill="currentColor"><path d="M0 0L14 8L0 16Z" /></svg>
            <span>Start</span>
          </button>
        ) : (
          <button className="atb-btn atb-btn-pause" onClick={timer.pause} title="Pause">
            <svg width="10" height="12" viewBox="0 0 12 14" fill="currentColor">
              <rect x="0" y="0" width="4" height="14" /><rect x="8" y="0" width="4" height="14" />
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
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════
// ─── Timer Modal (full-screen overlay) ───
// Now receives timer state from parent instead of creating its own
// ═══════════════════════════════════════════
function TimerModal({ habit, totalSeconds, label, isOpenEnded, timer, useHours, onMinimize }) {
  const RING_R = 78;
  const RING_CIRC = 2 * Math.PI * RING_R;
  const ringOffset = Math.max(0, RING_CIRC - (timer.progress / 100) * RING_CIRC);

  let stateClass = "";
  if (timer.goalReached && timer.phase === "stopwatch") stateClass = "state-stopwatch";
  else if (timer.goalReached) stateClass = "state-completed";
  else if (timer.isRunning) stateClass = "state-running";
  else if (timer.remaining < totalSeconds) stateClass = "state-paused";

  let phaseBadge = "";
  if (timer.phase === "stopwatch") phaseBadge = "EXTRA TIME";
  else if (timer.goalReached && !isOpenEnded) phaseBadge = "COMPLETED";
  else if (timer.isRunning) phaseBadge = "COUNTDOWN";
  else if (timer.remaining < totalSeconds) phaseBadge = "PAUSED";

  // Escape key to minimize
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onMinimize(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onMinimize]);

  // Handle Pause -> Close behavior (Timer stays paused)
  const handleMinimize = (e) => {
    e.stopPropagation();
    onMinimize();
  };

  // Auto-dismiss and Chime for fixed-duration completion
  useEffect(() => {
    if (timer.justCompleted && !isOpenEnded) {
      playChime();
      const t = setTimeout(onMinimize, 3000);
      return () => clearTimeout(t);
    }
  }, [timer.justCompleted, isOpenEnded, onMinimize]);

  return (
    <div className="timer-modal-overlay" onClick={handleMinimize}>
      <div className={`timer-modal-card ${stateClass}`} onClick={(e) => e.stopPropagation()}>
        
        {/* Top Row Layout */}
        <div className="timer-modal-header">
          <div>
            {phaseBadge && (
              <span className={`timer-modal-phase ${stateClass}`}>{phaseBadge}</span>
            )}
          </div>
          <button className="timer-modal-close" onClick={handleMinimize} title="Minimize (timer keeps running)">✕</button>
        </div>

        {/* Center Top: Habit Name */}
        <div className="timer-modal-habit-name" title={habit.name}>
          {habit.name}
        </div>

        {/* Completed Message popup for fixed duration */}
        {timer.justCompleted && !isOpenEnded && (
          <div className="timer-modal-complete-msg">Great job! Habit marked as done. ✓</div>
        )}

        {/* Ring Area */}
        <div className="timer-modal-ring-area">
          <div className="timer-modal-ring-wrap">
            <svg width="180" height="180" viewBox="0 0 180 180">
              <circle className="atb-ring-bg" cx="90" cy="90" r={RING_R} strokeWidth="6" fill="none" />
              <circle className="atb-ring-progress" cx="90" cy="90" r={RING_R} strokeWidth="6" fill="none"
                strokeDasharray={RING_CIRC} strokeDashoffset={ringOffset} strokeLinecap="round" />
            </svg>
            <div className="timer-modal-ring-text">
              <span className="timer-modal-time">
                {timer.phase === "stopwatch"
                  ? formatTime(timer.stopwatchTime, useHours)
                  : formatTime(timer.remaining, useHours)}
              </span>
              <span className="timer-modal-time-sub">
                {timer.phase === "stopwatch" ? "EXTRA TIME" : "REMAINING"}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="timer-modal-controls">
          {!timer.isRunning ? (
            <button className="atb-btn atb-btn-start timer-modal-btn" onClick={timer.start}>
              <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor"><path d="M0 0L14 8L0 16Z" /></svg>
              <span>{timer.goalReached && !isOpenEnded ? "Restart" : "Resume"}</span>
            </button>
          ) : (
            <button className="atb-btn atb-btn-pause timer-modal-btn" onClick={timer.pause}>
              <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
                <rect x="0" y="0" width="4" height="14" /><rect x="8" y="0" width="4" height="14" />
              </svg>
              <span>Pause</span>
            </button>
          )}
          <button className="atb-btn atb-btn-reset timer-modal-btn" onClick={timer.reset}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 1v5h5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1 6A6 6 0 1 1 3 11" strokeLinecap="round" />
            </svg>
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════
// ─── Add Custom Timer Modal ───
// ═══════════════════════════════════════════
function AddTimerModal({ onAdd, onClose }) {
  const [name, setName] = useState("");
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isOpenEnded, setIsOpenEnded] = useState(false);

  const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || totalSeconds <= 0) return;
    onAdd(name.trim(), hours, minutes, seconds, isOpenEnded);
  };

  return (
    <div className="timer-modal-overlay" onClick={onClose}>
      <div className="add-timer-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="timer-modal-close" onClick={onClose}>✕</button>

        <div className="add-timer-modal-icon">⏱</div>
        <h3 className="add-timer-modal-title">Add Custom Timer</h3>

        <form onSubmit={handleSubmit} className="add-timer-form">
          <div className="add-timer-field">
            <label htmlFor="custom-timer-name">Timer Name</label>
            <input
              id="custom-timer-name"
              type="text"
              placeholder="e.g. Focus Session"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="add-timer-input"
            />
          </div>

          <div className="add-timer-field">
            <label>Duration</label>
            <div className="add-timer-duration-row">
              <div className="add-timer-duration-unit">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="add-timer-input add-timer-num"
                />
                <span className="add-timer-unit-label">hrs</span>
              </div>
              <span className="add-timer-separator">:</span>
              <div className="add-timer-duration-unit">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="add-timer-input add-timer-num"
                />
                <span className="add-timer-unit-label">min</span>
              </div>
              <span className="add-timer-separator">:</span>
              <div className="add-timer-duration-unit">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="add-timer-input add-timer-num"
                />
                <span className="add-timer-unit-label">sec</span>
              </div>
            </div>
          </div>

          {totalSeconds > 0 && (
            <div className="add-timer-preview">
              Total: {formatTime(totalSeconds, totalSeconds >= 3600)}
            </div>
          )}

          <div className="add-timer-field add-timer-toggle-row">
            <label htmlFor="custom-timer-open" className="add-timer-toggle-label">
              <span>Open-ended</span>
              <span className="add-timer-toggle-hint">(continue counting after goal)</span>
            </label>
            <button
              type="button"
              id="custom-timer-open"
              className={`add-timer-toggle ${isOpenEnded ? "active" : ""}`}
              onClick={() => setIsOpenEnded(prev => !prev)}
            >
              <span className="add-timer-toggle-thumb" />
            </button>
          </div>

          <div className="add-timer-actions">
            <button type="button" className="atb-btn atb-btn-reset" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="atb-btn atb-btn-start"
              disabled={!name.trim() || totalSeconds <= 0}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 1v12M1 7h12" strokeLinecap="round" />
              </svg>
              <span>Add Timer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// Helper: format duration label (local copy to avoid circular dependency)
function formatDurationLabel(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}
