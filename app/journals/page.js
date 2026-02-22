"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";

export default function JournalsPage() {
  const { user } = useUser();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

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
        <div style={{ marginLeft: "auto" }}>
          <Link href="/" className="journals-topbar-link">
            <span>←</span> <span className="back-text">Back to Tracker</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="journals-grid-container">
        {/* Search bar */}
        <div className="journals-grid-search">
          <div className="search-input-wrapper">
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
          <motion.div
            className="journals-grid"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
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
                <motion.div
                  key={entry._id}
                  className="journals-grid-card"
                  variants={itemVariants}
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
                    <p className="journals-grid-card-content">{preview}</p>
                  </div>

                  {entry.content?.length > 120 && (
                    <button
                      className="journals-grid-card-toggle"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      Read more
                    </button>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Bottom bar / drag indicator */}
      <div className="journals-bottom-bar">
        <div className="journals-bottom-pill" />
      </div>

      {/* Modal overlay */}
      <AnimatePresence>
        {selectedEntry && (
          <motion.div
            className="journal-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedEntry(null)}
          >
            <motion.div
              className="journal-modal-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const d = new Date(selectedEntry.date + "T00:00:00");
                const fullDate = d.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
                const time = selectedEntry.updatedAt
                  ? new Date(selectedEntry.updatedAt).toLocaleTimeString(
                      "en-US",
                      {
                        hour: "numeric",
                        minute: "2-digit",
                      },
                    )
                  : "";
                return (
                  <>
                    <button
                      className="journal-modal-close"
                      onClick={() => setSelectedEntry(null)}
                    >
                      ✕
                    </button>

                    {/* Header */}
                    <div className="journal-modal-header">
                      <div className="journal-modal-user">
                        {avatarUrl && (
                          <img
                            src={avatarUrl}
                            alt=""
                            className="journal-modal-avatar"
                          />
                        )}
                        <span className="journal-modal-username">
                          @{username}
                        </span>
                      </div>
                      <div className="journal-modal-meta">
                        <span className="journal-modal-date">{fullDate}</span>
                        {time && (
                          <span className="journal-modal-time">{time}</span>
                        )}
                      </div>
                    </div>

                    {/* Full content */}
                    <div className="journal-modal-content custom-scrollbar2">
                      {selectedEntry.content}
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
