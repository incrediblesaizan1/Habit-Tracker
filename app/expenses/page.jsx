"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES_EXPENSE = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Other",
];
const CATEGORIES_INCOME = [
  "Salary",
  "Freelance",
  "Investment",
  "Gift",
  "Other",
];

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function ExpensesPage() {
  const { user } = useUser();
  const now = new Date();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goalAmount, setGoalAmount] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [editingBalance, setEditingBalance] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");
  const [goalInput, setGoalInput] = useState("");

  // Form state
  const [formType, setFormType] = useState("expense");
  const [formAmount, setFormAmount] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("Other");
  const [submitting, setSubmitting] = useState(false);

  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

  // Fetch transactions
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [txRes, goalRes] = await Promise.all([
          fetch(`/api/expenses?month=${viewMonth}&year=${viewYear}`),
          fetch("/api/earning-goal"),
        ]);
        if (txRes.ok) {
          const data = await txRes.json();
          setTransactions(Array.isArray(data) ? data : []);
        }
        if (goalRes.ok) {
          const g = await goalRes.json();
          setGoalAmount(g.goalAmount || 0);
          setCurrentBalance(g.currentBalance || 0);
        }
      } catch (err) {
        console.error("Failed to fetch expense data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [viewMonth, viewYear]);

  // Computed summaries
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const spentToday = useMemo(() => {
    return transactions
      .filter((t) => t.type === "expense" && new Date(t.date).toISOString().slice(0, 10) === todayStr)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, todayStr]);

  const spentThisMonth = useMemo(() => {
    return transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const earnedToday = useMemo(() => {
    return transactions
      .filter((t) => t.type === "income" && new Date(t.date).toISOString().slice(0, 10) === todayStr)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, todayStr]);

  const earnedThisMonth = useMemo(() => {
    return transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const goalPercent = goalAmount > 0 ? Math.min((earnedThisMonth / goalAmount) * 100, 100) : 0;

  // Handlers
  async function handleAddTransaction(e) {
    e.preventDefault();
    if (!formAmount || !formDesc.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formType,
          amount: parseFloat(formAmount),
          description: formDesc.trim(),
          category: formCategory,
        }),
      });
      if (res.ok) {
        const newTx = await res.json();
        setTransactions((prev) => [newTx, ...prev]);

        const amt = parseFloat(formAmount);
        const newBalance = formType === "expense" ? currentBalance - amt : currentBalance + amt;
        setCurrentBalance(newBalance);

        fetch("/api/earning-goal", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentBalance: newBalance }),
        }).catch((err) => console.error("Failed to update balance:", err));

        setFormAmount("");
        setFormDesc("");
        setFormCategory("Other");
      }
    } catch (err) {
      console.error("Failed to add transaction:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      const txToDelete = transactions.find((t) => t.id === id);
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTransactions((prev) => prev.filter((t) => t.id !== id));

        if (txToDelete) {
          const newBalance = txToDelete.type === "expense" 
            ? currentBalance + txToDelete.amount 
            : currentBalance - txToDelete.amount;
          setCurrentBalance(newBalance);
          
          fetch("/api/earning-goal", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentBalance: newBalance }),
          }).catch((err) => console.error("Failed to update balance:", err));
        }
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }

  async function handleSaveBalance() {
    const val = parseFloat(balanceInput);
    if (isNaN(val)) return;
    setCurrentBalance(val);
    setEditingBalance(false);
    await fetch("/api/earning-goal", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentBalance: val }),
    });
  }

  async function handleSaveGoal() {
    const val = parseFloat(goalInput);
    if (isNaN(val)) return;
    setGoalAmount(val);
    setEditingGoal(false);
    await fetch("/api/earning-goal", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalAmount: val }),
    });
  }

  // Progress ring
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (goalPercent / 100) * circumference;

  const categories = formType === "expense" ? CATEGORIES_EXPENSE : CATEGORIES_INCOME;

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="expense-page">
      {/* Top bar */}
      <header className="journals-topbar">
        <Link href="/" className="journals-topbar-brand">
          <div className="header-left">
            <h1>
              <span className="accent">SK&apos;</span> HABIT{" "}
              <strong>TRACKER</strong>
            </h1>
            <p className="header-subtitle">Track your expenses &amp; earnings</p>
          </div>
        </Link>
        <div style={{ marginLeft: "auto" }}>
          <Link href="/" className="journals-topbar-link">
            <span>←</span> <span className="back-text">Back to Tracker</span>
          </Link>
        </div>
      </header>

      {/* Month / Year selector */}
      <div className="expense-month-bar">
        <select value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))}>
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))}>
          {MONTH_NAMES.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>
      </div>

      {/* Month Title */}
      <div className="expense-month-title">
        {MONTH_NAMES[viewMonth]} {viewYear}
      </div>

      {/* Summary Cards */}
      <div className="expense-summary-grid">
        {/* Current Balance */}
        <motion.div
          className="expense-summary-card balance-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="expense-card-icon">💰</div>
          <div className="expense-card-label">Current Balance</div>
          {editingBalance ? (
            <div className="expense-card-edit">
              <input
                type="number"
                className="expense-inline-input"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveBalance()}
                autoFocus
              />
              <button className="expense-save-btn" onClick={handleSaveBalance}>✓</button>
              <button className="expense-cancel-btn" onClick={() => setEditingBalance(false)}>✕</button>
            </div>
          ) : (
            <div
              className="expense-card-value balance-val"
              onClick={() => { setBalanceInput(String(currentBalance)); setEditingBalance(true); }}
              title="Click to edit"
            >
              ₹{currentBalance.toLocaleString("en-IN")}
            </div>
          )}
        </motion.div>

        {/* Spent Today */}
        <motion.div
          className="expense-summary-card spent-today-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="expense-card-icon">📉</div>
          <div className="expense-card-label">Spent Today</div>
          <div className="expense-card-value red">₹{spentToday.toLocaleString("en-IN")}</div>
        </motion.div>

        {/* Spent This Month */}
        <motion.div
          className="expense-summary-card spent-month-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="expense-card-icon">📊</div>
          <div className="expense-card-label">Spent This Month</div>
          <div className="expense-card-value red">₹{spentThisMonth.toLocaleString("en-IN")}</div>
        </motion.div>

        {/* Earned Today */}
        <motion.div
          className="expense-summary-card earned-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="expense-card-icon">💵</div>
          <div className="expense-card-label">Earned Today</div>
          <div className="expense-card-value green">₹{earnedToday.toLocaleString("en-IN")}</div>
        </motion.div>
      </div>

      {/* Two-column: Earning Goal + Add Transaction */}
      <div className="expense-two-col">
        {/* Earning Goal */}
        <motion.div
          className="expense-goal-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="expense-goal-header">
            <h3>Earning Goal</h3>
            <span className="expense-goal-month">{MONTH_NAMES[viewMonth]}</span>
          </div>
          <div className="expense-goal-body">
            <div className="expense-goal-ring-wrap">
              <svg width="130" height="130" viewBox="0 0 130 130">
                <circle className="expense-ring-bg" cx="65" cy="65" r={radius} />
                <motion.circle
                  className="expense-ring-fill"
                  cx="65"
                  cy="65"
                  r={radius}
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </svg>
              <div className="expense-ring-text">
                <span className="expense-ring-pct">{Math.round(goalPercent)}%</span>
                <span className="expense-ring-sub">earned</span>
              </div>
            </div>
            <div className="expense-goal-details">
              <div className="expense-goal-row">
                <span className="expense-goal-lbl">Earned this month</span>
                <span className="expense-goal-val green">₹{earnedThisMonth.toLocaleString("en-IN")}</span>
              </div>
              <div className="expense-goal-row">
                <span className="expense-goal-lbl">Goal</span>
                {editingGoal ? (
                  <div className="expense-card-edit inline-edit">
                    <input
                      type="number"
                      className="expense-inline-input sm"
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveGoal()}
                      autoFocus
                    />
                    <button className="expense-save-btn" onClick={handleSaveGoal}>✓</button>
                    <button className="expense-cancel-btn" onClick={() => setEditingGoal(false)}>✕</button>
                  </div>
                ) : (
                  <span
                    className="expense-goal-val editable"
                    onClick={() => { setGoalInput(String(goalAmount)); setEditingGoal(true); }}
                    title="Click to edit goal"
                  >
                    ₹{goalAmount.toLocaleString("en-IN")} ✎
                  </span>
                )}
              </div>
              <div className="expense-goal-row">
                <span className="expense-goal-lbl">Remaining</span>
                <span className="expense-goal-val">
                  ₹{Math.max(goalAmount - earnedThisMonth, 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Add Transaction Form */}
        <motion.div
          className="expense-form-card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h3>Add Transaction</h3>
          <form onSubmit={handleAddTransaction}>
            {/* Type toggle */}
            <div className="expense-type-toggle">
              <button
                type="button"
                className={`expense-type-btn ${formType === "expense" ? "active-expense" : ""}`}
                onClick={() => { setFormType("expense"); setFormCategory("Other"); }}
              >
                Expense
              </button>
              <button
                type="button"
                className={`expense-type-btn ${formType === "income" ? "active-income" : ""}`}
                onClick={() => { setFormType("income"); setFormCategory("Other"); }}
              >
                Income
              </button>
            </div>
            <div className="expense-form-fields">
              <input
                type="number"
                placeholder="Amount (₹)"
                className="expense-input"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                required
                min="0"
                step="0.01"
              />
              <input
                type="text"
                placeholder="Description"
                className="expense-input"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                required
              />
              <select
                className="expense-input"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                type="submit"
                className="expense-submit-btn"
                disabled={submitting}
              >
                {submitting ? "Adding..." : `Add ${formType === "expense" ? "Expense" : "Income"}`}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Transactions List */}
      <div className="expense-transactions-section">
        <h3 className="expense-tx-title">
          Recent Transactions
          <span className="expense-tx-count">{transactions.length}</span>
        </h3>
        {transactions.length === 0 ? (
          <div className="expense-empty">
            <div className="expense-empty-icon">📝</div>
            <p>No transactions yet for {MONTH_NAMES[viewMonth]} {viewYear}</p>
          </div>
        ) : (
          <motion.div
            className="expense-tx-list"
            initial="hidden"
            animate="show"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }}
          >
            <AnimatePresence>
              {transactions.map((tx) => {
                const d = new Date(tx.date);
                const dateLabel = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
                const timeLabel = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                return (
                  <motion.div
                    key={tx.id}
                    className={`expense-tx-item ${tx.type}`}
                    variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                    exit={{ opacity: 0, x: 20 }}
                    layout
                  >
                    <div className={`expense-tx-indicator ${tx.type}`} />
                    <div className="expense-tx-info">
                      <div className="expense-tx-desc">{tx.description}</div>
                      <div className="expense-tx-meta">
                        <span className="expense-tx-cat">{tx.category}</span>
                        <span className="expense-tx-dot">·</span>
                        <span>{dateLabel}, {timeLabel}</span>
                      </div>
                    </div>
                    <div className={`expense-tx-amount ${tx.type}`}>
                      {tx.type === "income" ? "+" : "−"}₹{tx.amount.toLocaleString("en-IN")}
                    </div>
                    <button
                      className="expense-tx-del"
                      onClick={() => handleDelete(tx.id)}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
