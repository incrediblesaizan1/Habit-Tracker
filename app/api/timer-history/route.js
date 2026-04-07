import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import TimerHistory from "@/app/models/TimerHistory";

// GET — Fetch timer history for the logged-in user (newest first, capped at 500)
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  return NextResponse.json(result);
}

// POST — Log a new timer session
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { habitName, targetDuration, actualTime, status, isOpenEnded, extraTime } = body;

  if (!habitName || !status) {
    return NextResponse.json({ error: "habitName and status required" }, { status: 400 });
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

  return NextResponse.json({
    id: entry._id.toString(),
    ok: true,
  });
}

// DELETE — Clear all timer history for the user
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  await TimerHistory.deleteMany({ userId });

  return NextResponse.json({ ok: true });
}
