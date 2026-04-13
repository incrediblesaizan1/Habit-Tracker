import { Router } from "express";
import dbConnect from "../lib/mongodb.js";
import ActivityLog from "../models/ActivityLog.js";

const router = Router();

// GET — Fetch activity log
router.get("/", async (req, res) => {
  try {
    const { userId } = req.auth();
    await dbConnect();
    const logs = await ActivityLog.find({ userId })
      .sort({ timestamp: -1 })
      .limit(500)
      .lean();

    const result = logs.map((l) => ({
      id: l._id.toString(),
      action: l.action,
      habitName: l.habitName,
      detail: l.detail,
      timestamp: l.timestamp.toISOString(),
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — Log a new activity
router.post("/", async (req, res) => {
  try {
    const { userId } = req.auth();
    const { action, habitName, detail } = req.body;

    if (!action) {
      return res.status(400).json({ error: "action required" });
    }

    await dbConnect();
    await ActivityLog.create({
      userId,
      action,
      habitName: habitName || "",
      detail: detail || "",
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE — Clear all activity log
router.delete("/", async (req, res) => {
  try {
    const { userId } = req.auth();
    await dbConnect();
    await ActivityLog.deleteMany({ userId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
