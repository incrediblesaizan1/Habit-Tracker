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
            data.sacrifices && data.sacrifices.length > 0
              ? data.sacrifices
              : [""],
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

  function handleGoalChange(e) {
    const text = e.target.value;
    setGoal(text);
    triggerSave(text, targetDate, sacrifices);
  }

  function handleTargetDateChange(e) {
    const text = e.target.value;
    setTargetDate(text);
    triggerSave(goal, text, sacrifices);
  }

  function handleRewardChange(e) {
    const text = e.target.value;
    setReward(text);
  }

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
  const streakRadius = 58;
  const streakCirc = 2 * Math.PI * streakRadius;
  const streakOffset = streakCirc - (completionPercent / 100) * streakCirc;

  const bestDateStr = bestDateObj?.day
    ? `${MONTH_NAMES[month]} ${bestDateObj.day}, ${year}`
    : "";

  return (
    <div className="goal-setup-section">
      <div className="goal-setup-header">
        <div className="goal-setup-title">
          <span>🎯</span>
          <span>Habit Tracker</span>
          <span className="goal-setup-status">
            {saving
              ? "Saving..."
              : saved
                ? "✓ Saved"
                : saveFailed
                  ? "⚠ Save failed"
                  : ""}
          </span>
        </div>
      </div>

      <div className="goal-setup-grid">
        <div className="goal-setup-fields">
          {/* Goal & Target */}
          <div className="goal-setup-row">
            <div className="goal-field" style={{ flex: 2 }}>
              <label className="goal-field-label">What are you trying to achieve?</label>
              <input
                type="text"
                className="goal-field-input"
                placeholder="What are you trying to achieve?"
                value={goal}
                onChange={handleGoalChange}
              />
            </div>
            <div className="goal-field" style={{ flex: 1 }}>
              <label className="goal-field-label">Target Days Done</label>
              <input
                type="text"
                className="goal-field-input"
                placeholder="E.g. 90 Days"
                value={targetDate}
                onChange={handleTargetDateChange}
              />
            </div>
          </div>

          {/* Sacrifice & Reward */}
          <div className="goal-setup-row">
            <div className="goal-field">
              <label className="goal-field-label">My Sacrifice</label>
              <form
                onSubmit={handleAddSacrifice}
                style={{ display: "flex", gap: "8px" }}
              >
                <input
                  type="text"
                  className="goal-field-input"
                  placeholder="What will you sacrifice?"
                  value={newSacrifice}
                  onChange={(e) => setNewSacrifice(e.target.value)}
                />
                <button
                  type="submit"
                  style={{
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    padding: "0 16px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Add
                </button>
              </form>
            </div>
            <div className="goal-field">
              <label className="goal-field-label">My Reward</label>
              <input
                type="text"
                className="goal-field-input"
                placeholder="What's your reward?"
                value={reward}
                onChange={handleRewardChange}
              />
            </div>
          </div>

          {/* Sacrifice Tags */}
          <div className="sacrifice-tags">
            {sacrifices
              .filter((s) => s.trim() !== "")
              .map((sac, index) => (
                <div key={index} className="sacrifice-tag">
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

          {/* Interaction hints */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "11px", color: "var(--text-muted)" }}>
            <span>🖱️ Tap mark as complete</span>
            <span>🖱️ Tap again to mark as missed</span>
            <span>
              <button
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid var(--border)",
                  color: "#fff",
                  padding: "3px 10px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  cursor: "pointer",
                  marginRight: "4px",
                }}
              >
                Clear
              </button>
              Double tap to clear habits
            </span>
          </div>
        </div>

        {/* Streak Ring */}
        <div className="streak-ring-container">
          <div className="streak-ring-wrap">
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle className="streak-pr-bg" cx="70" cy="70" r={streakRadius} />
              <motion.circle
                className="streak-pr-fill"
                cx="70"
                cy="70"
                r={streakRadius}
                strokeDasharray={streakCirc}
                initial={{ strokeDashoffset: streakCirc }}
                animate={{ strokeDashoffset: streakOffset }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
              />
            </svg>
            <div className="streak-pr-text">
              <span className="streak-pr-num">{totalCompleted}</span>
              <span className="streak-pr-pct">{completionPercent}%</span>
            </div>
          </div>
          <div className="streak-label">Best Streak</div>
          {bestDateStr && <div className="streak-date">{bestDateStr}</div>}
        </div>
      </div>
    </div>
  );
}
