"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { parseTimeDuration } from "../lib/timeParser";
import { logTimerEvent, logActivity } from "../lib/activityLogger";

// ─── Constants ───
const TIMER_STATE_KEY = "sk_timerStates";
const MODAL_STATE_KEY = "sk_timerModal";
const MIDNIGHT_CHECK_KEY = "sk_lastMidnightCheck";
const COMPLETION_LOG_KEY = "sk_timerCompletions";
const CUSTOM_TIMERS_KEY = "sk_customTimers";
const API_SYNC_INTERVAL = 5000; // Sync to API every 5 seconds while running

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

// ═══════════════════════════════════════════
// ─── Persistence helpers (localStorage as fast cache) ───
// ═══════════════════════════════════════════
function loadTimerStatesLocal() {
  try { return JSON.parse(localStorage.getItem(TIMER_STATE_KEY)) || {}; }
  catch { return {}; }
}
function saveTimerStateLocal(habitId, state) {
  try {
    const all = loadTimerStatesLocal();
    all[habitId] = { ...state, savedAt: Date.now() };
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(all));
  } catch { /* storage full */ }
}
function clearTimerStateLocal(habitId) {
  try {
    const all = loadTimerStatesLocal();
    delete all[habitId];
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}
function getSavedTimerStateLocal(habitId) {
  const all = loadTimerStatesLocal();
  return all[habitId] || null;
}

// ─── API persistence helpers ───
async function fetchAllTimerStatesAPI() {
  try {
    const res = await fetch("/api/timer-state");
    if (res.ok) return await res.json();
  } catch (err) {
    console.error("Failed to fetch timer states from API:", err);
  }
  return null;
}

async function saveTimerStateAPI(habitId, state) {
  try {
    await fetch("/api/timer-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        habitId,
        remaining: state.remaining,
        isRunning: state.isRunning,
        phase: state.phase,
        stopwatchTime: state.stopwatchTime,
        goalReached: state.goalReached,
      }),
    });
  } catch (err) {
    console.error("Failed to save timer state to API:", err);
  }
}

async function clearTimerStateAPI(habitId) {
  try {
    await fetch("/api/timer-state", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitId }),
    });
  } catch (err) {
    console.error("Failed to clear timer state from API:", err);
  }
}

// ─── Custom timers API helpers ───
async function fetchCustomTimersAPI() {
  try {
    const res = await fetch("/api/custom-timers");
    if (res.ok) return await res.json();
  } catch (err) {
    console.error("Failed to fetch custom timers from API:", err);
  }
  return null;
}

async function saveCustomTimerAPI(timer) {
  try {
    await fetch("/api/custom-timers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(timer),
    });
  } catch (err) {
    console.error("Failed to save custom timer to API:", err);
  }
}

async function deleteCustomTimerAPI(id) {
  try {
    await fetch("/api/custom-timers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  } catch (err) {
    console.error("Failed to delete custom timer from API:", err);
  }
}

// ─── Modal state persistence (local only — UI preference, not cross-device) ───
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

// ─── Local custom timers cache ───
function loadCustomTimersLocal() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_TIMERS_KEY)) || []; }
  catch { return []; }
}
function saveCustomTimersLocal(timers) {
  try { localStorage.setItem(CUSTOM_TIMERS_KEY, JSON.stringify(timers)); }
  catch { /* ignore */ }
}

// ─── Timer completion log for today ───
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function loadCompletionLog() {
  try { return JSON.parse(localStorage.getItem(COMPLETION_LOG_KEY)) || {}; }
  catch { return {}; }
}
function markTimerCompleted(habitId) {
  try {
    const log = loadCompletionLog();
    const today = getTodayKey();
    if (!log[today]) log[today] = {};
    log[today][habitId] = true;
    localStorage.setItem(COMPLETION_LOG_KEY, JSON.stringify(log));
  } catch { /* ignore */ }
}
function wasTimerCompletedToday(habitId) {
  try {
    const log = loadCompletionLog();
    return !!log[getTodayKey()]?.[habitId];
  } catch { return false; }
}
function wasTimerStartedToday(habitId) {
  const saved = getSavedTimerStateLocal(habitId);
  if (!saved) return false;
  if (saved.savedAt) {
    const savedDate = new Date(saved.savedAt);
    const today = new Date();
    return savedDate.toDateString() === today.toDateString();
  }
  return false;
}

