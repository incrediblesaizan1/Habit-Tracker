"use client";
import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { db } from "./firebase";
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";

const WEEKDAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDateString(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function useHabits() {
  const { user } = useUser();
  const uid = user?.id;

  const [habits, setHabits] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [loaded, setLoaded] = useState(false);
  const [isFetching, setIsFetching] = useState(false); // Kept for compatibility

  const daysInMonth = getDaysInMonth(year, month);

  // Firestore Real-Time Listener for Habits
  useEffect(() => {
    if (!uid) return;
    
    setIsFetching(true);
    const habitsCol = collection(db, "users", uid, "habits");
    
    const unsubscribe = onSnapshot(habitsCol, (snap) => {
      const fetchedHabits = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setHabits(fetchedHabits);
      setLoaded(true);
      setIsFetching(false);
    }, (error) => {
      console.error("Error listening to habits: ", error);
      setIsFetching(false);
    });

    return () => unsubscribe();
  }, [uid]);

  const getHabitData = useCallback((habitId) => {
    return habits.find(h => h.id === habitId) || { completedDates: [], crossedDates: [] };
  }, [habits]);

  const setDayStatus = useCallback(async (habitId, day, status) => {
    if (!uid) return;
    const dateStr = formatDateString(year, month, day);
    const habitRef = doc(db, "users", uid, "habits", habitId);

    try {
      if (status === "completed") {
        await updateDoc(habitRef, {
          completedDates: arrayUnion(dateStr),
          crossedDates: arrayRemove(dateStr)
        });
      } else if (status === "crossed") {
        await updateDoc(habitRef, {
          crossedDates: arrayUnion(dateStr),
          completedDates: arrayRemove(dateStr)
        });
      } else {
        await updateDoc(habitRef, {
          completedDates: arrayRemove(dateStr),
          crossedDates: arrayRemove(dateStr)
        });
      }
    } catch (err) {
      console.error(`Failed to set status to ${status} for ${dateStr}:`, err);
    }
  }, [uid, year, month]);

  const isDayCompleted = useCallback((habitId, day) => {
    const dateStr = formatDateString(year, month, day);
    const data = getHabitData(habitId);
    return data.completedDates?.includes(dateStr) ?? false;
  }, [getHabitData, year, month]);

  const isDayCrossed = useCallback((habitId, day) => {
    const dateStr = formatDateString(year, month, day);
    const data = getHabitData(habitId);
    return data.crossedDates?.includes(dateStr) ?? false;
  }, [getHabitData, year, month]);

  const getHabitMonthlyCount = useCallback((habitId) => {
    const data = getHabitData(habitId);
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    return data.completedDates?.filter(d => d.startsWith(prefix)).length ?? 0;
  }, [getHabitData, year, month]);

  const getHabitMonthlyCrossedCount = useCallback((habit) => {
    const data = getHabitData(habit.id);
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const explicitCrossed = data.crossedDates?.filter(d => d.startsWith(prefix)).length ?? 0;
    
    let autoCrossedCount = 0;
    const habitCreated = habit.createdAt ? new Date(habit.createdAt) : null;
    const habitCreatedDay = habitCreated
      ? new Date(
          habitCreated.getFullYear(),
          habitCreated.getMonth(),
          habitCreated.getDate(),
        )
      : null;
    const today = new Date();
    const todayMidnight = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const isPast = cellDate < todayMidnight;
      const isAfterCreation = habitCreatedDay
        ? cellDate >= habitCreatedDay
        : false;

      const dateStr = formatDateString(year, month, d);
      const isCompleted = data.completedDates?.includes(dateStr);
      const isCrossed = data.crossedDates?.includes(dateStr);

      if (isPast && isAfterCreation && !isCompleted && !isCrossed) {
        autoCrossedCount++;
      }
    }

    return explicitCrossed + autoCrossedCount;
  }, [getHabitData, year, month, daysInMonth]);

  const getDayCompletionCount = useCallback((day) => {
    const dateStr = formatDateString(year, month, day);
    let count = 0;
    for (const habit of habits) {
      if (habit.completedDates?.includes(dateStr)) count++;
    }
    return count;
  }, [habits, year, month]);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const effectiveDays = isCurrentMonth ? today.getDate() : daysInMonth;
  const totalPossible = habits.length * effectiveDays;
  
  const totalCompleted = habits.reduce(
    (sum, h) => sum + getHabitMonthlyCount(h.id),
    0,
  );
  
  const totalCrossed = habits.reduce(
    (sum, h) => sum + getHabitMonthlyCrossedCount(h),
    0,
  );
  
  const completionPercent = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

  // Best day of the week
  const bestDay = (() => {
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      dayCounts[dow] += getDayCompletionCount(d);
    }
    const maxCount = Math.max(...dayCounts);
    if (maxCount === 0) return "–";
    const bestIdx = dayCounts.indexOf(maxCount);
    return WEEKDAY_NAMES[bestIdx]; // Using existing array but expanding correctly is fine, wait WeekdayNames has duplicates T, S, hmm. Let's provide exact mapping.
  })();

  const BEST_DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  
  const actualBestDay = (() => {
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      dayCounts[dow] += getDayCompletionCount(d);
    }
    const maxCount = Math.max(...dayCounts);
    if (maxCount === 0) return "–";
    const bestIdx = dayCounts.indexOf(maxCount);
    return BEST_DAY_NAMES[bestIdx];
  })();

  // Best date in the month
  const bestDateObj = (() => {
    let maxCount = -1;
    let bestD = null;
    for (let d = 1; d <= daysInMonth; d++) {
      const count = getDayCompletionCount(d);
      if (count >= maxCount && count > 0) {
        maxCount = count;
        bestD = d;
      }
    }
    return { day: bestD, count: maxCount };
  })();

  // Daily volume data
  const dailyVolume = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dailyVolume.push(getDayCompletionCount(d));
  }

  const addHabit = useCallback(async (name) => {
    if (!uid) return;
    const tempId = `temp-${Date.now()}`;
    const newDocRef = doc(collection(db, "users", uid, "habits"));
    
    const habitData = {
      name,
      createdAt: new Date().toISOString(),
      completedDates: [],
      crossedDates: []
    };

    try {
      await setDoc(newDocRef, habitData);
    } catch (err) {
      console.error("Failed to add habit to Firestore:", err);
    }
  }, [uid]);

  const removeHabit = useCallback(async (habitId) => {
    if (!uid) return;
    try {
      await deleteDoc(doc(db, "users", uid, "habits", habitId));
    } catch (err) {
      console.error("Failed to remove habit:", err);
    }
  }, [uid]);

  // Expose an explicit mapping variable because some components might depend on the legacy monthKey temporarily.
  // We'll keep monthKey here purely as a return prop, even though it's no longer used for fetching.
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  return {
    habits,
    year,
    month,
    monthKey,
    daysInMonth,
    setYear,
    setMonth,
    setDayStatus,
    isDayCompleted,
    isDayCrossed,
    getHabitMonthlyCount,
    getDayCompletionCount,
    totalCompleted,
    totalCrossed,
    totalPossible,
    completionPercent,
    bestDay: actualBestDay,
    bestDateObj,
    dailyVolume,
    addHabit,
    removeHabit,
    loaded,
    isFetching,
    WEEKDAY_NAMES,
  };
}
