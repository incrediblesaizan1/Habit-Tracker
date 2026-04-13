import { Router } from "express";
import dbConnect from "../lib/mongodb.js";
import Expense from "../models/Expense.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { userId } = req.auth;
    await dbConnect();
    const { month, year } = req.query;
    let filter = { userId };
    if (month !== undefined && year !== undefined) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 1);
      filter.date = { $gte: start, $lt: end };
    }
    const expenses = await Expense.find(filter).sort({ date: -1 }).lean();
    const mapped = expenses.map((e) => ({
      id: e._id.toString(),
      type: e.type,
      amount: e.amount,
      description: e.description,
      category: e.category,
      date: e.date,
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId } = req.auth;
    const { type, amount, description, category, date } = req.body;
    if (!type || !amount || !description) {
      return res.status(400).json({ error: "type, amount, and description are required" });
    }
    await dbConnect();
    const expense = await Expense.create({
      userId,
      type,
      amount: Number(amount),
      description: description.trim(),
      category: category || "Other",
      date: date ? new Date(date) : new Date(),
    });
    res.status(201).json({
      id: expense._id.toString(),
      type: expense.type,
      amount: expense.amount,
      description: expense.description,
      category: expense.category,
      date: expense.date,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE by id
router.delete("/:id", async (req, res) => {
  try {
    const { userId } = req.auth;
    const { id } = req.params;
    await dbConnect();
    const deleted = await Expense.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