// ═══════════════════════════════════════════
// ─── Individual Timer Logic with cross-device sync ───
// ═══════════════════════════════════════════
function useTimerState(totalSeconds, isOpenEnded, habitName, habitId, onComplete, apiTimerStates) {
  // Use API state first (cross-device), fall back to localStorage
  const resolvedInitial = useMemo(() => {
    const apiState = apiTimerStates?.[habitId] || null;
    const localState = getSavedTimerStateLocal(habitId);
    // Prefer API state if available (it's the cross-device truth)
    const saved = apiState || localState;
    if (!saved) return null;

    if (saved.isRunning && saved.savedAt) {
      const elapsedSinceSave = Math.floor((Date.now() - saved.savedAt) / 1000);
      if (saved.phase === "countdown") {
        const newRemaining = Math.max(0, saved.remaining - elapsedSinceSave);
        if (newRemaining === 0 && isOpenEnded) {
          const overflowTime = elapsedSinceSave - saved.remaining;
          return {
            remaining: 0, phase: "stopwatch",
            stopwatchTime: (saved.stopwatchTime || 0) + overflowTime,
            goalReached: true, isRunning: true,
          };
        } else if (newRemaining === 0 && !isOpenEnded) {
          return {
            remaining: 0, phase: "countdown", stopwatchTime: 0,
            goalReached: true, isRunning: false,
          };
        }
        return { ...saved, remaining: newRemaining };
      } else {
        return {
          ...saved,
          stopwatchTime: (saved.stopwatchTime || 0) + elapsedSinceSave,
        };
      }
    }
    return saved;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSeconds, isOpenEnded, apiTimerStates]);

  const [remaining, setRemaining] = useState(resolvedInitial?.remaining ?? totalSeconds);
  const [isRunning, setIsRunning] = useState(resolvedInitial?.isRunning ?? false);
  const [phase, setPhase] = useState(resolvedInitial?.phase ?? "countdown");
  const [stopwatchTime, setStopwatchTime] = useState(resolvedInitial?.stopwatchTime ?? 0);
  const [goalReached, setGoalReached] = useState(resolvedInitial?.goalReached ?? false);
  const [justCompleted, setJustCompleted] = useState(false);
  const intervalRef = useRef(null);
  const apiSyncRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Re-sync from API when apiTimerStates changes (e.g., on initial load)
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!apiTimerStates || hasInitialized.current) return;
    hasInitialized.current = true;
    const apiState = apiTimerStates[habitId];
    if (!apiState) return;

    let state = apiState;
    if (state.isRunning && state.savedAt) {
      const elapsed = Math.floor((Date.now() - state.savedAt) / 1000);
      if (state.phase === "countdown") {
        const newRem = Math.max(0, state.remaining - elapsed);
        if (newRem === 0 && isOpenEnded) {
          state = { ...state, remaining: 0, phase: "stopwatch", stopwatchTime: (state.stopwatchTime || 0) + (elapsed - state.remaining), goalReached: true };
        } else if (newRem === 0 && !isOpenEnded) {
          state = { ...state, remaining: 0, isRunning: false, goalReached: true };
        } else {
          state = { ...state, remaining: newRem };
        }
      } else {
        state = { ...state, stopwatchTime: (state.stopwatchTime || 0) + elapsed };
      }
    }

    setRemaining(state.remaining ?? totalSeconds);
    setIsRunning(state.isRunning ?? false);
    setPhase(state.phase ?? "countdown");
    setStopwatchTime(state.stopwatchTime ?? 0);
    setGoalReached(state.goalReached ?? false);
  }, [apiTimerStates, habitId, isOpenEnded, totalSeconds]);

  // Save to localStorage whenever state changes (immediate, local cache)
  useEffect(() => {
    saveTimerStateLocal(habitId, {
      remaining, isRunning, phase, stopwatchTime, goalReached
    });
  }, [habitId, remaining, isRunning, phase, stopwatchTime, goalReached]);

  // Periodic API sync while running (every 5 seconds)
  useEffect(() => {
    if (isRunning) {
      // Sync immediately on start
      saveTimerStateAPI(habitId, { remaining, isRunning, phase, stopwatchTime, goalReached });

      apiSyncRef.current = setInterval(() => {
        // Read latest state from localStorage (always up-to-date from tick)
        const latest = getSavedTimerStateLocal(habitId);
        if (latest) {
          saveTimerStateAPI(habitId, latest);
        }
      }, API_SYNC_INTERVAL);

      return () => {
        if (apiSyncRef.current) clearInterval(apiSyncRef.current);
      };
    } else {
      // When paused/stopped, do a final sync
      if (apiSyncRef.current) clearInterval(apiSyncRef.current);
      // Only sync if we have a non-default state
      if (remaining !== totalSeconds || phase !== "countdown" || stopwatchTime > 0 || goalReached) {
        saveTimerStateAPI(habitId, { remaining, isRunning, phase, stopwatchTime, goalReached });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, habitId]);

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
              if (onCompleteRef.current) onCompleteRef.current(habitId, habitName);
              logActivity({ action: "timer_goal_reached", habitName });
              return 0;
            } else {
              clearInterval(intervalRef.current);
              setIsRunning(false);
              setGoalReached(true);
              setJustCompleted(true);
              playChime();
              sendNotification("⏰ Timer Complete!", `${habitName} timer has finished!`);
              if (onCompleteRef.current) onCompleteRef.current(habitId, habitName);
              logActivity({ action: "timer_completed", habitName });
              logTimerEvent({
                habitName, targetDuration: totalSeconds,
                actualTime: totalSeconds, status: "completed",
                isOpenEnded: false, extraTime: 0,
              });
              setTimeout(() => setJustCompleted(false), 3000);
              return 0;
            }
          }
          return prev - 1;
        });
      } else {
        setStopwatchTime((prev) => prev + 1);
      }
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, phase, isOpenEnded, habitName, totalSeconds, habitId]);

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
    // Immediate API sync on pause
    const latest = getSavedTimerStateLocal(habitId);
    if (latest) {
      saveTimerStateAPI(habitId, { ...latest, isRunning: false });
    }
    logActivity({ action: "timer_paused", habitName });
  }, [habitName, habitId]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setRemaining(totalSeconds);
    setPhase("countdown");
    setStopwatchTime(0);
    setGoalReached(false);
    setJustCompleted(false);
    clearTimerStateLocal(habitId);
    clearTimerStateAPI(habitId);
    logActivity({ action: "timer_reset", habitName });
  }, [totalSeconds, habitName, habitId]);

  const stop = useCallback(() => {
    setIsRunning(false);
    const actualTime = totalSeconds - remaining + stopwatchTime;
    let status = "partial";
    if (goalReached && stopwatchTime > 0) status = "exceeded";
    else if (goalReached) status = "completed";
    logTimerEvent({
      habitName, targetDuration: totalSeconds, actualTime,
      status, isOpenEnded, extraTime: stopwatchTime,
    });
    logActivity({ action: "timer_stopped", habitName });
    setRemaining(totalSeconds);
    setPhase("countdown");
    setStopwatchTime(0);
    setGoalReached(false);
    setJustCompleted(false);
    clearTimerStateLocal(habitId);
    clearTimerStateAPI(habitId);
  }, [totalSeconds, remaining, stopwatchTime, goalReached, isOpenEnded, habitName, habitId]);

  const progress = totalSeconds > 0
    ? Math.min(100, ((totalSeconds - remaining) / totalSeconds) * 100) : 0;

  return {
    remaining, isRunning, phase, stopwatchTime, goalReached, justCompleted,
    progress, start, pause, reset, stop,
  };
}

