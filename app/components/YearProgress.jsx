"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const MOTIVATIONAL_QUOTES = [
  "Small steps for big changes.",
  "Consistency is key.",
  "Don't break the chain.",
  "One day at a time.",
  "Progress, not perfection.",
  "You got this!",
  "Keep showing up.",
];

export default function YearProgress() {
  const [progress, setProgress] = useState(0);
  const [daysLeft, setDaysLeft] = useState(0);
  const [quote, setQuote] = useState("");

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const isLeap = (year) =>
      (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const totalDays = isLeap(now.getFullYear()) ? 366 : 365;

    const percent = ((dayOfYear / totalDays) * 100).toFixed(1);
    setProgress(percent);
    setDaysLeft(totalDays - dayOfYear);

    const randomQuote =
      MOTIVATIONAL_QUOTES[
        Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)
      ];
    setQuote(randomQuote);
  }, []);

  return (
    <div>
      <div style={{
        fontSize: "14px", color: "var(--text-muted)", textTransform: "uppercase",
        letterSpacing: "1px", fontWeight: "700", marginBottom: "10px",
      }}>
        Year Progress
      </div>

      <div style={{
        height: "8px", width: "100%", background: "rgba(255,255,255,0.08)",
        borderRadius: "4px", overflow: "hidden", marginBottom: "8px",
      }}>
        <motion.div
          style={{
            height: "100%", background: "var(--accent)", borderRadius: "3px",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        />
      </div>

      <div style={{
        fontSize: "14px", color: "var(--text-muted)",
        display: "flex", justifyContent: "space-between",
      }}>
        <span>{Math.round(progress)}% gone</span>
        <span style={{ color: "#fff", fontWeight: "600" }}>{daysLeft} days left</span>
      </div>

      <div style={{
        fontStyle: "italic", fontSize: "13px", color: "var(--text-muted)",
        lineHeight: "1.4", marginTop: "10px",
      }}>
        &quot;{quote}&quot;
      </div>
    </div>
  );
}
