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

  const { searchParams } = new URL(request.url);
  const month = parseInt(searchParams.get("month"), 10);
  const year = parseInt(searchParams.get("year"), 10);

  if (isNaN(month) || isNaN(year)) {
    return NextResponse.json({ error: "Month and year are required" }, { status: 400 });
  }

  try {
    await dbConnect();
    // Force Mongoose to drop outdated indexes (like the old unique userId index)
    try { await Goal.syncIndexes(); } catch (e) { console.error("Index sync error:", e); }

    const result = await Goal.findOne({ userId, month, year });
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
    // Force Mongoose to drop outdated indexes (like the old unique userId index)
    try { await Goal.syncIndexes(); } catch (e) { console.error("Index sync error:", e); }

    const { goal, targetDate, sacrifices, month, year } = await req.json();

    if (typeof month !== "number" || typeof year !== "number") {
      return NextResponse.json({ error: "Month and year are required" }, { status: 400 });
    }

    const result = await Goal.findOneAndUpdate(
      { userId, month, year },
      { goal, targetDate, sacrifices, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Save Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
