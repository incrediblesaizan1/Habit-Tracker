import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import Habit from "@/app/models/Habit";
import Completion from "@/app/models/Completion";

export async function DELETE(request, { params }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await dbConnect();

  // Delete the habit and all its completions
  await Habit.deleteOne({ _id: id, userId });
  await Completion.deleteMany({ habitId: id, userId });

  return NextResponse.json({ success: true });
}
