import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import TimerState from "@/app/models/TimerState";

// GET — Fetch all timer states for the logged-in user
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const states = await TimerState.find({ userId }).lean();

  // Build map: { habitId: { remaining, isRunning, phase, ... } }
  const map = {};
  for (const s of states) {
    map[s.habitId] = {
      remaining: s.remaining,
      isRunning: s.isRunning,
      phase: s.phase,
      stopwatchTime: s.stopwatchTime,
      goalReached: s.goalReached,
      lastTickAt: s.lastTickAt,
      savedAt: s.lastTickAt, // alias for backward compat with frontend logic
    };
  }

  return NextResponse.json(map);
}

// POST — Upsert a single timer state
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { habitId, remaining, isRunning, phase, stopwatchTime, goalReached } =
    await request.json();

  if (!habitId) {
    return NextResponse.json({ error: "habitId required" }, { status: 400 });
  }

  await dbConnect();

  const update = {
    remaining: remaining ?? 0,
    isRunning: isRunning ?? false,
    phase: phase ?? "countdown",
    stopwatchTime: stopwatchTime ?? 0,
    goalReached: goalReached ?? false,
    lastTickAt: Date.now(),
  };

  await TimerState.findOneAndUpdate(
    { userId, habitId },
    { $set: update },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true });
}

// DELETE — Clear a timer state
export async function DELETE(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { habitId } = await request.json();
  if (!habitId) {
    return NextResponse.json({ error: "habitId required" }, { status: 400 });
  }

  await dbConnect();
  await TimerState.deleteOne({ userId, habitId });

  return NextResponse.json({ ok: true });
}
