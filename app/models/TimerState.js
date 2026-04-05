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
}, {
  timestamps: true, // adds createdAt and updatedAt
});

TimerStateSchema.index({ userId: 1, habitId: 1 }, { unique: true });

export default mongoose.models.TimerState || mongoose.model("TimerState", TimerStateSchema);
