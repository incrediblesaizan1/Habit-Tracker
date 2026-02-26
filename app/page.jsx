"use client";
import { useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useHabits } from "./lib/habitStore";
import HabitGrid from "./components/HabitGrid";
import BottomCharts from "./components/StatsBar";
import AddHabitModal from "./components/AddHabitModal";
import DailyJournal from "./components/DailyJournal";
import GoalsAndSacrifices from "./components/GoalsAndSacrifices";
import DailyFocus from "./components/DailyFocus";

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
  } = useHabits();

  const [showModal, setShowModal] = useState(false);

  if (!loaded) {
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
          </div>
        </header>

        {/* ─── MONTH TITLE ─── */}
        <div className="month-title">
          {MONTH_NAMES[month].toUpperCase()} {year}
        </div>

        {/* ─── DAILY FOCUS ─── */}
        <DailyFocus
          habits={habits}
          year={year}
          month={month}
          totalCompleted={totalCompleted}
          totalCrossed={totalCrossed}
          totalPossible={totalPossible}
          completionPercent={completionPercent}
          bestDateObj={bestDateObj}
        />

        {/* ─── GOAL & HABIT SETUP ─── */}
        <GoalsAndSacrifices
          habits={habits}
          totalCompleted={totalCompleted}
          totalPossible={totalPossible}
          completionPercent={completionPercent}
          bestDateObj={bestDateObj}
          year={year}
          month={month}
        />

        {/* ─── HABIT TRACKER ─── */}
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
