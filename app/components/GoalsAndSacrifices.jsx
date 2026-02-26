"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function GoalsAndSacrifices({
  habits = [],
  totalCompleted = 0,
  totalPossible = 0,
  completionPercent = 0,
  bestDateObj = {},
  year,
  month,
}) {
  const [goal, setGoal] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [reward, setReward] = useState("");
  const [sacrifices, setSacrifices] = useState([""]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const saveTimeout = useRef(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/goals`);
        if (res.ok) {
          const data = await res.json();
          setGoal(data.goal || "");
          setTargetDate(data.targetDate || "");
          setReward(data.reward || "");
          setSacrifices(
            data.sacrifices && data.sacrifices.length > 0 ? data.sacrifices : [""],
          );
          setSaved(false);
        }
      } catch (err) {
        console.error("Failed to fetch goals:", err);
      }
    }
    fetchData();
  }, []);

  const saveData = useCallback(
    async (currentGoal, currentTargetDate, currentSacrifices) => {
      setSaving(false);
      setSaved(true);
      try {
        await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal: currentGoal,
            targetDate: currentTargetDate,
            sacrifices: currentSacrifices,
          }),
        });
      } catch (err) {
        console.error("Failed to save goals:", err);
        setSaved(false);
        setSaving(false);
        setSaveFailed(true);
      }
    },
    [],
  );

  function triggerSave(newGoal, newTargetDate, newSacrifices) {
    setSaved(false);
    setSaveFailed(false);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(
      () => saveData(newGoal, newTargetDate, newSacrifices),
      800,
    );
  }

  const [newSacrifice, setNewSacrifice] = useState("");

  function handleAddSacrifice(e) {
    e.preventDefault();
    if (!newSacrifice.trim()) return;
    let newSacrifices;
    if (sacrifices.length === 1 && sacrifices[0] === "") {
      newSacrifices = [newSacrifice.trim()];
    } else {
      newSacrifices = [...sacrifices, newSacrifice.trim()];
    }
    setSacrifices(newSacrifices);
    setNewSacrifice("");
    triggerSave(goal, targetDate, newSacrifices);
  }

  function removeSacrifice(index) {
    let newSacrifices = sacrifices.filter((_, i) => i !== index);
    if (newSacrifices.length === 0) newSacrifices = [""];
    setSacrifices(newSacrifices);
    triggerSave(goal, targetDate, newSacrifices);
  }

  // Streak ring
  const streakRadius = 52;
  const streakCirc = 2 * Math.PI * streakRadius;
  const streakOffset = streakCirc - (completionPercent / 100) * streakCirc;

  const bestDateStr = bestDateObj?.day
    ? `${MONTH_NAMES[month]} ${bestDateObj.day}, ${year}`
    : "";

  return (
    <div className="goal-setup-section" style={{ marginBottom: 0 }}>
      <div className="goal-setup-title" style={{ marginBottom: "16px" }}>
        <span>🎯</span>
        <span>Habit Tracker</span>
        <span className="goal-setup-status">
          {saving ? "Saving..." : saved ? "✓ Saved" : saveFailed ? "⚠ Failed" : ""}
        </span>
      </div>

      {/* Streak Ring */}
      <div className="streak-ring-container" style={{ marginBottom: "16px" }}>
        <div className="streak-ring-wrap" style={{ width: "120px", height: "120px" }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle className="streak-pr-bg" cx="60" cy="60" r={streakRadius} />
            <motion.circle
              className="streak-pr-fill"
              cx="60"
              cy="60"
              r={streakRadius}
              strokeDasharray={streakCirc}
              initial={{ strokeDashoffset: streakCirc }}
              animate={{ strokeDashoffset: streakOffset }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
            />
          </svg>
          <div className="streak-pr-text">
            <span className="streak-pr-num" style={{ fontSize: "26px" }}>{totalCompleted}</span>
            <span className="streak-pr-pct">{completionPercent}%</span>
          </div>
        </div>
        <div className="streak-label">Best Streak</div>
        {bestDateStr && <div className="streak-date">{bestDateStr}</div>}
      </div>

      {/* Goal Input */}
      <div style={{ marginBottom: "12px" }}>
        <label className="goal-field-label">My Goal</label>
        <input
          type="text"
          className="goal-field-input"
          placeholder="What are you trying to achieve?"
          value={goal}
          onChange={(e) => { setGoal(e.target.value); triggerSave(e.target.value, targetDate, sacrifices); }}
        />
      </div>

      {/* Target Days */}
      <div style={{ marginBottom: "12px" }}>
        <label className="goal-field-label">Target Days</label>
        <input
          type="text"
          className="goal-field-input"
          placeholder="E.g. 90 Days"
          value={targetDate}
          onChange={(e) => { setTargetDate(e.target.value); triggerSave(goal, e.target.value, sacrifices); }}
        />
      </div>

      {/* Sacrifice */}
      <div style={{ marginBottom: "12px" }}>
        <label className="goal-field-label">My Sacrifice</label>
        <form onSubmit={handleAddSacrifice} style={{ display: "flex", gap: "6px" }}>
          <input
            type="text"
            className="goal-field-input"
            placeholder="What will you sacrifice?"
            value={newSacrifice}
            onChange={(e) => setNewSacrifice(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            style={{
              background: "var(--accent)", color: "#fff", border: "none",
              padding: "0 12px", borderRadius: "var(--radius-xs)",
              fontSize: "11px", fontWeight: "600", cursor: "pointer",
            }}
          >
            Add
          </button>
        </form>
      </div>

      {/* Sacrifice Tags */}
      <div className="sacrifice-tags" style={{ marginBottom: "12px" }}>
        {sacrifices.filter((s) => s.trim() !== "").map((sac, index) => (
          <div key={index} className="sacrifice-tag" style={{ fontSize: "11px", padding: "4px 10px" }}>
            <span>{sac}</span>
            <button
              onClick={() => removeSacrifice(index)}
              className="sacrifice-tag-remove"
              title="Remove"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Reward */}
      <div>
        <label className="goal-field-label">My Reward</label>
        <input
          type="text"
          className="goal-field-input"
          placeholder="What's your reward?"
          value={reward}
          onChange={(e) => setReward(e.target.value)}
        />
      </div>
    </div>
  );
}
