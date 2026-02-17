"use client";
import { useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useHabits } from "./lib/habitStore";
import HabitGrid from "./components/HabitGrid";
import RightSidebar from "./components/Sidebar";
import BottomCharts from "./components/StatsBar";
import AddHabitModal from "./components/AddHabitModal";
import DailyJournal from "./components/DailyJournal";

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
    toggleDay,
    toggleDayCrossed,
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

      {/* Steps Bar */}
      <div className="steps-bar">
        <div className="step-card s1">
          <div className="step-icon">📅</div>
          <span className="step-label">
            ⭐ <strong>Step 1:</strong> Enter the Year &amp; Month
          </span>
        </div>
        <div className="step-card s2">
          <div className="step-icon">✏️</div>
          <span className="step-label">
            ⭐ <strong>Step 2:</strong> Enter Your Daily Habits
          </span>
        </div>
        <div className="step-card s3">
          <div className="step-icon">✅</div>
          <span className="step-label">
            ⭐ <strong>Step 3:</strong> Check Off Completed Habits
          </span>
        </div>
        <div className="step-card s4">
          <div className="step-icon">📊</div>
          <span className="step-label">
            ⭐ <strong>Step 4:</strong> View Your Progress!
          </span>
        </div>
      </div>

      {/* Main Content: Grid + Sidebar */}
      <div className="content-row">
        <div className="habit-board">
          <HabitGrid
            habits={habits}
            year={year}
            month={month}
            daysInMonth={daysInMonth}
            toggleDay={toggleDay}
            toggleDayCrossed={toggleDayCrossed}
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
  );
}