// ─── Midnight Auto-Cross Hook ───
function useMidnightCheck(habits, setDayStatus, isDayCompleted) {
  useEffect(() => {
    if (!habits || !setDayStatus || !isDayCompleted) return;

    const runCheck = () => {
      habits.forEach((h) => {
        const info = parseTimeDuration(h.name);
        if (!info.detected) return;
        if (wasTimerStartedToday(h.id) && !wasTimerCompletedToday(h.id)) {
          const saved = getSavedTimerStateLocal(h.id);
          if (saved && saved.isRunning) {
            clearTimerStateLocal(h.id);
            clearTimerStateAPI(h.id);
          }
        }
      });
    };

    const lastCheck = localStorage.getItem(MIDNIGHT_CHECK_KEY);
    const today = getTodayKey();
    if (lastCheck && lastCheck !== today) {
      runCheck();
    }
    localStorage.setItem(MIDNIGHT_CHECK_KEY, today);

    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();

    const timer = setTimeout(() => {
      runCheck();
      localStorage.setItem(MIDNIGHT_CHECK_KEY, getTodayKey());
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  }, [habits, setDayStatus, isDayCompleted]);
}


// ═══════════════════════════════════════════
// ─── Main Panel Component (Horizontal Bar) ───
// ═══════════════════════════════════════════
export default function ActiveTimerPanel({ habits, placement = "full", setDayStatus, isDayCompleted }) {
  const [customTimers, setCustomTimers] = useState([]);
  const [showAddTimer, setShowAddTimer] = useState(false);
  const [apiTimerStates, setApiTimerStates] = useState(null);

  // Load custom timers from API (cross-device), fall back to localStorage
  useEffect(() => {
    async function loadCustom() {
      // Show local cache immediately
      setCustomTimers(loadCustomTimersLocal());
      // Then fetch from API for cross-device sync
      const apiTimers = await fetchCustomTimersAPI();
      if (apiTimers && apiTimers.length > 0) {
        setCustomTimers(apiTimers);
        saveCustomTimersLocal(apiTimers);
      } else if (apiTimers && apiTimers.length === 0) {
        // API returned empty — check if local has timers to migrate
        const local = loadCustomTimersLocal();
        if (local.length > 0) {
          // Migrate local timers to API
          for (const t of local) {
            await saveCustomTimerAPI(t);
          }
          setCustomTimers(local);
        }
      }
    }
    loadCustom();
  }, []);

  // Fetch timer states from API on mount (cross-device sync)
  useEffect(() => {
    async function loadTimerStates() {
      const apiStates = await fetchAllTimerStatesAPI();
      if (apiStates) {
        // Merge API states into localStorage cache
        const local = loadTimerStatesLocal();
        for (const [habitId, state] of Object.entries(apiStates)) {
          const localState = local[habitId];
          // Use whichever is more recent
          if (!localState || (state.savedAt && (!localState.savedAt || state.savedAt > localState.savedAt))) {
            saveTimerStateLocal(habitId, state);
          }
        }
        setApiTimerStates(apiStates);
      } else {
        // API failed — use localStorage as fallback
        setApiTimerStates(loadTimerStatesLocal());
      }
    }
    loadTimerStates();
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

  // Midnight auto-cross
  useMidnightCheck(habits, setDayStatus, isDayCompleted);

  // Restore modal state on mount
  useEffect(() => {
    const saved = loadModalState();
    if (saved && saved.isOpen && saved.habitId) {
      const timerState = getSavedTimerStateLocal(saved.habitId);
      if (timerState && (timerState.isRunning || timerState.remaining < (saved.totalSeconds || Infinity))) {
        setModalOpen(true);
        setModalHabitId(saved.habitId);
        const idx = timedHabits.findIndex(h => h.id === saved.habitId);
        if (idx >= 0) setActiveIndex(idx);
      } else {
        clearModalState();
      }
    }
  }, [timedHabits]);

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
    markTimerCompleted(habitId);
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

  // Add custom timer — save to both local + API
  const handleAddCustomTimer = useCallback((name, hours, minutes, seconds, isOpenEnded) => {
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    if (totalSeconds <= 0) return;
    const newTimer = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      totalSeconds,
      isOpenEnded,
    };
    const updated = [...customTimers, newTimer];
    setCustomTimers(updated);
    saveCustomTimersLocal(updated);
    saveCustomTimerAPI(newTimer);
    setShowAddTimer(false);
  }, [customTimers]);

  // Remove custom timer — remove from both local + API
  const handleRemoveCustomTimer = useCallback((timerId) => {
    const updated = customTimers.filter(t => t.id !== timerId);
    setCustomTimers(updated);
    saveCustomTimersLocal(updated);
    deleteCustomTimerAPI(timerId);
    clearTimerStateLocal(timerId);
    clearTimerStateAPI(timerId);
  }, [customTimers]);

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
            apiTimerStates={apiTimerStates}
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
  onComplete, modalOpen, onModalOpen, onMinimize, isCustom, onRemoveCustom, apiTimerStates
}) {
  const timer = useTimerState(totalSeconds, isOpenEnded, habit.name, habit.id, onComplete, apiTimerStates);
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
