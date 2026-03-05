import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import EarningGoal from "@/app/models/EarningGoal";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  let goal = await EarningGoal.findOne({ userId }).lean();

  if (!goal) {
    goal = { goalAmount: 0, currentBalance: 0 };
  }

  return NextResponse.json({
    goalAmount: goal.goalAmount,
    currentBalance: goal.currentBalance,
  });
}

export async function PUT(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { goalAmount, currentBalance } = await request.json();

  await dbConnect();
  const goal = await EarningGoal.findOneAndUpdate(
    { userId },
    {
      $set: {
        ...(goalAmount !== undefined && { goalAmount: Number(goalAmount) }),
        ...(currentBalance !== undefined && {
          currentBalance: Number(currentBalance),
        }),
      },
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({
    goalAmount: goal.goalAmount,
    currentBalance: goal.currentBalance,
  });
}
