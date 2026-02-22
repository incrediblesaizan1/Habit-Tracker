import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/app/lib/mongodb";
import Goal from "@/app/models/Goal";

// GET: Fetch user's goals and sacrifices
export async function GET(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    const result = await Goal.findOne({ userId });
    return NextResponse.json(result || { goal: "", targetDate: "", sacrifices: [""] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Save or update goals and sacrifices
export async function POST(req) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    const { goal, targetDate, sacrifices } = await req.json();

    const result = await Goal.findOneAndUpdate(
      { userId },
      { goal, targetDate, sacrifices, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
