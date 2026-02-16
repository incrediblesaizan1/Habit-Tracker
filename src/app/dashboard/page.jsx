"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  useAuth,
  useUser,
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import {
  getDaysInMonth,
  getMonthName,
  formatDate,
  generateId,
  getProgressColor,
  getDayOfWeekShort,
  getTodayString,
} from "../utils";

const DEFAULT_HABITS = [
  // Keeping these for when a user first signs up?
  // actually, we might want to let them start empty or create these on server side.
  // For now, let's start empty if no habits found.
];

export default function HabitTracker() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [habits, setHabits] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [isLoading, setIsLoading] = useState(true);
  const [editingHabit, setEditingHabit] = useState(null);

  // Fetch habits from API
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const fetchHabits = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/habits");
        if (res.ok) {
          const data = await res.json();
          // Convert completions object/map from DB if needed,
          // but our API returns it as is. Mongoose Map becomes object in JSON.
          setHabits(data);
        }
      } catch (error) {
        console.error("Failed to fetch habits", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHabits();
  }, [isLoaded, isSignedIn]);

  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const todayStr = getTodayString();

  // Calculate weeks (Mon-Sun)
  const weeks = useMemo(() => {
    const result = [];
    let weekDays = [];
    let weekNum = 1;

    for (let day = 1; day <= daysInMonth; day++) {
      weekDays.push(day);
      const dow = new Date(year, month, day).getDay();
      if (dow === 0 || day === daysInMonth) {
        result.push({ weekNum, days: weekDays });
        weekDays = [];
        weekNum++;
      }
    }
    return result;
  }, [year, month, daysInMonth]);

  const toggleHabit = useCallback(async (habitId, dateStr) => {
    // Optimistic update
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const newCompletions = { ...h.completions };
        if (newCompletions[dateStr]) {
          delete newCompletions[dateStr];
        } else {
          newCompletions[dateStr] = true;
        }
        return { ...h, completions: newCompletions };
      }),
    );

    try {
      await fetch(`/api/habits/${habitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleDate: dateStr }),
      });
    } catch (error) {
      console.error("Failed to toggle habit", error);
      // Revert? For now, we'll assume success or user will refresh.
    }
  }, []);

  const addHabit = useCallback(() => {
    const tempId = `temp-${Date.now()}`;
    const newHabit = { id: tempId, name: "", completions: {} };
    setHabits((prev) => [...prev, newHabit]);
    setEditingHabit(tempId);
  }, []);

  const updateHabitName = useCallback((id, name) => {
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, name } : h)));
  }, []);

  const saveHabitName = useCallback(async (id, name) => {
    setEditingHabit(null);
    const finalName = name.trim() || "New Habit";

    // If it's a temporary ID, create a new habit
    if (id.toString().startsWith("temp-")) {
      try {
        // Update local name first to "New Habit" if it was empty
        setHabits((prev) =>
          prev.map((h) => (h.id === id ? { ...h, name: finalName } : h)),
        );

        const res = await fetch("/api/habits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: finalName }),
        });
        if (res.ok) {
          const savedHabit = await res.json();
          // Replace temp ID with real ID
          setHabits((prev) => prev.map((h) => (h.id === id ? savedHabit : h)));
        } else {
          // Remove if failed?
          console.error("Failed to create habit");
          setHabits((prev) => prev.filter((h) => h.id !== id));
        }
      } catch (error) {
        console.error("Failed to add habit", error);
        setHabits((prev) => prev.filter((h) => h.id !== id));
      }
      return;
    }

    // Otherwise update existing
    try {
      // Improve optimistic UI to show "New Habit" if empty was sent
      setHabits((prev) =>
        prev.map((h) => (h.id === id ? { ...h, name: finalName } : h)),
      );

      await fetch(`/api/habits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: finalName }),
      });
    } catch (error) {
      console.error("Failed to save name", error);
    }
  }, []);

  const deleteHabit = useCallback(async (id) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    try {
      await fetch(`/api/habits/${id}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to delete habit", error);
    }
  }, []);

  // Stats calculations
  const stats = useMemo(() => {
    let totalCompleted = 0;
    const totalPossible = habits.length * daysInMonth;

    const dailyCompletions = {};
    for (let d = 1; d <= daysInMonth; d++) {
      dailyCompletions[d] = 0;
    }

    const habitStats = habits.map((habit) => {
      let completed = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatDate(year, month, day);
        if (habit.completions && habit.completions[dateStr]) {
          completed++;
          dailyCompletions[day]++;
        }
      }
      totalCompleted += completed;
      const percentage =
        daysInMonth > 0 ? Math.round((completed / daysInMonth) * 100) : 0;
      return { habitId: habit.id, completed, total: daysInMonth, percentage };
    });

    const dailyChartData = [];
    let cumulativeTotal = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      cumulativeTotal += dailyCompletions[d];
      dailyChartData.push({
        day: d,
        completed: dailyCompletions[d],
        cumulative: cumulativeTotal,
        percentage:
          habits.length > 0
            ? Math.round((dailyCompletions[d] / habits.length) * 100)
            : 0,
      });
    }

    const uncompleted = totalPossible - totalCompleted;
    const overallPercentage =
      totalPossible > 0
        ? Math.round((totalCompleted / totalPossible) * 100)
        : 0;

    return {
      totalCompleted,
      totalPossible,
      uncompleted,
      overallPercentage,
      habitStats,
      dailyChartData,
      dailyCompletions,
    };
  }, [habits, year, month, daysInMonth]);

  if (!isLoaded || isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <div
          className="spinner"
          style={{
            width: 40,
            height: 40,
            border: "3px solid #1e3a5f",
            borderTopColor: "#10b981",
            borderRadius: "50%",
          }}
        />
      </div>
    );
  }

  // Auth Protection
  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  const monthOptions = Array.from({ length: 12 }, (_, i) => i);
  const yearOptions = Array.from({ length: 11 }, (_, i) => year - 5 + i);

  // Donut chart SVG
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset =
    circumference - (stats.overallPercentage / 100) * circumference;

  return (
    <main style={{ maxWidth: 1800, margin: "0 auto", padding: "16px 12px" }}>
      <div className="animated-bg" />
      {/* Header */}
      <header style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              <span
                style={{
                  background: "linear-gradient(135deg, #10b981, #3b82f6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                SK&apos; HABIT
              </span>{" "}
              <span style={{ color: "#e2e8f0" }}>TRACKER</span>
            </h1>
            <p style={{ color: "#64748b", marginTop: 4, fontSize: 13 }}>
              Track your daily habits &amp; build consistency
            </p>
          </div>

          {/* Month/Year Selector */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: "#64748b",
                  letterSpacing: "0.05em",
                }}
              >
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                style={{
                  background: "#1a2332",
                  border: "1px solid #1e3a5f",
                  borderRadius: 8,
                  color: "#e2e8f0",
                  padding: "6px 10px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: "#64748b",
                  letterSpacing: "0.05em",
                }}
              >
                Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                style={{
                  background: "#1a2332",
                  border: "1px solid #1e3a5f",
                  borderRadius: 8,
                  color: "#e2e8f0",
                  padding: "6px 10px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {getMonthName(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Big month title */}
        <div style={{ textAlign: "center", margin: "16px 0 8px" }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#e2e8f0",
              letterSpacing: "0.08em",
            }}
          >
            {getMonthName(month).toUpperCase()} {year}
          </h2>
        </div>
      </header>

      {/* Step indicators */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {[
          { step: 1, text: "ENTER THE YEAR & MONTH", icon: "📅" },
          { step: 2, text: "ENTER YOUR DAILY HABITS", icon: "✏️" },
          { step: 3, text: "CHECK OFF COMPLETED HABITS", icon: "✅" },
          { step: 4, text: "VIEW YOUR PROGRESS!", icon: "📊" },
        ].map((s) => (
          <div
            key={s.step}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background:
                "linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 14 }}>{s.icon}</span>
            <div>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#f59e0b" }}>
                ⭐ STEP {s.step}:{" "}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8" }}>
                {s.text}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* Main Content: Tracker (Left) + Stats (Right) */}
      <section className="main-layout">
        {/* LEFT: Habit Table */}
        <div className="main-left">
          <div className="habit-table-container">
            <table className="habit-table">
              <thead>
                <tr>
                  <th
                    style={{
                      width: 40,
                      position: "sticky",
                      left: 0,
                      zIndex: 11,
                      background: "linear-gradient(180deg, #1a2332, #152030)",
                    }}
                  >
                    S/N
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      paddingLeft: 12,
                      minWidth: 180,
                      position: "sticky",
                      left: 40,
                      zIndex: 11,
                      background: "linear-gradient(180deg, #1a2332, #152030)",
                    }}
                  >
                    HABITS
                  </th>
                  {weeks.map((w) => (
                    <th
                      key={w.weekNum}
                      colSpan={w.days.length}
                      className="week-header"
                    >
                      WEEK {w.weekNum}
                    </th>
                  ))}
                  <th style={{ minWidth: 70 }}>DONE</th>
                  <th style={{ minWidth: 80 }}>TOTAL</th>
                  <th style={{ width: 36 }}></th>
                </tr>
                <tr>
                  <th
                    style={{
                      position: "sticky",
                      left: 0,
                      zIndex: 11,
                      background: "linear-gradient(180deg, #1a2332, #152030)",
                    }}
                  ></th>
                  <th
                    style={{
                      position: "sticky",
                      left: 40,
                      zIndex: 11,
                      background: "linear-gradient(180deg, #1a2332, #152030)",
                    }}
                  ></th>
                  {weeks.map((w) =>
                    w.days.map((day) => (
                      <th
                        key={day}
                        style={{
                          fontSize: 9,
                          padding: "4px 2px",
                          color:
                            formatDate(year, month, day) === todayStr
                              ? "#10b981"
                              : "#64748b",
                        }}
                      >
                        <div>{getDayOfWeekShort(year, month, day)}</div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 10,
                            color:
                              formatDate(year, month, day) === todayStr
                                ? "#10b981"
                                : "#94a3b8",
                          }}
                        >
                          {day}
                        </div>
                      </th>
                    )),
                  )}
                  <th></th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {habits.map((habit, idx) => {
                  const habitStat = stats.habitStats.find(
                    (s) => s.habitId === habit.id,
                  );
                  const completed = habitStat?.completed ?? 0;
                  const percentage = habitStat?.percentage ?? 0;
                  const progressColor = getProgressColor(percentage);

                  // Ensure completions is treated safely
                  const safeCompletions = habit.completions || {};

                  return (
                    <tr key={habit.id}>
                      <td
                        style={{
                          position: "sticky",
                          left: 0,
                          background: "#0a0f1a",
                          zIndex: 5,
                        }}
                      >
                        {idx + 1}
                      </td>
                      <td
                        style={{
                          position: "sticky",
                          left: 40,
                          background: "#0a0f1a",
                          zIndex: 5,
                        }}
                      >
                        {editingHabit === habit.id ? (
                          <input
                            className="habit-name-input"
                            value={habit.name}
                            onChange={(e) =>
                              updateHabitName(habit.id, e.target.value)
                            }
                            onBlur={(e) => saveHabitName(habit.id, habit.name)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                saveHabitName(habit.id, habit.name);
                            }}
                            autoFocus
                            placeholder="Enter habit name..."
                          />
                        ) : (
                          <span
                            onClick={() => setEditingHabit(habit.id)}
                            style={{
                              cursor: "pointer",
                              display: "block",
                              padding: "4px 0",
                            }}
                            title="Click to edit"
                          >
                            {habit.name || (
                              <span
                                style={{
                                  color: "#64748b",
                                  fontStyle: "italic",
                                }}
                              >
                                Click to name…
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      {weeks.map((w) =>
                        w.days.map((day) => {
                          const dateStr = formatDate(year, month, day);
                          const isChecked = !!safeCompletions[dateStr];
                          const isToday = dateStr === todayStr;
                          return (
                            <td key={day} style={{ padding: "4px 2px" }}>
                              <input
                                type="checkbox"
                                className="habit-checkbox"
                                checked={isChecked}
                                onChange={() => toggleHabit(habit.id, dateStr)}
                                style={
                                  isToday
                                    ? {
                                        borderColor: "#10b981",
                                        boxShadow:
                                          "0 0 6px rgba(16,185,129,0.3)",
                                      }
                                    : undefined
                                }
                              />
                            </td>
                          );
                        }),
                      )}
                      <td
                        className="completion-cell"
                        style={{ color: progressColor }}
                      >
                        {completed} / {daysInMonth}
                      </td>
                      <td className="total-cell">
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span style={{ color: progressColor, fontSize: 15 }}>
                            {percentage}%
                          </span>
                          <div
                            className="progress-bar-bg"
                            style={{ width: "80%" }}
                          >
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${percentage}%`,
                                background: progressColor,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => deleteHabit(habit.id)}
                          title="Delete habit"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add habit button */}
          <div
            style={{ marginTop: 12, display: "flex", justifyContent: "center" }}
          >
            <button className="add-habit-btn" onClick={addHabit}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
              Add New Habit
            </button>
          </div>
        </div>

        {/* RIGHT: Dashboard Stats Sidebar */}
        <div className="main-right">
          {/* User Profile in Sidebar */}
          <div
            className="stat-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 16,
            }}
          >
            <UserButton />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
                {user?.fullName || user?.username || "User"}
              </p>
              <p style={{ fontSize: 11, color: "#64748b" }}>Profile Settings</p>
            </div>
          </div>

          {/* Total Completed */}
          <div className="stat-card green">
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                color: "#64748b",
                letterSpacing: "0.05em",
                marginBottom: 8,
              }}
            >
              Total Habits Completed
            </p>
            <p
              style={{
                fontSize: 40,
                fontWeight: 900,
                color: "#10b981",
                lineHeight: 1,
              }}
            >
              {stats.totalCompleted}
            </p>
            <div style={{ marginTop: 12 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: "#ef4444",
                  letterSpacing: "0.05em",
                  marginBottom: 4,
                }}
              >
                Total Uncompleted
              </p>
              <p
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#ef4444",
                  lineHeight: 1,
                }}
              >
                {stats.uncompleted}
              </p>
            </div>
          </div>

          {/* Monthly Progress Donut */}
          <div
            className="stat-card amber"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                color: "#64748b",
                letterSpacing: "0.05em",
                marginBottom: 12,
              }}
            >
              Monthly Progress
            </p>
            <div style={{ position: "relative", width: 120, height: 120 }}>
              <svg width="120" height="120" viewBox="0 0 130 130">
                <circle cx="65" cy="65" r={radius} className="donut-track" />
                <circle
                  cx="65"
                  cy="65"
                  r={radius}
                  className="donut-fill"
                  stroke="#10b981"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 65 65)"
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{ fontSize: 20, fontWeight: 800, color: "#e2e8f0" }}
                >
                  {stats.totalCompleted}
                </span>
                <span
                  style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}
                >
                  / {stats.totalPossible}
                </span>
              </div>
            </div>
            <p
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#10b981",
                marginTop: 8,
              }}
            >
              {stats.overallPercentage}%
            </p>

            {/* Today's date */}
            <div
              style={{
                marginTop: 12,
                padding: "6px 14px",
                background: "rgba(16, 185, 129, 0.1)",
                borderRadius: 8,
                border: "1px solid rgba(16, 185, 129, 0.2)",
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase",
                  textAlign: "center",
                  marginBottom: 2,
                }}
              >
                Today&apos;s Date
              </p>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#10b981",
                  textAlign: "center",
                }}
              >
                {new Date().toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Charts - Full Width */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Daily Completion Chart */}
        <div className="stat-card blue">
          <h3>Daily Completions</h3>
          <div style={{ height: 250, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    color: "#f1f5f9",
                  }}
                  itemStyle={{ color: "#f1f5f9" }}
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                />
                <Bar
                  dataKey="completed"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumulative Progress */}
        <div className="stat-card green">
          <h3>Cumulative Progress</h3>
          <div style={{ height: 250, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dailyChartData}>
                <defs>
                  <linearGradient
                    id="colorCumulative"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    color: "#f1f5f9",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCumulative)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Completion % over month */}
        <div className="stat-card amber">
          <h3>Daily Consistency (%)</h3>
          <div style={{ height: 250, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.dailyChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    color: "#f1f5f9",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#f59e0b" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </main>
  );
}
