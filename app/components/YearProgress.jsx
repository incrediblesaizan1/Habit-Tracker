"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const MOTIVATIONAL_QUOTES = [
  "This too shall pass. Every dark night breaks into dawn.",
  "Everything will be right. The universe has never once forgotten about you.",
  "One day you will get exactly what you want — hold on until that day finds you.",
  "Disappear until you become what you want. Let the silence shape you.",
  "The storm does not last forever. Neither does the version of you that is struggling.",
  "Go quiet. Go inward. Come back as everything you prayed for.",
  "You are not behind. You are becoming. There is a difference.",
  "Disappear into your work, your healing, your growth — and reappear as the answer to your own prayers.",
  "Not yet is not never. Keep going.",
  "The cocoon is not a prison. It is a promise.",
  "Suffer quietly, grow loudly, arrive beautifully.",
  "One day you will look back and call this the beginning.",
  "Be patient with the unfolding. Great things do not arrive — they bloom.",
  "The life you want is waiting for the person you are becoming.",
  "Withdraw. Rebuild. Return unrecognizable.",
  "Every version of you that fell apart made room for the one that won't.",
  "Trust the silence. Something magnificent is being built inside it.",
  "You don't need to explain your absence. Let your arrival speak.",
  "This chapter feels like an ending. It is actually an origin story."
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
