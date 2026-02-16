import mongoose from "mongoose";

const CompletionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  habitId: { type: mongoose.Schema.Types.ObjectId, ref: "Habit", required: true },
  monthKey: { type: String, required: true }, // "YYYY-MM"
  days: { type: [Number], default: [] },
});

CompletionSchema.index({ userId: 1, habitId: 1, monthKey: 1 }, { unique: true });

export default mongoose.models.Completion || mongoose.model("Completion", CompletionSchema);
