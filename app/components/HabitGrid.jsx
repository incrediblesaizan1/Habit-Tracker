"use client";
import { useMemo, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export default function HabitGrid({
  habits,
  year,
  month,
  daysInMonth,
  toggleDay,
  toggleDayCrossed,
  isDayCompleted,
  isDayCrossed,
  getHabitMonthlyCount,
  removeHabit,
}) {
  const scrollRef = useRef(null);
  const lastTapRef = useRef({ habitId: null, day: null, time: 0 });
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;
  const todayDate = isCurrentMonth ? today.getDate() : -1;

  const tableVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  // Handle cell tap:
  // Single tap: empty → completed (✓), completed → crossed (✕)
  // Double-tap: any state → empty (blank)
  const handleCellTap = useCallback(
    (habitId, day) => {
      const now = Date.now();
      const last = lastTapRef.current;
      const isDoubleTap =
        last.habitId === habitId && last.day === day && now - last.time < 300;

      // Update last tap info
      lastTapRef.current = { habitId, day, time: now };

      const done = isDayCompleted(habitId, day);
      const crossed = isDayCrossed(habitId, day);

      if (isDoubleTap) {
        // Double-tap → Clear to blank
        if (done) toggleDay(habitId, day); // remove completed
        if (crossed) toggleDayCrossed(habitId, day); // remove crossed
        // Reset so a third tap doesn't re-trigger double-tap
        lastTapRef.current = { habitId: null, day: null, time: 0 };
      } else if (!done && !crossed) {
        // Empty → Completed ✓
        toggleDay(habitId, day);
      } else if (done) {
        // Completed → Crossed ✕
        toggleDay(habitId, day); // remove completed
        toggleDayCrossed(habitId, day); // add crossed
      } else if (crossed) {
        // Crossed → Completed ✓ (single tap on crossed cycles forward)
        toggleDayCrossed(habitId, day); // remove crossed
        toggleDay(habitId, day); // add completed
      }
    },
    [toggleDay, toggleDayCrossed, isDayCompleted, isDayCrossed],
  );

  // Auto-scroll to today/yesterday (mobile friendly)
  useEffect(() => {
    if (isCurrentMonth && scrollRef.current) {
      // Small timeout to ensure DOM is ready
      setTimeout(() => {
        const isMobile = window.innerWidth < 768; // Adjust breakpoint as needed

        let targetDay = todayDate;
        // If mobile and not the 1st of month, target yesterday for better context
        if (isMobile && todayDate > 1) {
          targetDay = todayDate - 1;
        }

        const targetEl = scrollRef.current.querySelector(
          `[data-day='${targetDay}']`,
        );

        if (targetEl) {
          if (isMobile) {
            // 152px is approx width of sticky columns (32px SN + 120px Habits)
            // We want the target day to be the first visible column after sticky
            const stickyWidth = 152;
            const scrollPos = targetEl.offsetLeft - stickyWidth;

            scrollRef.current.scrollTo({
              left: scrollPos,
              behavior: "smooth",
            });
          } else {
            // Desktop: Stick to centering today
            targetEl.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
              inline: "center",
            });
          }
        }
      }, 100);
    }
  }, [isCurrentMonth, year, month, todayDate]);

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
      {/* Instruction Tip */}
      <div className="grid-instruction-tip">
        <span className="tip-icon">💡</span>
        <span className="tip-text">
          <strong>Tap once</strong> = mark as done ✓ &nbsp;|&nbsp;{" "}
          <strong>Tap again</strong> = mark as missed ✕ &nbsp;|&nbsp;{" "}
          <strong>Double-tap</strong> = clear ○
        </span>
      </div>

      <motion.table
        className="habit-table"
        initial="hidden"
        animate="visible"
        variants={tableVariants}
      >
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
          </tr>
          {/* Day letters + numbers */}
          <tr className="day-header-row">
            {dayHeaders.map((h) => (
              <th
                key={h.day}
                className={`col-day ${h.isToday ? "today-col" : ""}`}
                data-day={h.day}
              >
                <span className="day-letter">{h.letter}</span>
                <span className="day-num">{h.day}</span>
              </th>
            ))}
            <th className="col-done"></th>
            <th className="col-total"></th>
          </tr>
        </thead>
        <tbody>
          {habits.map((habit, hIndex) => {
            const stats = getHabitMonthlyCount(habit.id); // Assuming getHabitMonthlyCount is the equivalent of getHabitStats
            const currentDate = {
              year: today.getFullYear(),
              month: today.getMonth(),
              day: today.getDate(),
            };

            return (
              <motion.tr
                key={habit.id} // Changed from habit._id to habit.id to match original prop
                className="habit-row"
                variants={rowVariants}
              >
                <td className="cell-sn">{hIndex + 1}</td>
                <td className="cell-habit">
                  <div className="habit-name-row">
                    <span className="habit-label">{habit.name}</span>
                    <button
                      className="habit-delete"
                      onClick={() => removeHabit(habit.id)} // Changed from deleteHabit(habit._id) to removeHabit(habit.id)
                      title="Remove" // Changed from "Delete habit" to "Remove"
                    >
                      ✕
                    </button>
                  </div>
                </td>
                {dayHeaders.map((dayObj) => {
                  const dateKey = `${year}-${String(month + 1).padStart(
                    2,
                    "0",
                  )}-${String(dayObj.day).padStart(2, "0")}`;
                  // Re-evaluating status and isFuture based on original logic
                  const done = isDayCompleted(habit.id, dayObj.day);
                  const crossed = isDayCrossed(habit.id, dayObj.day);

                  const cellDate = new Date(year, month, dayObj.day);
                  const habitCreated = habit.createdAt
                    ? new Date(habit.createdAt)
                    : null;
                  const habitCreatedDay = habitCreated
                    ? new Date(
                        habitCreated.getFullYear(),
                        habitCreated.getMonth(),
                        habitCreated.getDate(),
                      )
                    : null;
                  const todayMidnight = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate(),
                  );
                  const isPast = cellDate < todayMidnight;
                  const isFuture = cellDate > todayMidnight;
                  const isAfterCreation = habitCreatedDay
                    ? cellDate >= habitCreatedDay
                    : false;
                  const autoCrossed =
                    !done && !crossed && isPast && isAfterCreation;

                  const showCrossed = crossed || autoCrossed;

                  // Determine class
                  let cellClass = "cell-day";
                  if (dayObj.isToday) cellClass += " today-cell";
                  if (done) cellClass += " completed";
                  if (showCrossed) cellClass += " crossed";
                  if (autoCrossed) cellClass += " auto-crossed";
                  if (isFuture) cellClass += " future-cell";

                  return (
                    <td
                      key={dayObj.day}
                      className={cellClass}
                      onClick={() => {
                        if (!isFuture) handleCellTap(habit.id, dayObj.day);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (!isFuture) toggleDayCrossed(habit.id, dayObj.day);
                      }}
                    >
                      <div className="checkbox-box">
                        {done && <span className="check-mark">✓</span>}
                        {showCrossed && <span className="cross-mark">✕</span>}
                      </div>
                    </td>
                  );
                })}

                <td className="cell-done">
                  <span className="done-text">
                    {stats} / {isCurrentMonth ? todayDate : daysInMonth}
                  </span>
                </td>
                <td className="cell-total">
                  {(() => {
                    const effectiveDays = isCurrentMonth
                      ? todayDate
                      : daysInMonth;
                    const pct =
                      effectiveDays > 0
                        ? Math.round((stats / effectiveDays) * 100)
                        : 0;
                    return (
                      <span
                        className={`total-pct ${pct === 0 ? "zero" : "nonzero"}`}
                      >
                        {pct}%
                      </span>
                    );
                  })()}
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </motion.table>
    </div>
  );
}
