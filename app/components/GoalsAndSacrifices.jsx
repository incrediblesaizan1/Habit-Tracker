"use client";
import { useState, useEffect, useCallback, useRef } from "react";

export default function GoalsAndSacrifices() {
  const [goal, setGoal] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [sacrifices, setSacrifices] = useState([""]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const saveTimeout = useRef(null);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/goals`);
        if (res.ok) {
          const data = await res.json();
          setGoal(data.goal || "");
          setTargetDate(data.targetDate || "");
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

  // Auto-save with debounce
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

  return (
    <div
      className="journal-section"
      style={{
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="journal-header" style={{ marginBottom: "16px" }}>
        <div className="journal-title-row">
          <span className="journal-icon">🎯</span>
          <h3 className="journal-title">Goal Focus</h3>
          <span
            className="journal-status"
            style={{ marginLeft: "12px", fontSize: "12px" }}
          >
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

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          flexGrow: 1,
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: "16px" }}>
          <div style={{ flex: 2 }}>
            <div className="journal-date-label" style={{ marginBottom: "6px" }}>
              My Goal
            </div>
            <input
              type="text"
              placeholder="What are you trying to achieve?"
              value={goal}
              onChange={handleGoalChange}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                border: "2px solid rgba(255, 255, 255, 0.05)",
                outline: "none",
                background: "rgba(10, 15, 30, 0.5)",
                color: "var(--text-primary)",
                fontSize: "14px",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255, 255, 255, 0.05)")
              }
            />
          </div>
          <div style={{ flex: 1 }}>
            <div className="journal-date-label" style={{ marginBottom: "6px" }}>
              Target Date / Days
            </div>
            <input
              type="text"
              placeholder="E.g. 90 Days or Oct 20"
              value={targetDate}
              onChange={handleTargetDateChange}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                border: "2px solid rgba(255, 255, 255, 0.05)",
                outline: "none",
                background: "rgba(10, 15, 30, 0.5)",
                color: "var(--text-primary)",
                fontSize: "14px",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255, 255, 255, 0.05)")
              }
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
          <div className="journal-date-label" style={{ marginBottom: "8px" }}>
            My Sacrifices
          </div>

          <form
            onSubmit={handleAddSacrifice}
            style={{ display: "flex", gap: "8px", marginBottom: "12px" }}
          >
            <input
              type="text"
              placeholder="What will you sacrifice to achieve this?"
              value={newSacrifice}
              onChange={(e) => setNewSacrifice(e.target.value)}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                background: "rgba(10, 15, 30, 0.5)",
                color: "var(--text-primary)",
                fontSize: "13px",
              }}
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
              }}
            >
              Add
            </button>
          </form>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              alignItems: "flex-start",
            }}
          >
            {sacrifices
              .filter((s) => s.trim() !== "")
              .map((sac, index) => (
                <div
                  key={index}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    background: "rgba(20, 184, 166, 0.1)",
                    border: "1px solid rgba(20, 184, 166, 0.3)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                  }}
                >
                  <span>{sac}</span>
                  <button
                    onClick={() => removeSacrifice(index)}
                    title="Remove"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "16px",
                      padding: "0 2px",
                      lineHeight: "1",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.color = "var(--accent)")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.color = "var(--text-muted)")
                    }
                  >
                    &times;
                  </button>
                </div>
              ))}
            {sacrifices.filter((s) => s.trim() !== "").length === 0 && (
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                  marginTop: "4px",
                }}
              >
                No sacrifices added yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
