import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, enum: ["income", "expense"], required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  category: { type: String, default: "Other" },
  date: { type: Date, default: Date.now },
});

export default mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);
