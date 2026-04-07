import mongoose from "mongoose";

const TimerHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  habitName: { type: String, required: true },
  targetDuration: { type: Number, default: 0 },  // seconds
  actualTime: { type: Number, default: 0 },       // seconds
  status: { type: String, enum: ["completed", "partial", "exceeded", "crossed", "incomplete"], default: "partial" },
  isOpenEnded: { type: Boolean, default: false },
  extraTime: { type: Number, default: 0 },         // stopwatch overshoot seconds
  timestamp: { type: Date, default: Date.now },
});

TimerHistorySchema.index({ userId: 1, timestamp: -1 });

export default mongoose.models.TimerHistory || mongoose.model("TimerHistory", TimerHistorySchema);
