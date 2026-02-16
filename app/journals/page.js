"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function JournalsPage() {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    async function fetchJournals() {
      try {
        const res = await fetch("/api/journal");
        if (res.ok) {
          const data = await res.json();
          setJournals(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to fetch journals:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchJournals();
  }, []);

  const filtered = journals.filter((entry) => {
    if (!entry.content || !entry.content.trim()) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const dateStr = new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    }).toLowerCase();
    return (
      entry.content?.toLowerCase().includes(q) || dateStr.includes(q)
    );
  });

  // Group journals by month
  const grouped = filtered.reduce((acc, entry) => {
    const d = new Date(entry.date + "T00:00:00");
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    if (!acc[key]) acc[key] = { label, entries: [] };
    acc[key].entries.push(entry);
    return acc;
  }, {});

  const groupKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="journals-page">
      {/* Floating background orbs */}
      <div className="journals-bg-orb journals-bg-orb-1" />
      <div className="journals-bg-orb journals-bg-orb-2" />

      <div className="journals-container">
        {/* Header */}
        <header className="journals-hero">
          <Link href="/" className="journals-back-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Dashboard
          </Link>
          <div className="journals-hero-text">
            <h1 className="journals-hero-title">
              <span className="journals-hero-icon">📖</span>
              Your <span className="journals-accent">Journal</span> History
            </h1>
            <p className="journals-hero-subtitle">
              {journals.length} {journals.length === 1 ? "entry" : "entries"} written — keep reflecting, keep growing
            </p>
          </div>
        </header>

        {/* Search bar */}
        <div className="journals-search-wrapper">
          <svg className="journals-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            className="journals-search-input"
            placeholder="Search your journals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="journals-search-clear" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>

        {/* Journal entries */}
        {filtered.length === 0 ? (
          <div className="journals-empty">
            <div className="journals-empty-icon">📝</div>
            <h3 className="journals-empty-title">
              {searchQuery ? "No matching entries" : "No journal entries yet"}
            </h3>
            <p className="journals-empty-text">
              {searchQuery
                ? "Try a different search term"
                : "Start writing on the dashboard to see your entries here"}
            </p>
            {!searchQuery && (
              <Link href="/" className="journals-empty-cta">
                Go to Dashboard →
              </Link>
            )}
          </div>
        ) : (
          <div className="journals-timeline">
            {groupKeys.map((key) => {
              const group = grouped[key];
              return (
                <div key={key} className="journals-month-group">
                  <div className="journals-month-header">
                    <div className="journals-month-line" />
                    <span className="journals-month-label">{group.label}</span>
                    <span className="journals-month-count">
                      {group.entries.length} {group.entries.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>

                  <div className="journals-entries">
                    {group.entries.map((entry) => {
                      const d = new Date(entry.date + "T00:00:00");
                      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
                      const dayNum = d.getDate();
                      const isExpanded = expandedId === entry._id;
                      const preview = entry.content?.length > 180
                        ? entry.content.substring(0, 180) + "..."
                        : entry.content;

                      return (
                        <div
                          key={entry._id}
                          className={`journals-entry-card ${isExpanded ? "expanded" : ""}`}
                          onClick={() => setExpandedId(isExpanded ? null : entry._id)}
                        >
                          <div className="journals-entry-date-badge">
                            <span className="journals-entry-day-name">{dayName}</span>
                            <span className="journals-entry-day-num">{dayNum}</span>
                          </div>
                          <div className="journals-entry-body">
                            <div className="journals-entry-header">
                              <span className="journals-entry-full-date">
                                {d.toLocaleDateString("en-US", {
                                  weekday: "long", month: "long", day: "numeric", year: "numeric",
                                })}
                              </span>
                              <span className="journals-entry-time">
                                {entry.updatedAt
                                  ? new Date(entry.updatedAt).toLocaleTimeString("en-US", {
                                      hour: "numeric", minute: "2-digit",
                                    })
                                  : ""}
                              </span>
                            </div>
                            <div className="journals-entry-content">
                              {isExpanded ? entry.content : preview}
                            </div>
                            {entry.content?.length > 180 && (
                              <button className="journals-entry-toggle">
                                {isExpanded ? "Show less" : "Read more"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
