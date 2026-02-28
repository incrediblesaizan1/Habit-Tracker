import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import Habit from "@/app/models/Habit";
import MonthHabit from "@/app/models/MonthHabit";

export async function GET(request) {
  try {
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

    // Check if a snapshot exists for this month
    const monthHabit = await MonthHabit.findOne({ userId, monthKey }).lean();

    if (monthHabit) {
      // Snapshot exists — return it
      const mapped = monthHabit.habits.map((h) => ({
        id: h.habitId.toString(),
        name: h.name,
      }));
      return NextResponse.json(mapped);
    }

    // No snapshot for this month — check if the user has ANY month snapshots
    const anySnapshot = await MonthHabit.findOne({ userId }).lean();

    if (anySnapshot) {
      // User has data for other months — inherit from the most recent previous month
      const previousSnapshot = await MonthHabit.findOne(
        { userId, monthKey: { $lt: monthKey } }
      ).sort({ monthKey: -1 }).lean();

      if (previousSnapshot && previousSnapshot.habits.length > 0) {
        // Copy previous month's habits into this month
        const inheritedHabits = previousSnapshot.habits.map((h) => ({
          habitId: h.habitId,
          name: h.name,
        }));

        await MonthHabit.create({
          userId,
          monthKey,
          habits: inheritedHabits,
        });

        const mapped = inheritedHabits.map((h) => ({
          id: h.habitId.toString(),
          name: h.name,
        }));
        return NextResponse.json(mapped);
      }

      // No previous month with habits — return empty
      return NextResponse.json([]);
    }

    // No snapshots at all — this is a first-time or migrating user.
    // Migrate: create a snapshot for the CURRENT month from existing global habits.
    const currentDate = new Date();
    const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

    const globalHabits = await Habit.find({ userId }).sort({ createdAt: 1 }).lean();

    if (globalHabits.length === 0) {
      // Truly new user with no habits — return empty
      return NextResponse.json([]);
    }

    // Create a snapshot for the current month from global habits
    const habitsArray = globalHabits.map((h) => ({
      habitId: h._id,
      name: h.name,
    }));

    await MonthHabit.create({
      userId,
      monthKey: currentMonthKey,
      habits: habitsArray,
    });

    // If the requested month is the current month, return the snapshot
    if (monthKey === currentMonthKey) {
      const mapped = globalHabits.map((h) => ({
        id: h._id.toString(),
        name: h.name,
      }));
      return NextResponse.json(mapped);
    }

    // Requested a different month — return empty (migration only seeds current month)
    return NextResponse.json([]);
  } catch (err) {
    console.error("GET /api/month-habits error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { monthKey, name } = await request.json();
    if (!monthKey || !name || !name.trim()) {
      return NextResponse.json(
        { error: "monthKey and name are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Create a global Habit record (for ID generation and as a master record)
    const habit = await Habit.create({ userId, name: name.trim() });

    // Add to the month's snapshot (upsert)
    await MonthHabit.updateOne(
      { userId, monthKey },
      {
        $push: {
          habits: { habitId: habit._id, name: habit.name },
        },
      },
      { upsert: true }
    );

    return NextResponse.json(
      { id: habit._id.toString(), name: habit.name, createdAt: habit.createdAt },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/month-habits error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { monthKey, habitId } = await request.json();
    if (!monthKey || !habitId) {
      return NextResponse.json(
        { error: "monthKey and habitId are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Remove the habit ONLY from this month's snapshot
    await MonthHabit.updateOne(
      { userId, monthKey },
      {
        $pull: {
          habits: { habitId: habitId },
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/month-habits error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
