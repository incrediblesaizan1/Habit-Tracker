"use client";
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

  const monthKey = getMonthKey(year, month);
  const daysInMonth = getDaysInMonth(year, month);

  // Fetch habits from API
  const fetchHabits = useCallback(async () => {
    try {
      const res = await fetch("/api/habits");
      if (res.ok) {
        const data = await res.json();
        setHabits(data);
      }
    } catch (err) {
      console.error("Failed to fetch habits:", err);
    }
  }, []);

  // Fetch completions for current month from API
  // API returns: { habitId: { days: [...], crossedDays: [...] } }
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
      await fetchHabits();
      await fetchCompletions(monthKey);
      setLoaded(true);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch completions when month changes
  useEffect(() => {
    if (!loaded) return;
    fetchCompletions(monthKey);
  }, [monthKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper to get habit data for current month
  const getHabitData = useCallback(
    (habitId) => {
      return completions[monthKey]?.[habitId] || { days: [], crossedDays: [] };
    },
    [completions, monthKey]
  );

  const toggleDay = useCallback(
    async (habitId, day) => {
      // Optimistic update
      setCompletions((prev) => {
        const updated = { ...prev };
        const monthData = { ...(updated[monthKey] || {}) };
        const habitData = { ...(monthData[habitId] || { days: [], crossedDays: [] }) };
        const days = [...habitData.days];
        const crossedDays = [...habitData.crossedDays];

        const idx = days.indexOf(day);
        if (idx > -1) {
          days.splice(idx, 1);
        } else {
          days.push(day);
          // Remove from crossedDays if present
          const crossIdx = crossedDays.indexOf(day);
          if (crossIdx > -1) crossedDays.splice(crossIdx, 1);
        }

        habitData.days = days;
        habitData.crossedDays = crossedDays;
        monthData[habitId] = habitData;
        updated[monthKey] = monthData;
        return updated;
      });

      // Sync with API
      try {
        const res = await fetch("/api/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ habitId, monthKey, day, status: "completed" }),
        });
        if (res.ok) {
          const { days, crossedDays } = await res.json();
          setCompletions((prev) => ({
            ...prev,
            [monthKey]: {
              ...(prev[monthKey] || {}),
              [habitId]: { days, crossedDays },
            },
          }));
        }
      } catch (err) {
        console.error("Failed to toggle day:", err);
        fetchCompletions(monthKey);
      }
    },
    [monthKey, fetchCompletions]
  );

  const toggleDayCrossed = useCallback(
    async (habitId, day) => {
      // Optimistic update
      setCompletions((prev) => {
        const updated = { ...prev };
        const monthData = { ...(updated[monthKey] || {}) };
        const habitData = { ...(monthData[habitId] || { days: [], crossedDays: [] }) };
        const days = [...habitData.days];
        const crossedDays = [...habitData.crossedDays];

        const idx = crossedDays.indexOf(day);
        if (idx > -1) {
          crossedDays.splice(idx, 1);
        } else {
          crossedDays.push(day);
          // Remove from days if present
          const daysIdx = days.indexOf(day);
          if (daysIdx > -1) days.splice(daysIdx, 1);
        }

        habitData.days = days;
        habitData.crossedDays = crossedDays;
        monthData[habitId] = habitData;
        updated[monthKey] = monthData;
        return updated;
      });

      // Sync with API
      try {
        const res = await fetch("/api/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ habitId, monthKey, day, status: "crossed" }),
        });
        if (res.ok) {
          const { days, crossedDays } = await res.json();
          setCompletions((prev) => ({
            ...prev,
            [monthKey]: {
              ...(prev[monthKey] || {}),
              [habitId]: { days, crossedDays },
            },
          }));
        }
      } catch (err) {
        console.error("Failed to toggle crossed day:", err);
        fetchCompletions(monthKey);
      }
    },
    [monthKey, fetchCompletions]
  );

  const isDayCompleted = useCallback(
    (habitId, day) => {
      return getHabitData(habitId).days?.includes(day) ?? false;
    },
    [getHabitData]
  );

  const isDayCrossed = useCallback(
    (habitId, day) => {
      return getHabitData(habitId).crossedDays?.includes(day) ?? false;
    },
    [getHabitData]
  );

  const getHabitMonthlyCount = useCallback(
    (habitId) => {
      return getHabitData(habitId).days?.length ?? 0;
    },
    [getHabitData]
  );

  const getHabitMonthlyCrossedCount = useCallback(
    (habitId) => {
      return getHabitData(habitId).crossedDays?.length ?? 0;
    },
    [getHabitData]
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
    [completions, monthKey]
  );

  const totalPossible = habits.length * daysInMonth;
  const totalCompleted = habits.reduce(
    (sum, h) => sum + getHabitMonthlyCount(h.id),
    0
  );
  const totalCrossed = habits.reduce(
    (sum, h) => sum + getHabitMonthlyCrossedCount(h.id),
    0
  );
  const completionPercent =
    totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

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

  // Daily volume data
  const dailyVolume = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dailyVolume.push(getDayCompletionCount(d));
  }

  const addHabit = useCallback(async (name) => {
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const newHabit = await res.json();
        setHabits((prev) => [...prev, newHabit]);
      }
    } catch (err) {
      console.error("Failed to add habit:", err);
    }
  }, []);

  const removeHabit = useCallback(async (habitId) => {
    // Optimistic removal
    setHabits((prev) => prev.filter((h) => h.id !== habitId));

    try {
      await fetch(`/api/habits/${habitId}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to remove habit:", err);
      fetchHabits(); // Revert on error
    }
  }, [fetchHabits]);

  return {
    habits,
    year,
    month,
    monthKey,
    daysInMonth,
    setYear,
    setMonth,
    toggleDay,
    toggleDayCrossed,
    isDayCompleted,
    isDayCrossed,
    getHabitMonthlyCount,
    getDayCompletionCount,
    totalCompleted,
    totalCrossed,
    totalPossible,
    completionPercent,
    bestDay,
    dailyVolume,
    addHabit,
    removeHabit,
    loaded,
    WEEKDAY_NAMES,
  };
}
