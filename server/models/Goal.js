import mongoose from "mongoose";

const GoalSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  goal: { type: String, default: "" },
  targetDate: { type: String, default: "" },
  sacrifices: { type: [String], default: [""] },
  updatedAt: { type: Date, default: Date.now },
});

GoalSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.models.Goal || mongoose.model("Goal", GoalSchema);
