import { Router } from "express";
import dbConnect from "../lib/mongodb.js";
import TimerState from "../models/TimerState.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { userId } = req.auth();
    await dbConnect();
    const states = await TimerState.find({ userId }).lean();
    const map = {};
    for (const s of states) {
      map[s.habitId] = {
        remaining: s.remaining,
        isRunning: s.isRunning,
        phase: s.phase,
        stopwatchTime: s.stopwatchTime,
        goalReached: s.goalReached,
        lastTickAt: s.lastTickAt,
        savedAt: s.lastTickAt,
        startedAt: s.startedAt || 0,
        elapsedBeforePause: s.elapsedBeforePause || 0,
        totalSeconds: s.totalSeconds || 0,
        timerDate: s.timerDate || "",
        loggedActualTime: s.loggedActualTime || 0,
      };
    }
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId } = req.auth();
    const { habitId } = req.body;
    if (!habitId) {
      return res.status(400).json({ error: "habitId required" });
    }
    await dbConnect();
    const update = {
      remaining: req.body.remaining ?? 0,
      isRunning: req.body.isRunning ?? false,
      phase: req.body.phase ?? "countdown",
      stopwatchTime: req.body.stopwatchTime ?? 0,
      goalReached: req.body.goalReached ?? false,
      lastTickAt: Date.now(),
      startedAt: req.body.startedAt ?? 0,
      elapsedBeforePause: req.body.elapsedBeforePause ?? 0,
      totalSeconds: req.body.totalSeconds ?? 0,
      timerDate: req.body.timerDate ?? "",
      loggedActualTime: req.body.loggedActualTime ?? 0,
    };
    await TimerState.findOneAndUpdate(
      { userId, habitId },
      { $set: update },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/", async (req, res) => {
  try {
    const { userId } = req.auth();
    const { habitId, habitIds } = req.body;
    await dbConnect();
    if (habitIds && Array.isArray(habitIds)) {
      await TimerState.deleteMany({ userId, habitId: { $in: habitIds } });
    } else if (habitId) {
      await TimerState.deleteOne({ userId, habitId });
    } else {
      return res.status(400).json({ error: "habitId or habitIds required" });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
