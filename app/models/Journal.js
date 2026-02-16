import mongoose from "mongoose";

const JournalSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: String, required: true }, // "YYYY-MM-DD"
  content: { type: String, default: "" },
  updatedAt: { type: Date, default: Date.now },
});

JournalSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.Journal || mongoose.model("Journal", JournalSchema);
