import mongoose from "mongoose";

const CustomTimerSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  timerId: { type: String, required: true },
  name: { type: String, required: true },
  totalSeconds: { type: Number, required: true },
  isOpenEnded: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

CustomTimerSchema.index({ userId: 1, timerId: 1 }, { unique: true });

export default mongoose.models.CustomTimer || mongoose.model("CustomTimer", CustomTimerSchema);
