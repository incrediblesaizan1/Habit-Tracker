import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import Habit from '@/models/Habit';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    await dbConnect();
    const habits = await Habit.find({ userId: userId });

    // Transform _id to id for frontend compatibility
    const habitsWithId = habits.map(habit => ({
      ...habit.toObject(),
      id: habit._id.toString(),
    }));

    return NextResponse.json(habitsWithId);
  } catch (error) {
    console.error('[HABITS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name) {
      return new NextResponse('Name is required', { status: 400 });
    }

    await dbConnect();
    const habit = await Habit.create({
      userId,
      name,
      completions: {},
    });

    return NextResponse.json({
      ...habit.toObject(),
      id: habit._id.toString(),
    });
  } catch (error) {
    console.error('[HABITS_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
