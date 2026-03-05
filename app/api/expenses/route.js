import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import Expense from "@/app/models/Expense";

export async function GET(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  let filter = { userId };

  if (month !== null && year !== null) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 1);
    filter.date = { $gte: start, $lt: end };
  }

  const expenses = await Expense.find(filter).sort({ date: -1 }).lean();

  const mapped = expenses.map((e) => ({
    id: e._id.toString(),
    type: e.type,
    amount: e.amount,
    description: e.description,
    category: e.category,
    date: e.date,
  }));

  return NextResponse.json(mapped);
}

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, amount, description, category, date } = await request.json();

  if (!type || !amount || !description) {
    return NextResponse.json(
      { error: "type, amount, and description are required" },
      { status: 400 }
    );
  }

  await dbConnect();

  const expense = await Expense.create({
    userId,
    type,
    amount: Number(amount),
    description: description.trim(),
    category: category || "Other",
    date: date ? new Date(date) : new Date(),
  });

  return NextResponse.json(
    {
      id: expense._id.toString(),
      type: expense.type,
      amount: expense.amount,
      description: expense.description,
      category: expense.category,
      date: expense.date,
    },
    { status: 201 }
  );
}
