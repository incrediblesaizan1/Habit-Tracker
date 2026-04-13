import { Router } from "express";
import dbConnect from "../lib/mongodb.js";
import CustomTimer from "../models/CustomTimer.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { userId } = req.auth();
    await dbConnect();
    const timers = await CustomTimer.find({ userId }).lean();
    const result = timers.map((t) => ({
      id: t.timerId,
      name: t.name,
      totalSeconds: t.totalSeconds,
      isOpenEnded: t.isOpenEnded,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id, name, totalSeconds, isOpenEnded } = req.body;
    if (!id || !name || !totalSeconds) {
      return res.status(400).json({ error: "id, name, totalSeconds required" });
    }
    await dbConnect();
    await CustomTimer.findOneAndUpdate(
      { userId, timerId: id },
      { $set: { name, totalSeconds, isOpenEnded: isOpenEnded || false } },
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
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "id required" });
    }
    await dbConnect();
    await CustomTimer.deleteOne({ userId, timerId: id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
