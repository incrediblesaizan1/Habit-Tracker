import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";

export default function DailyJournal() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
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

  // Auto-save with debounce
  const saveEntry = useCallback(
    async (text) => {
      setSaving(false);
      setSaved(true);

      try {
        await fetch("/api/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: selectedDate, content: text }),
        });
      } catch (err) {
        console.error("Failed to save journal:", err);
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

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => saveEntry(text), 800);
  }

  const dateLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" },
  );

  return (
    <div className="journal-section" style={{ marginTop: "0" }}>
      <div className="journal-header">
        <div className="journal-title-row">
          <span className="journal-icon">📝</span>
          <h3 className="journal-title">Daily Journal</h3>
          <span className="journal-status">
            {saving
              ? "Saving..."
              : saved
                ? "✓ Saved"
                : saveFailed
                  ? "⚠ Save failed"
                  : ""}
          </span>
          <Link
            to="/journals"
            className="journal-history-link"
            style={{
              marginLeft: "auto",
              fontSize: "11px",
              color: "var(--text-muted)",
              textDecoration: "none",
            }}
          >
            View History →
          </Link>
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
