"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

/* ─── Small Add Modal ─── */
function AddModal({ title, placeholder, onAdd, onClose }) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    onAdd(value.trim());
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-card-solid)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", padding: "24px", width: "360px",
          maxWidth: "90vw", boxShadow: "var(--shadow-lg)",
          animation: "slideUp 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#fff", marginBottom: "14px" }}>
          {title}
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="goal-field-input"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ marginBottom: "14px" }}
          />
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)",
                color: "var(--text-secondary)", padding: "7px 16px",
                borderRadius: "var(--radius-xs)", fontSize: "12px",
                fontWeight: "600", cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                background: "var(--accent)", color: "#fff", border: "none",
                padding: "7px 18px", borderRadius: "var(--radius-xs)",
                fontSize: "12px", fontWeight: "600", cursor: "pointer",
              }}
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
  const [sacrifices, setSacrifices] = useState([""]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const saveTimeout = useRef(null);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showSacrificeModal, setShowSacrificeModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/goals`);
        if (res.ok) {
          const data = await res.json();
          setGoal(data.goal || "");
          setTargetDate(data.targetDate || "");
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
        setSaved(false); setSaving(false); setSaveFailed(true);
      }
    },
    [],
  );

  function triggerSave(newGoal, newTargetDate, newSacrifices) {
    setSaved(false); setSaveFailed(false);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(
      () => saveData(newGoal, newTargetDate, newSacrifices), 800,
    );
  }

  function handleAddGoal(text) {
    setGoal(text);
    triggerSave(text, targetDate, sacrifices);
  }

  function handleAddSacrifice(text) {
    let newSacs;
    if (sacrifices.length === 1 && sacrifices[0] === "") {
      newSacs = [text];
    } else {
      newSacs = [...sacrifices, text];
    }
    setSacrifices(newSacs);
    triggerSave(goal, targetDate, newSacs);
  }

  function removeSacrifice(index) {
    let newSacs = sacrifices.filter((_, i) => i !== index);
    if (newSacs.length === 0) newSacs = [""];
    setSacrifices(newSacs);
    triggerSave(goal, targetDate, newSacs);
  }

  function removeGoal() {
    setGoal("");
    triggerSave("", targetDate, sacrifices);
  }

  // Streak ring
  const streakRadius = 52;
  const streakCirc = 2 * Math.PI * streakRadius;
  const streakOffset = streakCirc - (completionPercent / 100) * streakCirc;

  const bestDateStr = bestDateObj?.day
    ? `${MONTH_NAMES[month]} ${bestDateObj.day}, ${year}`
    : "";

  // Target days parsing
  const targetNum = parseInt(targetDate) || 0;
  const effectiveDays = habits.length > 0
    ? Math.round(totalCompleted / habits.length)
    : 0;
  const targetProgress = targetNum > 0 ? Math.min(100, Math.round((effectiveDays / targetNum) * 100)) : 0;

  return (
    <div className="goal-setup-section" style={{ marginBottom: 0 }}>
      <div className="goal-setup-title" style={{ marginBottom: "16px" }}>
        <span>🎯</span>
        <span>Goal Setup</span>
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
              cx="60" cy="60" r={streakRadius}
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

      {/* ─── My Goal (Card) ─── */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <span className="goal-field-label" style={{ marginBottom: 0 }}>My Goal</span>
          <button
            onClick={() => setShowGoalModal(true)}
            title="Set Goal"
            style={{
              width: "26px", height: "26px", borderRadius: "50%",
              background: "var(--accent)", border: "none", color: "#fff",
              fontSize: "16px", fontWeight: "700", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              lineHeight: 1, transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 0 12px var(--accent-glow)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            +
          </button>
        </div>
        {goal ? (
          <div
            style={{
              background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)",
              borderRadius: "var(--radius-sm)", padding: "14px 16px",
              display: "flex", alignItems: "flex-start", gap: "10px",
              minHeight: "60px",
            }}
          >
            <span style={{ fontSize: "14px", color: "#fff", flex: 1, lineHeight: "1.5" }}>{goal}</span>
            <button
              onClick={removeGoal}
              style={{
                background: "none", border: "none", color: "var(--text-muted)",
                cursor: "pointer", fontSize: "16px", padding: "0 2px", lineHeight: 1,
                flexShrink: 0, transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.color = "var(--red)")}
              onMouseLeave={(e) => (e.target.style.color = "var(--text-muted)")}
              title="Remove goal"
            >
              ×
            </button>
          </div>
        ) : (
          <div
            onClick={() => setShowGoalModal(true)}
            style={{
              background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)",
              borderRadius: "var(--radius-sm)", padding: "14px 16px",
              minHeight: "60px", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "border-color 0.2s, background 0.2s",
              color: "var(--text-muted)", fontSize: "12px",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(20,184,166,0.3)"; e.currentTarget.style.background = "rgba(20,184,166,0.04)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
          >
            Click + to set your goal
          </div>
        )}
      </div>

      {/* ─── Target Days ─── */}
      <div style={{ marginBottom: "12px" }}>
        <span className="goal-field-label">Target Days</span>
        <div style={{
          background: "rgba(10,15,30,0.6)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)", padding: "12px 14px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <input
              type="number"
              min="1"
              className="goal-field-input"
              placeholder="90"
              value={targetDate}
              onChange={(e) => { setTargetDate(e.target.value); triggerSave(goal, e.target.value, sacrifices); }}
              style={{ width: "70px", textAlign: "center", padding: "6px 8px", fontSize: "16px", fontWeight: "700" }}
            />
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>days</span>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--accent)" }}>{effectiveDays}</div>
              <div style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>done</div>
            </div>
          </div>
          {targetNum > 0 && (
            <div style={{ position: "relative" }}>
              <div style={{
                height: "6px", background: "rgba(255,255,255,0.06)",
                borderRadius: "3px", overflow: "hidden",
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${targetProgress}%` }}
                  transition={{ duration: 0.8 }}
                  style={{
                    height: "100%", borderRadius: "3px",
                    background: targetProgress >= 100 ? "var(--green)" : "var(--accent)",
                  }}
                />
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px", textAlign: "right" }}>
                {targetProgress}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── My Sacrifices (Tags) ─── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <span className="goal-field-label" style={{ marginBottom: 0 }}>My Sacrifices</span>
          <button
            onClick={() => setShowSacrificeModal(true)}
            title="Add Sacrifice"
            style={{
              width: "26px", height: "26px", borderRadius: "50%",
              background: "var(--accent)", border: "none", color: "#fff",
              fontSize: "16px", fontWeight: "700", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              lineHeight: 1, transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 0 12px var(--accent-glow)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            +
          </button>
        </div>
        <div className="sacrifice-tags">
          {sacrifices.filter((s) => s.trim() !== "").map((sac, index) => (
            <div key={index} className="sacrifice-tag" style={{ fontSize: "11px", padding: "5px 10px" }}>
              <span>{sac}</span>
              <button
                onClick={() => removeSacrifice(index)}
                className="sacrifice-tag-remove"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
          {sacrifices.filter((s) => s.trim() !== "").length === 0 && (
            <div
              onClick={() => setShowSacrificeModal(true)}
              style={{
                fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic",
                cursor: "pointer", padding: "4px 0",
              }}
            >
              Click + to add sacrifices
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showGoalModal && (
        <AddModal
          title="Set Your Goal"
          placeholder="What are you trying to achieve?"
          onAdd={handleAddGoal}
          onClose={() => setShowGoalModal(false)}
        />
      )}
      {showSacrificeModal && (
        <AddModal
          title="Add a Sacrifice"
          placeholder="What will you sacrifice to achieve this?"
          onAdd={handleAddSacrifice}
          onClose={() => setShowSacrificeModal(false)}
        />
      )}
    </div>
  );
}
