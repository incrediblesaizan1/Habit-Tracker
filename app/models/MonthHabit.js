import mongoose from "mongoose";

const MonthHabitSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  monthKey: { type: String, required: true }, // "YYYY-MM"
  habits: [
    {
      habitId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Habit",
        required: true,
      },
      name: { type: String, required: true },
    },
  ],
});

MonthHabitSchema.index({ userId: 1, monthKey: 1 }, { unique: true });

export default mongoose.models.MonthHabit ||
  mongoose.model("MonthHabit", MonthHabitSchema);
