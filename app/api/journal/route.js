import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/app/lib/mongodb";
import Journal from "@/app/models/Journal";

// GET: Fetch all journal entries for the user, sorted by date (desc)
export async function GET(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  try {
    await dbConnect();
    if (date) {
      const journal = await Journal.findOne({ userId, date });
      return NextResponse.json(journal || {});
    } else {
      const journals = await Journal.find({ userId }).sort({ date: -1 });
      return NextResponse.json(journals);
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Save or update a journal entry
export async function POST(req) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    const { date, content } = await req.json();

    const journal = await Journal.findOneAndUpdate(
      { userId, date },
      { content, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json(journal);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
