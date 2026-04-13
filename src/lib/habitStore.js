import { useState, useEffect, useCallback } from "react";

function getMonthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

const WEEKDAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];

export function useHabits() {
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState({});
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [loaded, setLoaded] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const monthKey = getMonthKey(year, month);
  const daysInMonth = getDaysInMonth(year, month);

  // Fetch habits for a specific month from API
  const fetchMonthHabits = useCallback(async (mk) => {
    try {
      const res = await fetch(`/api/month-habits?monthKey=${mk}`);
      if (res.ok) {
        const data = await res.json();
        setHabits(data);
      }
    } catch (err) {
      console.error("Failed to fetch month habits:", err);
    }
  }, []);

  // Fetch completions for current month from API
  const fetchCompletions = useCallback(async (mk) => {
    try {
      const res = await fetch(`/api/completions?monthKey=${mk}`);
      if (res.ok) {
        const data = await res.json();
        setCompletions((prev) => ({ ...prev, [mk]: data }));
      }
    } catch (err) {
      console.error("Failed to fetch completions:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    async function load() {
      await fetchMonthHabits(monthKey);
      await fetchCompletions(monthKey);
      setLoaded(true);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch habits and completions when month changes
  useEffect(() => {
    if (!loaded) return;
    async function refresh() {
      setIsFetching(true);
      await Promise.all([
        fetchMonthHabits(monthKey),
        fetchCompletions(monthKey)
      ]);
      setIsFetching(false);
    }
    refresh();
  }, [monthKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper to get habit data for current month
  const getHabitData = useCallback(
    (habitId) => {
      return completions[monthKey]?.[habitId] || { days: [], crossedDays: [], emptyDays: [] };
    },
    [completions, monthKey],
  );

  const setDayStatus = useCallback(
    async (habitId, day, status) => {
      // Optimistic update
      setCompletions((prev) => {
        const updated = { ...prev };
        const monthData = { ...(updated[monthKey] || {}) };
        const habitData = {
          ...(monthData[habitId] || { days: [], crossedDays: [], emptyDays: [] }),
        };
        const days = [...habitData.days];
        const crossedDays = [...habitData.crossedDays];
        const emptyDays = [...(habitData.emptyDays || [])];

        const daysIdx = days.indexOf(day);
        if (daysIdx > -1) days.splice(daysIdx, 1);
        const crossedIdx = crossedDays.indexOf(day);
        if (crossedIdx > -1) crossedDays.splice(crossedIdx, 1);
        const emptyIdx = emptyDays.indexOf(day);
        if (emptyIdx > -1) emptyDays.splice(emptyIdx, 1);

        if (status === "completed") {
          days.push(day);
        } else if (status === "crossed") {
          crossedDays.push(day);
        } else if (status === "empty") {
          emptyDays.push(day);
        }

        habitData.days = days;
        habitData.crossedDays = crossedDays;
        habitData.emptyDays = emptyDays;
        monthData[habitId] = habitData;
        updated[monthKey] = monthData;
        return updated;
      });

      try {
        await fetch("/api/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ habitId, monthKey, day, status }),
        });
      } catch (err) {
        console.error(`Failed to set day status to ${status}:`, err);
        fetchCompletions(monthKey);
      }
    },
    [monthKey, fetchCompletions],
  );

  const isDayCompleted = useCallback(
    (habitId, day) => {
      return getHabitData(habitId).days?.includes(day) ?? false;
    },
    [getHabitData],
  );

  const isDayCrossed = useCallback(
    (habitId, day) => {
      return getHabitData(habitId).crossedDays?.includes(day) ?? false;
    },
    [getHabitData],
  );

  const isDayEmpty = useCallback(
    (habitId, day) => {
      return getHabitData(habitId).emptyDays?.includes(day) ?? false;
    },
    [getHabitData],
  );

  const getHabitMonthlyCount = useCallback(
    (habitId) => {
      return getHabitData(habitId).days?.length ?? 0;
    },
    [getHabitData],
  );

  const getHabitMonthlyCrossedCount = useCallback(
    (habit) => {
      const explicitCrossed = getHabitData(habit.id).crossedDays?.length ?? 0;
      const completedDays = getHabitData(habit.id).days || [];
      const crossedDays = getHabitData(habit.id).crossedDays || [];
      const emptyDays = getHabitData(habit.id).emptyDays || [];

      let autoCrossedCount = 0;
      const habitCreated = habit.createdAt ? new Date(habit.createdAt) : null;
      const habitCreatedDay = habitCreated
        ? new Date(habitCreated.getFullYear(), habitCreated.getMonth(), habitCreated.getDate())
        : null;
      const today = new Date();
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      for (let d = 1; d <= daysInMonth; d++) {
        const cellDate = new Date(year, month, d);
        const isPast = cellDate < todayMidnight;
        const isAfterCreation = habitCreatedDay ? cellDate >= habitCreatedDay : false;

        if (isPast && isAfterCreation && !completedDays.includes(d) && !crossedDays.includes(d) && !emptyDays.includes(d)) {
          autoCrossedCount++;
        }
      }

      return explicitCrossed + autoCrossedCount;
    },
    [getHabitData, year, month, daysInMonth],
  );

  const getDayCompletionCount = useCallback(
    (day) => {
      const monthData = completions[monthKey];
      if (!monthData) return 0;
      let count = 0;
      for (const habitId in monthData) {
        if (monthData[habitId]?.days?.includes(day)) count++;
      }
      return count;
    },
    [completions, monthKey],
  );

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const effectiveDays = isCurrentMonth ? today.getDate() : daysInMonth;
  const totalPossible = habits.length * effectiveDays;
  const totalCompleted = habits.reduce((sum, h) => sum + getHabitMonthlyCount(h.id), 0);
  const totalCrossed = habits.reduce((sum, h) => sum + getHabitMonthlyCrossedCount(h), 0);
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
    return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][bestIdx];
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
    const tempId = `temp-${Date.now()}`;
    const optimisticHabit = { id: tempId, name, createdAt: new Date().toISOString() };
    setHabits((prev) => [...prev, optimisticHabit]);

    try {
      const res = await fetch("/api/month-habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthKey, name }),
      });
      if (res.ok) {
        const newHabit = await res.json();
        setHabits((prev) => prev.map((h) => (h.id === tempId ? newHabit : h)));
      } else {
        setHabits((prev) => prev.filter((h) => h.id !== tempId));
      }
    } catch (err) {
      console.error("Failed to add habit:", err);
      setHabits((prev) => prev.filter((h) => h.id !== tempId));
    }
  }, [monthKey]);

  const removeHabit = useCallback(
    async (habitId) => {
      setHabits((prev) => prev.filter((h) => h.id !== habitId));
      try {
        await fetch("/api/month-habits", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ monthKey, habitId }),
        });
      } catch (err) {
        console.error("Failed to remove habit:", err);
        fetchMonthHabits(monthKey);
      }
    },
    [monthKey, fetchMonthHabits],
  );

  return {
    habits, year, month, monthKey, daysInMonth,
    setYear, setMonth, setDayStatus,
    isDayCompleted, isDayCrossed, isDayEmpty,
    getHabitMonthlyCount, getDayCompletionCount,
    totalCompleted, totalCrossed, totalPossible,
    completionPercent, bestDay, bestDateObj, dailyVolume,
    addHabit, removeHabit, loaded, isFetching, WEEKDAY_NAMES,
  };
}
