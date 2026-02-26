"use client";
import { motion } from "framer-motion";

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

export default function DailyFocus({
  habits,
  year,
  month,
  totalCompleted,
  totalCrossed,
  totalPossible,
  completionPercent,
  bestDateObj,
}) {
  const today = new Date();
  const todayStr = `${MONTH_NAMES[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;
  const todayDate = isCurrentMonth ? today.getDate() : 0;
  const totalHabits = habits.length;

  // Today's stats from habits
  const todayCompleted =
    totalHabits > 0 ? Math.min(totalCompleted, totalHabits * todayDate) : 0;
  const todayMissed = totalCrossed;

  // Progress ring
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (completionPercent / 100) * circumference;

  // Completed ratio for today display
  const completedToday = isCurrentMonth
    ? `${Math.min(totalCompleted, totalHabits * todayDate)}`
    : `${totalCompleted}`;

  return (
    <div className="daily-focus-section">
      <div className="daily-focus-header">
        <h2 className="daily-focus-title">Daily Focus</h2>
      </div>

      <div className="daily-focus-grid">
        {/* Left: Today Card */}
        <div className="today-card">
          <div className="today-card-info">
            <div className="today-card-label">Today</div>
            <div className="today-card-date">{todayStr}</div>
            <div className="today-card-stats">
              <div className="today-stat">
                <div className="today-stat-label">Habits Completed</div>
                <div className="today-stat-value">{totalCompleted}</div>
                <div className="today-stat-bar" style={{ width: "100px" }}>
                  <div
                    className="today-stat-bar-fill green"
                    style={{
                      width:
                        totalPossible > 0
                          ? `${(totalCompleted / totalPossible) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
              <div className="today-stat">
                <div className="today-stat-label">Habits Missed</div>
                <div
                  className="today-stat-value"
                  style={{ color: "var(--red)" }}
                >
                  {totalCrossed}
                </div>
                <div className="today-stat-bar" style={{ width: "100px" }}>
                  <div
                    className="today-stat-bar-fill red"
                    style={{
                      width:
                        totalPossible > 0
                          ? `${(totalCrossed / totalPossible) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Progress Ring */}
          <div className="focus-ring-wrap">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle className="focus-pr-bg" cx="50" cy="50" r={radius} />
              <motion.circle
                className="focus-pr-fill"
                cx="50"
                cy="50"
                r={radius}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
              />
            </svg>
            <div className="focus-pr-text">
              <span className="focus-pr-num">
                {totalCompleted}/{totalPossible}
              </span>
              <span className="focus-pr-pct">{completionPercent}%</span>
            </div>
          </div>
        </div>

        {/* Center: Goal Progress Cards */}
        <div className="goal-progress-zone">
          <div className="goal-progress-card">
            <div className="goal-progress-card-title">Goal Progress</div>
            <div className="goal-progress-row">
              <span className="goal-progress-big">
                {totalCompleted}/{totalPossible}
              </span>
              <span className="goal-progress-sm">{totalHabits} habits</span>
            </div>
            <div className="goal-progress-bar">
              <motion.div
                className="goal-progress-bar-fill"
                initial={{ width: 0 }}
                animate={{
                  width:
                    totalPossible > 0
                      ? `${(totalCompleted / totalPossible) * 100}%`
                      : "0%",
                }}
                transition={{ duration: 1, delay: 0.3 }}
              />
            </div>
          </div>
          <div className="goal-progress-card">
            <div className="goal-progress-card-title">Target Habits</div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginBottom: "4px",
                  }}
                >
                  Today
                </div>
                <div
                  style={{ fontSize: "20px", fontWeight: "800", color: "#fff" }}
                >
                  {totalHabits}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginBottom: "4px",
                  }}
                >
                  Habits Missed
                </div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "800",
                    color: "var(--red)",
                  }}
                >
                  {totalCrossed}
                </div>
              </div>
              {bestDateObj?.day && (
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "var(--accent)",
                      fontWeight: "600",
                    }}
                  >
                    ✓ Best Streak
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      marginTop: "2px",
                    }}
                  >
                    {MONTH_NAMES[month]} {bestDateObj.day}, {year}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Month Stats */}
        <div className="month-stats-card">
          <div className="month-stats-item">
            <div className="month-stats-label">Total Habits Done</div>
            <div className="month-stats-value green">{totalCompleted}</div>
          </div>
          <div className="month-stats-item">
            <div className="month-stats-label red">Total Missed</div>
            <div className="month-stats-value red">{totalCrossed}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
