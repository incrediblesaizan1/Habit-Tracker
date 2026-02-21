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

export default function Sidebar({
  habits,
  totalCompleted,
  totalCrossed,
  totalPossible,
  completionPercent,
  month,
  year,
  bestDateObj,
}) {
  const uncompleted = totalPossible - totalCompleted;
  const today = new Date();
  const todayStr = `${MONTH_NAMES[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

  const bestDateStr = bestDateObj?.day
    ? `${MONTH_NAMES[month]} ${bestDateObj.day}, ${year}`
    : "No habits yet";
  const bestDateCount = Math.max(bestDateObj?.count || 0, 0);

  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (completionPercent / 100) * circumference;

  const sidebarVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, delay: 0.2 } },
  };

  return (
    <motion.div
      className="right-sidebar"
      initial="hidden"
      animate="visible"
      variants={sidebarVariants}
    >
      {/* Habits Stats */}
      <div className="sidebar-card orange-top">
        <div className="stats-section">
          <div className="stats-label">Total Habits Completed</div>
          <div className="stats-value green">{totalCompleted}</div>
          <div className="stats-divider" />
          <div className="stats-missed-label">Total Missed</div>
          <div className="stats-missed-value">{totalCrossed}</div>
        </div>
      </div>

      {/* Monthly Progress */}
      <div className="sidebar-card accent-top">
        <div className="progress-card">
          <div className="progress-card-title">Monthly Progress</div>
          <div className="progress-ring-wrap">
            <svg width="110" height="110" viewBox="0 0 110 110">
              <circle className="pr-bg" cx="55" cy="55" r={radius} />
              <motion.circle
                className="pr-fill"
                cx="55"
                cy="55"
                r={radius}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
              />
            </svg>
            <div className="pr-text">
              <span className="pr-num">{totalCompleted}</span>
              <span className="pr-denom">/ {totalPossible}</span>
            </div>
          </div>
          <div className="progress-pct">{completionPercent}%</div>
          <div className="today-badge">
            <span>Today&apos;s Date</span>
            <span className="today-badge-date">{todayStr}</span>
          </div>
        </div>
      </div>

      {/* Best Day Card */}
      <div
        className="sidebar-card"
        style={{ borderTop: "2px solid var(--accent)" }}
      >
        <div className="stats-section">
          <div className="stats-label">Best Day</div>
          <div
            className="stats-value"
            style={{
              fontSize: "22px",
              color: "var(--text-primary)",
              marginTop: "4px",
            }}
          >
            {bestDateStr}
          </div>
          <div className="stats-divider" />
          <div
            className="stats-missed-label"
            style={{ color: "var(--accent)" }}
          >
            Habits Completed
          </div>
          <div
            className="stats-missed-value"
            style={{
              color: "var(--accent)",
              fontSize: "24px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "4px",
            }}
          >
            <span>{bestDateCount}</span>
            <div
              style={{
                flex: 1,
                height: "6px",
                background: "rgba(20, 184, 166, 0.2)",
                borderRadius: "3px",
                overflow: "hidden",
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${habits?.length > 0 ? (bestDateCount / habits.length) * 100 : 0}%`,
                }}
                transition={{ duration: 1, delay: 0.5 }}
                style={{
                  height: "100%",
                  background: "var(--accent)",
                  borderRadius: "3px",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
