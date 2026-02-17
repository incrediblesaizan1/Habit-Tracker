import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/app/lib/mongodb";
import Journal from "@/app/models/Journal";

// GET: Fetch a single journal entry by its MongoDB _id
export async function GET(request, { params }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const journal = await Journal.findOne({ _id: id, userId });
    if (!journal) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(journal);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
