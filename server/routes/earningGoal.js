import { Router } from "express";
import dbConnect from "../lib/mongodb.js";
import EarningGoal from "../models/EarningGoal.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { userId } = req.auth;
    await dbConnect();
    let goal = await EarningGoal.findOne({ userId }).lean();
    if (!goal) {
      goal = { goalAmount: 0, currentBalance: 0 };
    }
    res.json({ goalAmount: goal.goalAmount, currentBalance: goal.currentBalance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/", async (req, res) => {
  try {
    const { userId } = req.auth;
    const { goalAmount, currentBalance } = req.body;
    await dbConnect();
    const goal = await EarningGoal.findOneAndUpdate(
      { userId },
      {
        $set: {
          ...(goalAmount !== undefined && { goalAmount: Number(goalAmount) }),
          ...(currentBalance !== undefined && { currentBalance: Number(currentBalance) }),
        },
      },
      { upsert: true, new: true }
    );
    res.json({ goalAmount: goal.goalAmount, currentBalance: goal.currentBalance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
