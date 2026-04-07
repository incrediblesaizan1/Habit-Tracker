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
      savedAt: s.lastTickAt, // alias for backward compat
      startedAt: s.startedAt || 0,
      elapsedBeforePause: s.elapsedBeforePause || 0,
      totalSeconds: s.totalSeconds || 0,
      timerDate: s.timerDate || "",
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

  const body = await request.json();
  const { habitId } = body;

  if (!habitId) {
    return NextResponse.json({ error: "habitId required" }, { status: 400 });
  }

  await dbConnect();

  const update = {
    remaining: body.remaining ?? 0,
    isRunning: body.isRunning ?? false,
    phase: body.phase ?? "countdown",
    stopwatchTime: body.stopwatchTime ?? 0,
    goalReached: body.goalReached ?? false,
    lastTickAt: Date.now(),
    startedAt: body.startedAt ?? 0,
    elapsedBeforePause: body.elapsedBeforePause ?? 0,
    totalSeconds: body.totalSeconds ?? 0,
    timerDate: body.timerDate ?? "",
  };

  await TimerState.findOneAndUpdate(
    { userId, habitId },
    { $set: update },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true });
}

// DELETE — Clear a timer state (single or bulk)
export async function DELETE(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { habitId, habitIds } = await request.json();

  await dbConnect();

  if (habitIds && Array.isArray(habitIds)) {
    // Bulk delete
    await TimerState.deleteMany({ userId, habitId: { $in: habitIds } });
  } else if (habitId) {
    await TimerState.deleteOne({ userId, habitId });
  } else {
    return NextResponse.json({ error: "habitId or habitIds required" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
