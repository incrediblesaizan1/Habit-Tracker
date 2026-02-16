import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import Habit from '@/models/Habit';
import { NextResponse } from 'next/server';

export async function PATCH(req, { params }) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { name, completions, toggleDate } = body;

    await dbConnect();

    // If existing habit check is needed, do it here
    const existingHabit = await Habit.findOne({ _id: id, userId });
    
    if (!existingHabit) {
       return new NextResponse('Habit not found', { status: 404 });
    }

    let updateData = {};
    if (name !== undefined) updateData.name = name;
    
    // Handle toggling manually to update the map properly
    if (toggleDate) {
        const currentCompletions = existingHabit.completions || new Map();
        if (currentCompletions.get(toggleDate)) {
             currentCompletions.delete(toggleDate);
        } else {
             currentCompletions.set(toggleDate, true);
        }
        updateData.completions = currentCompletions;
    } else if (completions !== undefined) {
        // If sending full completions object
        updateData.completions = completions;
    }

    const habit = await Habit.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true }
    );

    return NextResponse.json({
      ...habit.toObject(),
      id: habit._id.toString(),
    });
  } catch (error) {
    console.error('[HABIT_PATCH]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    await dbConnect();

    const habit = await Habit.findOneAndDelete({ _id: id, userId });

    if (!habit) {
      return new NextResponse('Habit not found', { status: 404 });
    }

    return NextResponse.json(habit);
  } catch (error) {
    console.error('[HABIT_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
