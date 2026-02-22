"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

export default function DailyJournal() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(
    today.toISOString().split("T")[0],
  );
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
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

  // Auto-save with debounce — optimistic: show "Saved" instantly
  const saveEntry = useCallback(
    async (text) => {
      // Optimistic: mark as saved immediately so user sees instant feedback
      setSaving(false);
      setSaved(true);

      // Sync with API in background
      try {
        await fetch("/api/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: selectedDate, content: text }),
        });
      } catch (err) {
        console.error("Failed to save journal:", err);
        // Show failure state so user knows to retry
        setSaved(false);
        setSaving(false);
        setSaveFailed(true);
      }
    },
    [selectedDate],
  );

  function handleChange(e) {
    const text = e.target.value;
    setContent(text);
    setSaved(false);
    setSaveFailed(false);

    // Debounced auto-save
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => saveEntry(text), 800);
  }

  const dateLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" },
  );

  return (
    <div className="journal-section" style={{ marginTop: "16px" }}>
      <div
        className="journal-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div
          className="journal-title-row"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <span className="journal-icon">📝</span>
          <h3 className="journal-title">Daily Journal</h3>
          <Link
            href="/journals"
            className="journal-history-link"
            style={{
              marginLeft: "12px",
              fontSize: "12px",
              color: "var(--text-muted)",
              textDecoration: "none",
            }}
          >
            View History →
          </Link>
          <span className="journal-status" style={{ marginLeft: "12px" }}>
            {saving
              ? "Saving..."
              : saved
                ? "✓ Saved"
                : saveFailed
                  ? "⚠ Save failed"
                  : ""}
          </span>
        </div>
        <div
          className="journal-date-picker"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255, 255, 255, 0.05)",
            padding: "6px 12px",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: "bold" }}>
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "numeric",
            })}
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="journal-date-input"
            style={{ padding: 0, border: "none", background: "transparent" }}
          />
        </div>
      </div>
      <div className="journal-date-label" style={{ marginBottom: "12px" }}>
        {dateLabel}
      </div>
      <textarea
        className="journal-textarea custom-scrollbar2"
        placeholder="How was your day? Write about your experiences, reflections, wins, and learnings..."
        value={content}
        onChange={handleChange}
        rows={6}
      />
      <div
        className="journal-footer"
        style={{
          marginTop: "12px",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={() => saveEntry(content)}
          disabled={saving}
          className="btn-save-journal"
          style={{
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            fontSize: "13px",
            fontWeight: "600",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
            transition: "all 0.2s",
          }}
        >
          {saving ? "Saving..." : "Save Entry"}
        </button>
      </div>
    </div>
  );
}
