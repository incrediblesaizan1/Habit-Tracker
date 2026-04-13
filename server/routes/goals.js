import { Router } from "express";
import dbConnect from "../lib/mongodb.js";
import Goal from "../models/Goal.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { userId } = req.auth();
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    if (isNaN(month) || isNaN(year)) {
      return res.status(400).json({ error: "Month and year are required" });
    }
    await dbConnect();
    try { await Goal.syncIndexes(); } catch (e) { /* ignore */ }
    const result = await Goal.findOne({ userId, month, year });
    res.json(result || { goal: "", targetDate: "", sacrifices: [""] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId } = req.auth();
    const { goal, targetDate, sacrifices, month, year } = req.body;
    if (typeof month !== "number" || typeof year !== "number") {
      return res.status(400).json({ error: "Month and year are required" });
    }
    await dbConnect();
    try { await Goal.syncIndexes(); } catch (e) { /* ignore */ }
    const result = await Goal.findOneAndUpdate(
      { userId, month, year },
      { goal, targetDate, sacrifices, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
