import { Router } from "express";
import dbConnect from "../lib/mongodb.js";
import Journal from "../models/Journal.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { userId } = req.auth;
    const date = req.query.date;
    await dbConnect();
    if (date) {
      const journal = await Journal.findOne({ userId, date });
      res.json(journal || {});
    } else {
      const journals = await Journal.find({ userId }).sort({ date: -1 });
      res.json(journals);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId } = req.auth;
    const { date, content } = req.body;
    await dbConnect();
    const journal = await Journal.findOneAndUpdate(
      { userId, date },
      { content, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(journal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
