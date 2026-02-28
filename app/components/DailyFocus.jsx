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
  getDayCompletionCount,
}) {
  const today = new Date();
  const totalHabits = habits.length;
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  let displayTitle, displayDateStr, targetDate;
  if (isCurrentMonth) {
    displayTitle = "Today";
    targetDate = today.getDate();
    displayDateStr = `${MONTH_NAMES[today.getMonth()]} ${targetDate}, ${today.getFullYear()}`;
  } else {
    displayTitle = "That day";
    targetDate = new Date(year, month + 1, 0).getDate();
    displayDateStr = `${MONTH_NAMES[month]} ${targetDate}, ${year}`;
  }

  // Actual completed count (habits done on target date)
  const targetDayDone = getDayCompletionCount ? getDayCompletionCount(targetDate) : 0;
  const targetDayIncomplete = Math.max(0, totalHabits - targetDayDone);

  // Progress ring
  const radius = 54;
  const svgSize = 130;
  const center = svgSize / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (completionPercent / 100) * circumference;

  return (
    <div className="daily-focus-section" style={{ marginBottom: 0 }}>
      <h2 className="daily-focus-title" style={{ marginBottom: "16px" }}>Daily Focus</h2>

      {/* Today Card */}
      <div className="today-card" style={{ flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "12px" }}>
        <div className="today-card-label">{displayTitle}</div>
        <div className="today-card-date">{displayDateStr}</div>

        {/* Progress Ring */}
        <div className="focus-ring-wrap" style={{ margin: "12px auto", width: `${svgSize}px`, height: `${svgSize}px` }}>
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
            <circle className="focus-pr-bg" cx={center} cy={center} r={radius} />
            <motion.circle
              className="focus-pr-fill"
              cx={center}
              cy={center}
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

      {/* Target Habits */}
      <div className="goal-progress-card">
        <div className="goal-progress-card-title">Target Habits</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>{isCurrentMonth ? "Today's Task" : "That Day's Task"}</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#fff" }}>{totalHabits}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10px", color: "var(--orange)", marginBottom: "2px" }}>Incomplete</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--orange)" }}>{targetDayIncomplete}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
