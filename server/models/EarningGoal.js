import mongoose from "mongoose";

const EarningGoalSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  goalAmount: { type: Number, default: 0 },
  currentBalance: { type: Number, default: 0 },
});

export default mongoose.models.EarningGoal || mongoose.model("EarningGoal", EarningGoalSchema);
