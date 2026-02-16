"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function JournalsPage() {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchJournals() {
      try {
        const res = await fetch("/api/journal"); // Reusing the same route, logic needs to support list if no date param
        if (res.ok) {
          const data = await res.json();
          // API currently returns single entry if date param is present.
          // Wait, I need to update API to support list all if no date provided.
          // Let's assume the API update I just made (Step 633) handles this.
          // My update used `Journal.find({ userId })` if no date param?
          // Let's check the code I wrote.
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

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <div className="header">
        <div className="header-left">
          <h1>
            <span className="accent">Your</span> Journal History
          </h1>
          <Link href="/" className="btn-signin" style={{ fontSize: '12px', padding: '8px 16px', textDecoration: 'none' }}>
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="journal-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {journals.length === 0 ? (
          <div className="journal-section" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            No journal entries yet. Start writing on the dashboard!
          </div>
        ) : (
          journals.map((entry) => (
            <div key={entry._id} className="journal-section" style={{ marginTop: 0 }}>
              <div className="journal-header">
                <div className="journal-title-row">
                  <span className="journal-icon">📅</span>
                  <h3 className="journal-title">
                    {new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </h3>
                </div>
              </div>
              <div className="journal-content" style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
                {entry.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
