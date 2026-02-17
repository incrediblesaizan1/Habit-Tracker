"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

export default function JournalDetailPage() {
  const { id } = useParams();
  const { user } = useUser();
  const [journal, setJournal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJournal() {
      try {
        const res = await fetch(`/api/journal/${id}`);
        if (res.ok) {
          const data = await res.json();
          setJournal(data);
        }
      } catch (err) {
        console.error("Failed to fetch journal:", err);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchJournal();
  }, [id]);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!journal) {
    return (
      <div className="journals-page-grid">
        <div className="journals-bg-image" />
        <div className="journals-bg-overlay" />
        <div className="journal-detail-wrapper">
          <div className="journal-detail-card">
            <h2 style={{ marginBottom: 12 }}>Journal not found</h2>
            <Link href="/journals" className="journal-detail-back">
              ← Back to Journals
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const d = new Date(journal.date + "T00:00:00");
  const dateLabel = d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeLabel = journal.updatedAt
    ? new Date(journal.updatedAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  const username = user?.username || user?.firstName || "User";
  const avatarUrl = user?.imageUrl;

  return (
    <div className="journals-page-grid">
      <div className="journals-bg-image" />
      <div className="journals-bg-overlay" />

      <div className="journal-detail-wrapper">
        <Link href="/journals" className="journal-detail-back">
          ← Back to Journals
        </Link>

        <div className="journal-detail-card">
          {/* Header */}
          <div className="journal-detail-header">
            <div className="journal-detail-user">
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt=""
                  className="journal-detail-avatar"
                />
              )}
              <span className="journal-detail-username">@{username}</span>
            </div>
            <div className="journal-detail-meta">
              <span className="journal-detail-date">{dateLabel}</span>
              {timeLabel && (
                <span className="journal-detail-time">{timeLabel}</span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="journal-detail-content">{journal.content}</div>
        </div>
      </div>
    </div>
  );
}
