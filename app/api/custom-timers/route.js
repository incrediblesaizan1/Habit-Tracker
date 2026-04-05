import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import CustomTimer from "@/app/models/CustomTimer";

// GET — Fetch all custom timers for the logged-in user
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const timers = await CustomTimer.find({ userId }).lean();

  const result = timers.map((t) => ({
    id: t.timerId,
    name: t.name,
    totalSeconds: t.totalSeconds,
    isOpenEnded: t.isOpenEnded,
  }));

  return NextResponse.json(result);
}

// POST — Create a new custom timer
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, name, totalSeconds, isOpenEnded } = await request.json();
  if (!id || !name || !totalSeconds) {
    return NextResponse.json(
      { error: "id, name, totalSeconds required" },
      { status: 400 }
    );
  }

  await dbConnect();

  await CustomTimer.findOneAndUpdate(
    { userId, timerId: id },
    {
      $set: {
        name,
        totalSeconds,
        isOpenEnded: isOpenEnded || false,
      },
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true });
}

// DELETE — Remove a custom timer
export async function DELETE(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await dbConnect();
  await CustomTimer.deleteOne({ userId, timerId: id });

  return NextResponse.json({ ok: true });
}
