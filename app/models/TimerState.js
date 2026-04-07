import mongoose from "mongoose";

const TimerStateSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  habitId: { type: String, required: true },
  remaining: { type: Number, default: 0 },
  isRunning: { type: Boolean, default: false },
  phase: { type: String, enum: ["countdown", "stopwatch"], default: "countdown" },
  stopwatchTime: { type: Number, default: 0 },
  goalReached: { type: Boolean, default: false },
  lastTickAt: { type: Number, default: 0 }, // Date.now() when last saved
  // ── Timestamp-based tracking (for accurate elapsed time across devices) ──
  startedAt: { type: Number, default: 0 },           // epoch ms when timer was last started/resumed
  elapsedBeforePause: { type: Number, default: 0 },   // total seconds accumulated before current run
  totalSeconds: { type: Number, default: 0 },          // target duration so any device can compute progress
  timerDate: { type: String, default: "" },             // "YYYY-MM-DD" — which day this timer belongs to
}, {
  timestamps: true, // adds createdAt and updatedAt
});

TimerStateSchema.index({ userId: 1, habitId: 1 }, { unique: true });

export default mongoose.models.TimerState || mongoose.model("TimerState", TimerStateSchema);
