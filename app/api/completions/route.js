import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import Completion from "@/app/models/Completion";

export async function GET(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monthKey = searchParams.get("monthKey");
  if (!monthKey) {
    return NextResponse.json({ error: "monthKey required" }, { status: 400 });
  }

  await dbConnect();
  const completions = await Completion.find({ userId, monthKey }).lean();

  // Build map: { habitId: [days] }
  const map = {};
  for (const c of completions) {
    map[c.habitId.toString()] = c.days;
  }

  return NextResponse.json(map);
}

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { habitId, monthKey, day } = await request.json();
  if (!habitId || !monthKey || day == null) {
    return NextResponse.json({ error: "habitId, monthKey, day required" }, { status: 400 });
  }

  await dbConnect();

  // Find or create the completion doc
  let completion = await Completion.findOne({ userId, habitId, monthKey });

  if (!completion) {
    completion = await Completion.create({ userId, habitId, monthKey, days: [day] });
  } else {
    const idx = completion.days.indexOf(day);
    if (idx > -1) {
      completion.days.splice(idx, 1);
    } else {
      completion.days.push(day);
    }
    await completion.save();
  }

  return NextResponse.json({ days: completion.days });
}
