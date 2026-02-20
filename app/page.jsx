"use client";
import { useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useHabits } from "./lib/habitStore";
import HabitGrid from "./components/HabitGrid";
import RightSidebar from "./components/Sidebar";
import BottomCharts from "./components/StatsBar";
import AddHabitModal from "./components/AddHabitModal";
import DailyJournal from "./components/DailyJournal";
import YearProgress from "./components/YearProgress";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
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
    dailyVolume,
    addHabit,
    removeHabit,
    loaded,
    WEEKDAY_NAMES,
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
      {/* Background image & overlay (shared with Journals) */}
      <div className="journals-bg-image" />
      <div className="journals-bg-overlay" />

      <div style={{ position: "relative", zIndex: 10 }}>
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <h1>
              <span className="accent">SK&apos;</span> HABIT{" "}
              <strong>TRACKER</strong>
            </h1>
            <p className="header-subtitle">
              Track your daily habits &amp; build consistency
            </p>
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
              <label>Year</label>
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
              <label>Month</label>
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

        {/* Month Title */}
        <div className="month-title">
          {MONTH_NAMES[month]} {year}
        </div>

        {/* Main Content: Grid + Sidebar */}
        <div className="content-row">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              minWidth: 0,
            }}
          >
            <YearProgress />
            <div className="habit-board">
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
          </div>

          <RightSidebar
            habits={habits}
            totalCompleted={totalCompleted}
            totalCrossed={totalCrossed}
            totalPossible={totalPossible}
            completionPercent={completionPercent}
            month={month}
            year={year}
          />
        </div>

        {/* Bottom Charts */}
        <BottomCharts
          dailyVolume={dailyVolume}
          daysInMonth={daysInMonth}
          habits={habits}
        />

        {/* Daily Journal */}
        <DailyJournal />

        {/* Modal */}
        {showModal && (
          <AddHabitModal onAdd={addHabit} onClose={() => setShowModal(false)} />
        )}
      </div>
    </div>
  );
}
