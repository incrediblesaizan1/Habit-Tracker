import mongoose from 'mongoose';

const HabitSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, 'Please provide a userId for this habit.'],
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide a name for this habit.'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
  },
  completions: {
    type: Map,
    of: Boolean,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Habit || mongoose.model('Habit', HabitSchema);
