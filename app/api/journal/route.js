import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import Journal from "@/app/models/Journal";

export async function GET(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  await dbConnect();
  const entry = await Journal.findOne({ userId, date }).lean();

  return NextResponse.json({ content: entry?.content || "" });
}

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date, content } = await request.json();
  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  await dbConnect();
  await Journal.findOneAndUpdate(
    { userId, date },
    { content, updatedAt: new Date() },
    { upsert: true }
  );

  return NextResponse.json({ success: true });
}
