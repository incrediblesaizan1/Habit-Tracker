import { Router } from "express";
import dbConnect from "../lib/mongodb.js";
import Completion from "../models/Completion.js";

const router = Router();

// GET — Fetch completions for a month
router.get("/", async (req, res) => {
  try {
    const { userId } = req.auth;
    const monthKey = req.query.monthKey;
    if (!monthKey) {
      return res.status(400).json({ error: "monthKey required" });
    }

    await dbConnect();
    const completions = await Completion.find({ userId, monthKey }).lean();

    const map = {};
    for (const c of completions) {
      const days = [...new Set(c.days || [])];
      const crossedDays = [...new Set(c.crossedDays || [])].filter(
        (d) => !days.includes(d)
      );
      const emptyDays = [...new Set(c.emptyDays || [])].filter(
        (d) => !days.includes(d) && !crossedDays.includes(d)
      );

      map[c.habitId.toString()] = { days, crossedDays, emptyDays };
    }

    res.json(map);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — Set day status
router.post("/", async (req, res) => {
  try {
    const { userId } = req.auth;
    const { habitId, monthKey, day, status } = req.body;

    if (!habitId || !monthKey || day == null || !status) {
      return res.status(400).json({ error: "habitId, monthKey, day, status required" });
    }

    await dbConnect();
    let completion = await Completion.findOne({ userId, habitId, monthKey });

    if (!completion) {
      completion = await Completion.create({
        userId,
        habitId,
        monthKey,
        days: status === "completed" ? [day] : [],
        crossedDays: status === "crossed" ? [day] : [],
        emptyDays: status === "empty" ? [day] : [],
      });
    } else {
      completion.days = completion.days.filter((d) => d !== day);
      completion.crossedDays = completion.crossedDays.filter((d) => d !== day);
      completion.emptyDays = (completion.emptyDays || []).filter((d) => d !== day);

      if (status === "completed") {
        completion.days.push(day);
      } else if (status === "crossed") {
        completion.crossedDays.push(day);
      } else if (status === "empty") {
        completion.emptyDays.push(day);
      }

      await completion.save();
    }

    res.json({
      days: completion.days,
      crossedDays: completion.crossedDays,
      emptyDays: completion.emptyDays || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
