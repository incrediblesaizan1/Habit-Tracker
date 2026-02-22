"use client";

export default function DailyFocus({
  habits,
  year,
  month,
  todayDate,
  isCurrentMonth,
  totalCompleted, // overall total
  totalMissed, // you will pass an overall total missed if available, or compute it
  getHabitMonthlyCount,
  isDayCompleted,
  isDayCrossed,
}) {
  // Compute today's stats if it's the current month
  let todayCompleted = 0;
  let todayMissed = 0;
  const targetToday = habits.length;

  if (isCurrentMonth && todayDate > 0) {
    habits.forEach((h) => {
      if (isDayCompleted(h.id, todayDate)) {
        todayCompleted++;
      } else if (isDayCrossed(h.id, todayDate)) {
        todayMissed++;
      }
    });
  }

  // Today Progress %
  const todayProgressPct =
    targetToday > 0 ? Math.round((todayCompleted / targetToday) * 100) : 0;

  // Monthly stats
  // We can compute roughly by iterating up to todayDate if current month, or daysInMonth if past
  const effectiveDays = isCurrentMonth
    ? todayDate
    : new Date(year, month + 1, 0).getDate();
  const totalTarget = habits.length * effectiveDays;
  const monthCompleted = totalCompleted; // passed from useHabits
  const monthMissed = totalMissed; // we need to ensure useHabits passes this

  return (
    <div className="daily-focus-container">
      <h2 className="section-heading">Daily Focus</h2>

      <div className="df-grid">
        {/* Left: Today */}
        <div className="df-card df-today">
          <div className="df-today-header">
            <h3>Today</h3>
            <span className="df-date-label">
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="df-today-content">
            <div className="df-today-stats">
              <div className="df-stat-group">
                <span className="df-stat-label">Habits Completed</span>
                <span className="df-stat-value">{todayCompleted}</span>
              </div>
              <div className="df-stat-group">
                <span className="df-stat-label">Habits Missed</span>
                <span className="df-stat-value">{todayMissed}</span>
              </div>
            </div>

            <div className="df-today-ring">
              <div
                className="progress-ring-wrap"
                style={{ width: 90, height: 90 }}
              >
                <svg width="90" height="90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" className="pr-bg" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    className="pr-fill"
                    style={{
                      strokeDasharray: 264,
                      strokeDashoffset: 264 - (264 * todayProgressPct) / 100,
                    }}
                  />
                </svg>
                <div className="pr-text">
                  <span className="pr-num-small">
                    {todayCompleted}/{targetToday}
                  </span>
                  <span className="pr-denom">{todayProgressPct}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Target Habits */}
        <div className="df-card df-target">
          <div className="df-target-row">
            <span className="df-target-label">Target Habits</span>
            <span className="df-target-val">{targetToday}</span>
          </div>
          <div className="df-target-row">
            <span className="df-target-label">Today</span>
            <span className="df-target-val">{todayCompleted}</span>
          </div>
          <div className="df-target-row">
            <span className="df-target-label">Habits Missed</span>
            <span className="df-target-val">{todayMissed}</span>
          </div>
          <div className="df-progress-bar-wrap">
            <div className="df-progress-bar">
              <div
                className="df-progress-fill"
                style={{ width: `${todayProgressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Total Stats */}
        <div className="df-card df-totals">
          <div className="df-total-group">
            <span className="df-total-label">Total Habits Done</span>
            <span className="df-total-value">{monthCompleted}</span>
          </div>
          <div className="df-total-group">
            <span className="df-total-label missed-label">Total Missed</span>
            <span className="df-total-value missed-value">{monthMissed}</span>
          </div>
          <div className="df-total-legend">
            <div className="checkbox-box-demo completed-demo">✓</div>
            <span>Done</span>
            <div
              className="checkbox-box-demo crossed-demo"
              style={{ marginLeft: 10 }}
            >
              ✕
            </div>
            <span>Missed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
