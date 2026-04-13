import "dotenv/config";
import express from "express";
import cors from "cors";
import { clerkMiddleware, requireAuth } from "@clerk/express";

// Route imports
import activityLogRoutes from "../server/routes/activityLog.js";
import completionsRoutes from "../server/routes/completions.js";
import customTimersRoutes from "../server/routes/customTimers.js";
import earningGoalRoutes from "../server/routes/earningGoal.js";
import expensesRoutes from "../server/routes/expenses.js";
import goalsRoutes from "../server/routes/goals.js";
import habitsRoutes from "../server/routes/habits.js";
import journalRoutes from "../server/routes/journal.js";
import monthHabitsRoutes from "../server/routes/monthHabits.js";
import timerHistoryRoutes from "../server/routes/timerHistory.js";
import timerStateRoutes from "../server/routes/timerState.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

// API routes (all require auth)
app.use("/api/activity-log", requireAuth(), activityLogRoutes);
app.use("/api/completions", requireAuth(), completionsRoutes);
app.use("/api/custom-timers", requireAuth(), customTimersRoutes);
app.use("/api/earning-goal", requireAuth(), earningGoalRoutes);
app.use("/api/expenses", requireAuth(), expensesRoutes);
app.use("/api/goals", requireAuth(), goalsRoutes);
app.use("/api/habits", requireAuth(), habitsRoutes);
app.use("/api/journal", requireAuth(), journalRoutes);
app.use("/api/month-habits", requireAuth(), monthHabitsRoutes);
app.use("/api/timer-history", requireAuth(), timerHistoryRoutes);
app.use("/api/timer-state", requireAuth(), timerStateRoutes);

// Wallpapers (no auth)
app.get("/api/wallpapers", (req, res) => {
  res.json([]);
});

// Fallback
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
