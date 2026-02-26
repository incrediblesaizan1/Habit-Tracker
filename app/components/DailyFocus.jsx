"use client";
import { motion } from "framer-motion";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
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
  const totalHabits = habits.length;

  // Progress ring
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (completionPercent / 100) * circumference;

  return (
    <div className="daily-focus-section" style={{ marginBottom: 0 }}>
      <h2 className="daily-focus-title" style={{ marginBottom: "16px" }}>Daily Focus</h2>

      {/* Today Card */}
      <div className="today-card" style={{ flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "12px" }}>
        <div className="today-card-label">Today</div>
        <div className="today-card-date">{todayStr}</div>

        {/* Progress Ring */}
        <div className="focus-ring-wrap" style={{ margin: "16px auto" }}>
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
            <span className="focus-pr-num">{totalCompleted}/{totalPossible}</span>
            <span className="focus-pr-pct">{completionPercent}%</span>
          </div>
        </div>

        <div className="today-card-stats" style={{ justifyContent: "center" }}>
          <div className="today-stat" style={{ textAlign: "center" }}>
            <div className="today-stat-label">Completed</div>
            <div className="today-stat-value">{totalCompleted}</div>
          </div>
          <div className="today-stat" style={{ textAlign: "center" }}>
            <div className="today-stat-label">Missed</div>
            <div className="today-stat-value" style={{ color: "var(--red)" }}>{totalCrossed}</div>
          </div>
        </div>
      </div>

      {/* Goal Progress */}
      <div className="goal-progress-card" style={{ marginBottom: "12px" }}>
        <div className="goal-progress-card-title">Goal Progress</div>
        <div className="goal-progress-row">
          <span className="goal-progress-big">{totalCompleted}/{totalPossible}</span>
        </div>
        <div className="goal-progress-bar" style={{ marginTop: "8px" }}>
          <motion.div
            className="goal-progress-bar-fill"
            initial={{ width: 0 }}
            animate={{
              width: totalPossible > 0 ? `${(totalCompleted / totalPossible) * 100}%` : "0%",
            }}
            transition={{ duration: 1, delay: 0.3 }}
          />
        </div>
      </div>

      {/* Target Info */}
      <div className="goal-progress-card">
        <div className="goal-progress-card-title">Target Habits</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>Today</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#fff" }}>{totalHabits}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10px", color: "var(--red)", marginBottom: "2px" }}>Missed</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--red)" }}>{totalCrossed}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
