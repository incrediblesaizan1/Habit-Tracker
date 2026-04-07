import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import ActivityLog from "@/app/models/ActivityLog";

// GET — Fetch activity log for the logged-in user (newest first, capped at 500)
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  return NextResponse.json(result);
}

// POST — Log a new activity
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action, habitName, detail } = body;

  if (!action) {
    return NextResponse.json({ error: "action required" }, { status: 400 });
  }

  await dbConnect();

  await ActivityLog.create({
    userId,
    action,
    habitName: habitName || "",
    detail: detail || "",
  });

  return NextResponse.json({ ok: true });
}

// DELETE — Clear all activity log for the user
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  await ActivityLog.deleteMany({ userId });

  return NextResponse.json({ ok: true });
}
