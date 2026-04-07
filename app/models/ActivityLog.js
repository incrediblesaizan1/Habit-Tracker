import mongoose from "mongoose";

const ActivityLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  action: {
    type: String,
    enum: [
      "habit_checked", "habit_unchecked", "habit_created", "habit_deleted",
      "timer_started", "timer_paused", "timer_reset", "timer_completed",
      "timer_goal_reached", "timer_stopped", "timer_auto_crossed",
    ],
    required: true,
  },
  habitName: { type: String, default: "" },
  detail: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now },
});

ActivityLogSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.models.ActivityLog || mongoose.model("ActivityLog", ActivityLogSchema);
