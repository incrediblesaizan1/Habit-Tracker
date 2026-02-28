import mongoose from "mongoose";

const GoalSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  goal: { type: String, default: "" },
  targetDate: { type: String, default: "" },
  sacrifices: { type: [String], default: [""] }, // start with at least 1 empty row
  updatedAt: { type: Date, default: Date.now },
});

// Ensure a user has only one goal per month/year combination
GoalSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.models.Goal || mongoose.model("Goal", GoalSchema);
