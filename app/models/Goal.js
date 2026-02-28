import mongoose from "mongoose";

const GoalSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  goal: { type: String, default: "" },
  targetDate: { type: String, default: "" },
  sacrifices: { type: [String], default: [""] }, // start with at least 1 empty row
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Goal || mongoose.model("Goal", GoalSchema);
