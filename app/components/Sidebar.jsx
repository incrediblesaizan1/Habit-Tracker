"use client";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function RightSidebar({
  habits,
  totalCompleted,
  totalCrossed,
  totalPossible,
  completionPercent,
  month,
  year,
}) {
  const uncompleted = totalPossible - totalCompleted;
  const today = new Date();
  const todayStr = `${MONTH_NAMES[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (completionPercent / 100) * circumference;

  return (
    <div className="sidebar">
      {/* Habits Stats */}
      <div className="sidebar-card orange-top">
        <div className="stats-section">
          <div className="stats-label">Total Habits Completed</div>
          <div className="stats-value green">{totalCompleted}</div>
          <div className="stats-divider" />
          <div className="stats-missed-label">Total Missed</div>
          <div className="stats-missed-value">{totalCrossed}</div>
          <div className="stats-divider" />
          <div className="stats-sub-label">Total Uncompleted</div>
          <div className="stats-sub-value">{uncompleted}</div>
        </div>
      </div>

      {/* Monthly Progress */}
      <div className="sidebar-card accent-top">
        <div className="progress-card">
          <div className="progress-card-title">Monthly Progress</div>
          <div className="progress-ring-wrap">
            <svg width="110" height="110" viewBox="0 0 110 110">
              <circle className="pr-bg" cx="55" cy="55" r={radius} />
              <circle
                className="pr-fill"
                cx="55"
                cy="55"
                r={radius}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="pr-text">
              <span className="pr-num">{totalCompleted}</span>
              <span className="pr-denom">/ {totalPossible}</span>
            </div>
          </div>
          <div className="progress-pct">{completionPercent}%</div>
          <div className="today-badge">
            <span>Today&apos;s Date</span>
            <span className="today-badge-date">{todayStr}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
