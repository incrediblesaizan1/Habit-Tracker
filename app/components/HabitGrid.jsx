"use client";
import { useMemo, useEffect, useRef } from "react";

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export default function HabitGrid({
  habits,
  year,
  month,
  daysInMonth,
  toggleDay,
  isDayCompleted,
  getHabitMonthlyCount,
  removeHabit,
}) {
  const scrollRef = useRef(null);
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;
  const todayDate = isCurrentMonth ? today.getDate() : -1;

  // Auto-scroll to today
  useEffect(() => {
    if (isCurrentMonth && scrollRef.current) {
      const todayEl = scrollRef.current.querySelector(".today-col");
      if (todayEl) {
        todayEl.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [isCurrentMonth, year, month]);

  // Build day headers with week groupings
  const { dayHeaders, weeks } = useMemo(() => {
    const headers = [];
    const wks = [];
    let currentWeek = { start: 1, end: 1, label: "Week 1" };
    let weekNum = 1;

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dow = date.getDay();
      headers.push({
        day: d,
        letter: WEEKDAY_LETTERS[dow],
        isToday: d === todayDate,
        dow,
      });

      if (d === 1) {
        currentWeek.start = d;
      }
      if (dow === 6 || d === daysInMonth) {
        currentWeek.end = d;
        wks.push({
          ...currentWeek,
          span: currentWeek.end - currentWeek.start + 1,
        });
        weekNum++;
        currentWeek = { start: d + 1, end: d + 1, label: `Week ${weekNum}` };
      }
    }
    return { dayHeaders: headers, weeks: wks };
  }, [daysInMonth, year, month, todayDate]);

  return (
    <div className="grid-scroll" ref={scrollRef}>
      <table className="habit-table">
        <thead>
          {/* Week group row */}
          <tr className="week-header-row">
            <th className="col-sn" rowSpan={2}>
              S/N
            </th>
            <th className="col-habits" rowSpan={2}>
              Habits
            </th>
            {weeks.map((w, i) => (
              <th key={i} className="week-span" colSpan={w.span}>
                {w.label}
              </th>
            ))}
            <th className="col-done" rowSpan={2}>
              Done
            </th>
            <th className="col-total" rowSpan={2}>
              Total
            </th>
          </tr>
          {/* Day letters + numbers */}
          <tr className="day-header-row">
            {dayHeaders.map((h) => (
              <th
                key={h.day}
                className={`col-day ${h.isToday ? "today-col" : ""}`}
              >
                <span className="day-letter">{h.letter}</span>
                <span className="day-num">{h.day}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {habits.map((habit, idx) => {
            const count = getHabitMonthlyCount(habit.id);
            const pct =
              daysInMonth > 0 ? Math.round((count / daysInMonth) * 100) : 0;
            return (
              <tr key={habit.id}>
                <td className="cell-sn">{idx + 1}</td>
                <td className="cell-habit">
                  <div className="habit-name-row">
                    <span className="habit-label">{habit.name}</span>
                    <button
                      className="habit-delete"
                      onClick={() => removeHabit(habit.id)}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </td>
                {dayHeaders.map((h) => {
                  const done = isDayCompleted(habit.id, h.day);
                  return (
                    <td
                      key={h.day}
                      className={`cell-day ${done ? "completed" : ""} ${h.isToday ? "today-cell" : ""}`}
                      onClick={() => toggleDay(habit.id, h.day)}
                    >
                      <div className="checkbox-box">
                        {done && <span className="check-mark">✓</span>}
                      </div>
                    </td>
                  );
                })}
                <td className="cell-done">
                  <span className="done-text">
                    {count} / {daysInMonth}
                  </span>
                </td>
                <td className="cell-total">
                  <span
                    className={`total-pct ${pct === 0 ? "zero" : "nonzero"}`}
                  >
                    {pct}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
