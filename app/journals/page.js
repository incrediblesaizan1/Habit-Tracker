"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

export default function JournalsPage() {
  const { user } = useUser();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState(null);

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
    const dateStr = new Date(entry.date + "T00:00:00")
      .toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      .toLowerCase();
    return entry.content?.toLowerCase().includes(q) || dateStr.includes(q);
  });

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    );
  }

  const username = user?.username || user?.firstName || "User";
  const avatarUrl = user?.imageUrl;

  return (
    <div className="journals-page-grid">
      {/* Background image */}
      <div className="journals-bg-image" />
      <div className="journals-bg-overlay" />

      {/* Top bar */}
      <header className="journals-topbar">
        <Link href="/" className="journals-topbar-brand">
           <div className="header-left">
            <h1>
              <span className="accent">SK&apos;</span> HABIT{" "}
              <strong>TRACKER</strong>
            </h1>
            <p className="header-subtitle">
              Track your daily habits &amp; build consistency
            </p>
          </div>  
        </Link>
      </header>

      {/* Content */}
      <div className="journals-grid-container">
        {/* Search bar */}
        <div className="journals-grid-search">
         
          <input
            type="text"
            className="journals-grid-search-input"
            placeholder="Search journals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="journals-grid-search-clear"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          )}
        </div>

        {/* Grid of cards */}
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
          <div className="journals-grid">
            {filtered.map((entry) => {
              const d = new Date(entry.date + "T00:00:00");
              const dateLabel = d
                .toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                })
                .toUpperCase();
              const timeLabel = entry.updatedAt
                ? new Date(entry.updatedAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "";
              const preview =
                entry.content?.length > 120
                  ? entry.content.substring(0, 120) + "..."
                  : entry.content;

              return (
                <div
                  key={entry._id}
                  className="journals-grid-card"
                >
                  {/* Card header with user info */}
                  <div className="journals-grid-card-header">
                    <div className="journals-grid-card-user">
                      {avatarUrl && (
                        <img
                          src={avatarUrl}
                          alt=""
                          className="journals-grid-card-avatar"
                        />
                      )}
                      <span className="journals-grid-card-username">
                        @{username}
                      </span>
                    </div>
                    <span className="journals-grid-card-date">
                      {dateLabel}, {timeLabel}
                    </span>
                  </div>

                  {/* Card body */}
                  <div className="journals-grid-card-body">
                    <p className="journals-grid-card-content">
                      {preview}
                    </p>
                  </div>

                  {entry.content?.length > 120 && (
                    <button
                      className="journals-grid-card-toggle"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      Read more
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom bar / drag indicator */}
      <div className="journals-bottom-bar">
        <div className="journals-bottom-pill" />
      </div>

      {/* Modal overlay */}
      {selectedEntry && (() => {
        const d = new Date(selectedEntry.date + "T00:00:00");
        const fullDate = d.toLocaleDateString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        });
        const time = selectedEntry.updatedAt
          ? new Date(selectedEntry.updatedAt).toLocaleTimeString("en-US", {
              hour: "numeric", minute: "2-digit",
            })
          : "";
        return (
          <div className="journal-modal-overlay" onClick={() => setSelectedEntry(null)}>
            <div className="journal-modal-card" onClick={(e) => e.stopPropagation()}>
              {/* Close button */}
              <button className="journal-modal-close" onClick={() => setSelectedEntry(null)}>
                ✕
              </button>

              {/* Header */}
              <div className="journal-modal-header">
                <div className="journal-modal-user">
                  {avatarUrl && (
                    <img src={avatarUrl} alt="" className="journal-modal-avatar" />
                  )}
                  <span className="journal-modal-username">@{username}</span>
                </div>
                <div className="journal-modal-meta">
                  <span className="journal-modal-date">{fullDate}</span>
                  {time && <span className="journal-modal-time">{time}</span>}
                </div>
              </div>

              {/* Full content */}
              <div className="journal-modal-content custom-scrollbar2">
                {selectedEntry.content}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
