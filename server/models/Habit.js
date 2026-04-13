import mongoose from "mongoose";

const HabitSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Habit || mongoose.model("Habit", HabitSchema);
