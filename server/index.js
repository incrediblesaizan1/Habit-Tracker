import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { clerkMiddleware, requireAuth } from "@clerk/express";

// Route imports
import activityLogRoutes from "./routes/activityLog.js";
import completionsRoutes from "./routes/completions.js";
import customTimersRoutes from "./routes/customTimers.js";
import earningGoalRoutes from "./routes/earningGoal.js";
import expensesRoutes from "./routes/expenses.js";
import goalsRoutes from "./routes/goals.js";
import habitsRoutes from "./routes/habits.js";
import journalRoutes from "./routes/journal.js";
import monthHabitsRoutes from "./routes/monthHabits.js";
import timerHistoryRoutes from "./routes/timerHistory.js";
import timerStateRoutes from "./routes/timerState.js";
import wallpaperRoutes from "./routes/wallpaper.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

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
app.use("/api/wallpapers", wallpaperRoutes); // no auth needed

// In production, serve the Vite build
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
