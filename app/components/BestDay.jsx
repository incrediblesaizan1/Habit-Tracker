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

export default function BestDay({ habits, month, year, bestDateObj }) {
  const bestDateStr = bestDateObj?.day
    ? `${MONTH_NAMES[month]} ${bestDateObj.day}, ${year}`
    : "No habits yet";
  const bestDateCount = Math.max(bestDateObj?.count || 0, 0);

  return (
    <div
      className="sidebar-card"
      style={{
        borderTop: "2px solid var(--accent)",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <div
        className="stats-section"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
        }}
      >
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
        <div className="stats-missed-label" style={{ color: "var(--accent)" }}>
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
  );
}
