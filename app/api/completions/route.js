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

  // Build map: { habitId: { days: [...], crossedDays: [...] } }
  const map = {};
  for (const c of completions) {
    map[c.habitId.toString()] = {
      days: c.days || [],
      crossedDays: c.crossedDays || [],
    };
  }

  return NextResponse.json(map);
}

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { habitId, monthKey, day, status } = await request.json();
  if (!habitId || !monthKey || day == null || !status) {
    return NextResponse.json(
      { error: "habitId, monthKey, day, status required" },
      { status: 400 }
    );
  }

  await dbConnect();

  let completion = await Completion.findOne({ userId, habitId, monthKey });

  if (!completion) {
    completion = await Completion.create({
      userId,
      habitId,
      monthKey,
      days: status === "completed" ? [day] : [],
      crossedDays: status === "crossed" ? [day] : [],
    });
  } else {
    if (status === "completed") {
      // Toggle in days array
      const idx = completion.days.indexOf(day);
      if (idx > -1) {
        completion.days.splice(idx, 1);
      } else {
        completion.days.push(day);
        // Remove from crossedDays if present
        const crossIdx = completion.crossedDays.indexOf(day);
        if (crossIdx > -1) {
          completion.crossedDays.splice(crossIdx, 1);
        }
      }
    } else if (status === "crossed") {
      // Toggle in crossedDays array
      const idx = completion.crossedDays.indexOf(day);
      if (idx > -1) {
        completion.crossedDays.splice(idx, 1);
      } else {
        completion.crossedDays.push(day);
        // Remove from days if present
        const daysIdx = completion.days.indexOf(day);
        if (daysIdx > -1) {
          completion.days.splice(daysIdx, 1);
        }
      }
    }
    await completion.save();
  }

  return NextResponse.json({
    days: completion.days,
    crossedDays: completion.crossedDays,
  });
}
