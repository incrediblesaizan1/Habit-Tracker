import { Router } from "express";
import dbConnect from "../lib/mongodb.js";
import Habit from "../models/Habit.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { userId } = req.auth;
    await dbConnect();
    const habits = await Habit.find({ userId }).sort({ createdAt: 1 }).lean();
    const mapped = habits.map((h) => ({
      id: h._id.toString(),
      name: h.name,
      createdAt: h.createdAt,
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId } = req.auth;
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    await dbConnect();
    const habit = await Habit.create({ userId, name: name.trim() });
    res.status(201).json({ id: habit._id.toString(), name: habit.name, createdAt: habit.createdAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
