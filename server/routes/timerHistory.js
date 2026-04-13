import { Router } from "express";
import dbConnect from "../lib/mongodb.js";
import TimerHistory from "../models/TimerHistory.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { userId } = req.auth();
    await dbConnect();
    const history = await TimerHistory.find({ userId })
      .sort({ timestamp: -1 })
      .limit(500)
      .lean();
    const result = history.map((h) => ({
      id: h._id.toString(),
      habitName: h.habitName,
      targetDuration: h.targetDuration,
      actualTime: h.actualTime,
      status: h.status,
      isOpenEnded: h.isOpenEnded,
      extraTime: h.extraTime,
      timestamp: h.timestamp.toISOString(),
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId } = req.auth();
    const { habitName, targetDuration, actualTime, status, isOpenEnded, extraTime } = req.body;
    if (!habitName || !status) {
      return res.status(400).json({ error: "habitName and status required" });
    }
    await dbConnect();
    const entry = await TimerHistory.create({
      userId,
      habitName,
      targetDuration: targetDuration || 0,
      actualTime: actualTime || 0,
      status,
      isOpenEnded: isOpenEnded || false,
      extraTime: extraTime || 0,
    });
    res.json({ id: entry._id.toString(), ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE all
router.delete("/", async (req, res) => {
  try {
    const { userId } = req.auth();
    await dbConnect();
    await TimerHistory.deleteMany({ userId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE by id
router.delete("/:id", async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing id" });
    }
    await dbConnect();
    const entry = await TimerHistory.findOneAndDelete({ _id: id, userId });
    if (!entry) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
