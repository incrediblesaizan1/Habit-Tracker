import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import Habit from "@/app/models/Habit";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const habits = await Habit.find({ userId }).sort({ createdAt: 1 }).lean();

  // Map _id to string id for client
  const mapped = habits.map((h) => ({
    id: h._id.toString(),
    name: h.name,
  }));

  return NextResponse.json(mapped);
}

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await request.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await dbConnect();
  const habit = await Habit.create({ userId, name: name.trim() });

  return NextResponse.json({ id: habit._id.toString(), name: habit.name }, { status: 201 });
}
