"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";
import { useHabits } from "./lib/habitStore";
import { parseTimeDuration } from "./lib/timeParser";
import HabitGrid from "./components/HabitGrid";
import BottomCharts from "./components/StatsBar";
import AddHabitModal from "./components/AddHabitModal";
import DailyJournal from "./components/DailyJournal";
import GoalsAndSacrifices from "./components/GoalsAndSacrifices";
import DailyFocus from "./components/DailyFocus";
import YearProgress from "./components/YearProgress";
import ActiveTimerPanel from "./components/ActiveTimerPanel";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function Home() {
  const { user } = useUser();
  const {
    habits,
    year,
    month,
    daysInMonth,
    setYear,
    setMonth,
    setDayStatus,
    isDayCompleted,
    isDayCrossed,
    getHabitMonthlyCount,
    getDayCompletionCount,
    totalCompleted,
    totalCrossed,
    totalPossible,
    completionPercent,
    bestDateObj,
    dailyVolume,
    addHabit,
    removeHabit,
    loaded,
    isFetching,
  } = useHabits();

  const [showModal, setShowModal] = useState(false);

  // ─── Dynamic timer placement ───
  // "center" = below tracker in center column (when tracker is shorter than sides)
  // "full"   = full-width below the 3-column layout (when tracker is tall)
  const centerRef = useRef(null);
  const rightRef = useRef(null);
  const leftRef = useRef(null);
  const [timerPlacement, setTimerPlacement] = useState("center");

  const evaluatePlacement = useCallback(() => {
    // Mobile / single-column → always full-width
    if (window.innerWidth <= 1200) {
      setTimerPlacement("full");
      return;
    }
    const centerEl = centerRef.current;
    const rightEl = rightRef.current;
    const leftEl = leftRef.current;
    if (!centerEl) return;

    const centerRect = centerEl.getBoundingClientRect();
    // Get the taller side column
    const rightHeight = rightEl ? rightEl.getBoundingClientRect().height : 0;
    const leftHeight = leftEl ? leftEl.getBoundingClientRect().height : 0;
    const sideMaxHeight = Math.max(rightHeight, leftHeight);

    // If the center column (habit tracker) is taller than or equal to the side columns,
    // place timer full-width below the 3-column layout
    if (centerRect.height >= sideMaxHeight) {
      setTimerPlacement("full");
    } else {
      setTimerPlacement("center");
    }
  }, []);

  useEffect(() => {
    const centerEl = centerRef.current;
    const rightEl = rightRef.current;
    const leftEl = leftRef.current;
    if (!centerEl) return;

    const observer = new ResizeObserver(evaluatePlacement);
    observer.observe(centerEl);
    if (rightEl) observer.observe(rightEl);
    if (leftEl) observer.observe(leftEl);
    window.addEventListener("resize", evaluatePlacement);
    evaluatePlacement();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", evaluatePlacement);
    };
  }, [evaluatePlacement]);

  // Re-evaluate when habits change (affects tracker height)
  useEffect(() => {
    evaluatePlacement();
  }, [habits, evaluatePlacement]);

  // Determine if we have any timed habits
  const hasTimedHabits = useMemo(() => {
    return habits.some((h) => parseTimeDuration(h.name).detected);
  }, [habits]);

  if (!loaded || isFetching) {
    return (
      <div className="loader-container">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      {/* Background overlays handled by DynamicBackground in layout */}

      <div style={{ position: "relative", zIndex: 10 }}>
        {/* ─── HEADER ─── */}
        <header className="header">
          <div className="header-left">
            <h1>
              <span className="accent">SK&apos;</span> HABIT{" "}
              <strong>TRACKER</strong>
            </h1>
            <p className="header-subtitle">Build the life you want</p>
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
            <div className="month-selectors">
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={i} value={i}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <Link href="/history" className="header-nav-link">
              📜 Timer History
            </Link>
            <Link href="/expenses" className="header-nav-link">
              💰 Expenses
            </Link>
          </div>
        </header>

        {/* ─── MONTH TITLE ─── */}
        <div className="month-title">
          {MONTH_NAMES[month].toUpperCase()} {year}
        </div>

        {/* ─── YEAR PROGRESS ─── */}
        <div style={{
          background: "var(--bg-card)", backdropFilter: "blur(16px)",
          border: "1px solid var(--border)", borderRadius: "var(--radius)",
          padding: "16px 24px", marginBottom: "16px",
        }}>
          <YearProgress />
        </div>

        {/* ─── MAIN 3-COLUMN: Focus | Tracker | Goals ─── */}
        <div className="main-three-col">
          {/* Left: Daily Focus (vertical) */}
          <div className="main-col-left" ref={leftRef}>
            <DailyFocus
              habits={habits}
              year={year}
              month={month}
              totalCompleted={totalCompleted}
              totalCrossed={totalCrossed}
              totalPossible={totalPossible}
              completionPercent={completionPercent}
              getDayCompletionCount={getDayCompletionCount}
            />
          </div>

          {/* Center: Habit Tracker */}
          <div className="main-col-center" ref={centerRef}>
            <div className="habit-board">
              <div className="habit-board-header">
                <h2 className="habit-board-title">Habit Tracker</h2>
              </div>
              <HabitGrid
                habits={habits}
                year={year}
                month={month}
                daysInMonth={daysInMonth}
                setDayStatus={setDayStatus}
                isDayCompleted={isDayCompleted}
                isDayCrossed={isDayCrossed}
                getHabitMonthlyCount={getHabitMonthlyCount}
                removeHabit={removeHabit}
              />
              <div className="add-habit-row">
                <button
                  className="btn-add-habit"
                  onClick={() => setShowModal(true)}
                >
                  + Add New Habit
                </button>
              </div>
            </div>

            {/* Timer in center placement — below tracker, between side columns */}
            {hasTimedHabits && timerPlacement === "center" && (
              <div style={{ marginTop: 12 }}>
                <ActiveTimerPanel
                  habits={habits}
                  placement="center"
                  setDayStatus={setDayStatus}
                  isDayCompleted={isDayCompleted}
                />
              </div>
            )}
          </div>

          {/* Right: Goal & Habit Setup */}
          <div className="main-col-right">
            <div ref={rightRef}>
              <GoalsAndSacrifices
                habits={habits}
                totalCompleted={totalCompleted}
                totalPossible={totalPossible}
                completionPercent={completionPercent}
                bestDateObj={bestDateObj}
                year={year}
                month={month}
              />
            </div>
          </div>
        </div>

        {/* Timer full-width — below the 3-column layout when tracker is tall */}
        {hasTimedHabits && timerPlacement === "full" && (
          <div style={{ marginTop: 12 }}>
            <ActiveTimerPanel
              habits={habits}
              placement="full"
              setDayStatus={setDayStatus}
              isDayCompleted={isDayCompleted}
            />
          </div>
        )}

        {/* ─── INSIGHTS ─── */}
        <div className="insights-section">
          <div className="insights-header">
            <h2 className="insights-title">Insights</h2>
          </div>
          <BottomCharts
            dailyVolume={dailyVolume}
            daysInMonth={daysInMonth}
            habits={habits}
          />
        </div>

        {/* ─── DAILY JOURNAL ─── */}
        <DailyJournal />

        {/* Modal */}
        {showModal && (
          <AddHabitModal onAdd={addHabit} onClose={() => setShowModal(false)} />
        )}
      </div>
    </div>
  );
}
