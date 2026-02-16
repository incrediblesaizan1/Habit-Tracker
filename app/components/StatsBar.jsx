"use client";

export default function BottomCharts({ dailyVolume, daysInMonth, habits }) {
  const maxVol = Math.max(...dailyVolume, 1);

  // Cumulative data
  const cumulative = [];
  let runningTotal = 0;
  for (let i = 0; i < dailyVolume.length; i++) {
    runningTotal += dailyVolume[i];
    cumulative.push(runningTotal);
  }
  const maxCum = Math.max(...cumulative, 1);

  // Daily consistency % data
  const totalHabits = habits.length || 1;
  const consistency = dailyVolume.map((v) =>
    Math.round((v / totalHabits) * 100),
  );
  const maxCons = Math.max(...consistency, 1);

  // Chart dimensions
  const W = 320,
    H = 130,
    PL = 28,
    PB = 20,
    PT = 4,
    PR = 4;
  const chartW = W - PL - PR;
  const chartH = H - PB - PT;

  function yTicks(maxVal) {
    const step = Math.max(1, Math.ceil(maxVal / 4));
    const ticks = [];
    for (let v = 0; v <= maxVal; v += step) ticks.push(v);
    if (ticks[ticks.length - 1] < maxVal) ticks.push(maxVal);
    return ticks;
  }

  function renderBarChart(data, maxVal) {
    const ticks = yTicks(maxVal);
    const barW = Math.max(2, chartW / daysInMonth - 2);
    return (
      <svg
        className="chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {ticks.map((v) => {
          const y = PT + chartH - (v / maxVal) * chartH;
          return (
            <g key={v}>
              <line
                className="chart-grid-line"
                x1={PL}
                y1={y}
                x2={W - PR}
                y2={y}
              />
              <text
                className="chart-axis-label"
                x={PL - 4}
                y={y + 3}
                textAnchor="end"
              >
                {v}
              </text>
            </g>
          );
        })}
        {/* Bars */}
        {data.map((v, i) => {
          const x = PL + (i / daysInMonth) * chartW + 1;
          const h = maxVal > 0 ? (v / maxVal) * chartH : 0;
          return (
            <rect
              key={i}
              className="chart-bar-rect"
              x={x}
              y={PT + chartH - h}
              width={barW}
              height={h}
            />
          );
        })}
        {/* X axis labels */}
        {data.map((_, i) => {
          if (daysInMonth <= 14 || i % 2 === 0) {
            const x = PL + (i / daysInMonth) * chartW + barW / 2;
            return (
              <text
                key={i}
                className="chart-axis-label"
                x={x}
                y={H - 4}
                textAnchor="middle"
              >
                {i + 1}
              </text>
            );
          }
          return null;
        })}
      </svg>
    );
  }

  function renderLineChart(data, maxVal) {
    const ticks = yTicks(maxVal);
    const points = data.map((v, i) => {
      const x = PL + (i / Math.max(data.length - 1, 1)) * chartW;
      const y = PT + chartH - (v / maxVal) * chartH;
      return { x, y };
    });
    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
    const areaPath = `${linePath} L ${points[points.length - 1]?.x || PL} ${PT + chartH} L ${points[0]?.x || PL} ${PT + chartH} Z`;

    return (
      <svg
        className="chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((v) => {
          const y = PT + chartH - (v / maxVal) * chartH;
          return (
            <g key={v}>
              <line
                className="chart-grid-line"
                x1={PL}
                y1={y}
                x2={W - PR}
                y2={y}
              />
              <text
                className="chart-axis-label"
                x={PL - 4}
                y={y + 3}
                textAnchor="end"
              >
                {v}
              </text>
            </g>
          );
        })}
        {points.length > 1 && (
          <>
            <path d={areaPath} className="chart-area-fill" />
            <path d={linePath} className="chart-line" />
          </>
        )}
        {data.map((_, i) => {
          if (daysInMonth <= 14 || i % 2 === 0) {
            const x = PL + (i / Math.max(data.length - 1, 1)) * chartW;
            return (
              <text
                key={i}
                className="chart-axis-label"
                x={x}
                y={H - 4}
                textAnchor="middle"
              >
                {i + 1}
              </text>
            );
          }
          return null;
        })}
      </svg>
    );
  }

  function renderDotChart(data, maxVal) {
    const ticks = yTicks(maxVal);
    const points = data.map((v, i) => {
      const x = PL + (i / Math.max(data.length - 1, 1)) * chartW;
      const y = PT + chartH - (v / maxVal) * chartH;
      return { x, y };
    });
    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");

    return (
      <svg
        className="chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {ticks.map((v) => {
          const y = PT + chartH - (v / maxVal) * chartH;
          return (
            <g key={v}>
              <line
                className="chart-grid-line"
                x1={PL}
                y1={y}
                x2={W - PR}
                y2={y}
              />
              <text
                className="chart-axis-label"
                x={PL - 4}
                y={y + 3}
                textAnchor="end"
              >
                {v}
              </text>
            </g>
          );
        })}
        {points.length > 1 && (
          <path
            d={linePath}
            className="chart-line"
            style={{ strokeWidth: 1 }}
          />
        )}
        {points.map((p, i) => (
          <circle key={i} className="chart-dot" cx={p.x} cy={p.y} r="2.5" />
        ))}
        {data.map((_, i) => {
          if (daysInMonth <= 14 || i % 2 === 0) {
            const x = PL + (i / Math.max(data.length - 1, 1)) * chartW;
            return (
              <text
                key={i}
                className="chart-axis-label"
                x={x}
                y={H - 4}
                textAnchor="middle"
              >
                {i + 1}
              </text>
            );
          }
          return null;
        })}
      </svg>
    );
  }

  return (
    <div className="charts-row">
      <div className="chart-card">
        <div className="chart-card-title">Daily Completions</div>
        <div className="chart-area">{renderBarChart(dailyVolume, maxVol)}</div>
      </div>
      <div className="chart-card">
        <div className="chart-card-title">Cumulative Progress</div>
        <div className="chart-area">{renderLineChart(cumulative, maxCum)}</div>
      </div>
      <div className="chart-card">
        <div className="chart-card-title">Daily Consistency (%)</div>
        <div className="chart-area">{renderDotChart(consistency, maxCons)}</div>
      </div>
    </div>
  );
}
