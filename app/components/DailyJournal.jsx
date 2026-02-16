"use client";
import { useState, useEffect, useCallback, useRef } from "react";

export default function DailyJournal() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(
    today.toISOString().split("T")[0]
  );
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimeout = useRef(null);

  // Fetch journal entry for selected date
  useEffect(() => {
    async function fetchEntry() {
      try {
        const res = await fetch(`/api/journal?date=${selectedDate}`);
        if (res.ok) {
          const data = await res.json();
          setContent(data.content || "");
          setSaved(false);
        }
      } catch (err) {
        console.error("Failed to fetch journal:", err);
      }
    }
    fetchEntry();
  }, [selectedDate]);

  // Auto-save with debounce
  const saveEntry = useCallback(
    async (text) => {
      setSaving(true);
      try {
        await fetch("/api/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: selectedDate, content: text }),
        });
        setSaved(true);
      } catch (err) {
        console.error("Failed to save journal:", err);
      } finally {
        setSaving(false);
      }
    },
    [selectedDate]
  );

  function handleChange(e) {
    const text = e.target.value;
    setContent(text);
    setSaved(false);

    // Debounced auto-save
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => saveEntry(text), 800);
  }

  const dateLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <div className="journal-section">
      <div className="journal-header">
        <div className="journal-title-row">
          <span className="journal-icon">📝</span>
          <h3 className="journal-title">Daily Journal</h3>
          <span className="journal-status">
            {saving ? "Saving..." : saved ? "✓ Saved" : ""}
          </span>
        </div>
        <div className="journal-date-picker">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="journal-date-input"
          />
        </div>
      </div>
      <div className="journal-date-label">{dateLabel}</div>
      <textarea
        className="journal-textarea"
        placeholder="How was your day? Write about your experiences, reflections, wins, and learnings..."
        value={content}
        onChange={handleChange}
        rows={6}
      />
    </div>
  );
}
