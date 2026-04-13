import { Router } from "express";
import dbConnect from "../lib/mongodb.js";
import Habit from "../models/Habit.js";
import MonthHabit from "../models/MonthHabit.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { userId } = req.auth();
    const monthKey = req.query.monthKey;
    if (!monthKey) {
      return res.status(400).json({ error: "monthKey required" });
    }

    await dbConnect();

    // Check if a snapshot exists for this month
    const monthHabit = await MonthHabit.findOne({ userId, monthKey }).lean();

    if (monthHabit) {
      const mapped = monthHabit.habits.map((h) => ({
        id: h.habitId.toString(),
        name: h.name,
      }));
      return res.json(mapped);
    }

    // No snapshot — check if user has ANY snapshots
    const anySnapshot = await MonthHabit.findOne({ userId }).lean();

    if (anySnapshot) {
      // Inherit from most recent previous month
      const previousSnapshot = await MonthHabit.findOne(
        { userId, monthKey: { $lt: monthKey } }
      ).sort({ monthKey: -1 }).lean();

      if (previousSnapshot && previousSnapshot.habits.length > 0) {
        const inheritedHabits = previousSnapshot.habits.map((h) => ({
          habitId: h.habitId,
          name: h.name,
        }));

        await MonthHabit.create({ userId, monthKey, habits: inheritedHabits });

        const mapped = inheritedHabits.map((h) => ({
          id: h.habitId.toString(),
          name: h.name,
        }));
        return res.json(mapped);
      }

      return res.json([]);
    }

    // No snapshots at all — migrate from global habits
    const currentDate = new Date();
    const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

    const globalHabits = await Habit.find({ userId }).sort({ createdAt: 1 }).lean();

    if (globalHabits.length === 0) {
      return res.json([]);
    }

    const habitsArray = globalHabits.map((h) => ({
      habitId: h._id,
      name: h.name,
    }));

    await MonthHabit.create({ userId, monthKey: currentMonthKey, habits: habitsArray });

    if (monthKey === currentMonthKey) {
      const mapped = globalHabits.map((h) => ({
        id: h._id.toString(),
        name: h.name,
      }));
      return res.json(mapped);
    }

    res.json([]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId } = req.auth();
    const { monthKey, name } = req.body;
    if (!monthKey || !name || !name.trim()) {
      return res.status(400).json({ error: "monthKey and name are required" });
    }

    await dbConnect();

    const habit = await Habit.create({ userId, name: name.trim() });

    await MonthHabit.updateOne(
      { userId, monthKey },
      { $push: { habits: { habitId: habit._id, name: habit.name } } },
      { upsert: true }
    );

    res.status(201).json({
      id: habit._id.toString(),
      name: habit.name,
      createdAt: habit.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/", async (req, res) => {
  try {
    const { userId } = req.auth();
    const { monthKey, habitId } = req.body;
    if (!monthKey || !habitId) {
      return res.status(400).json({ error: "monthKey and habitId are required" });
    }

    await dbConnect();

    await MonthHabit.updateOne(
      { userId, monthKey },
      { $pull: { habits: { habitId: habitId } } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
