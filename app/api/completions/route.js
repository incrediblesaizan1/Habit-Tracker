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
    // Deduplicate array values in case legacy race conditions corrupted the database
    const days = [...new Set(c.days || [])];
    const crossedDays = [...new Set(c.crossedDays || [])].filter(
      (d) => !days.includes(d) // Guarantee a day isn't marked both crossed and completed
    );

    map[c.habitId.toString()] = {
      days,
      crossedDays,
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
    // Remove from both arrays first to prevent duplicates
    completion.days = completion.days.filter((d) => d !== day);
    completion.crossedDays = completion.crossedDays.filter((d) => d !== day);

    if (status === "completed") {
      completion.days.push(day);
    } else if (status === "crossed") {
      completion.crossedDays.push(day);
    } // if "empty", we just save the removal

    await completion.save();
  }

  return NextResponse.json({
    days: completion.days,
    crossedDays: completion.crossedDays,
  });
}
