"use client";
import { useState } from "react";

export default function AddHabitModal({ onAdd, onClose }) {
  const [name, setName] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim());
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Add New Habit</h2>
        <form onSubmit={handleSubmit}>
          <div className="modal-field">
            <label htmlFor="habit-name">Habit Name</label>
            <input
              id="habit-name"
              type="text"
              placeholder="e.g. Read 30 minutes"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-save">
              Add Habit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
