// Name: DataViz Tool - Chart View Component
// Minimal flat green theme

import { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell, Legend,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ─────────────────────────────────────────────────────────────
// COLOR PALETTE
// Green-forward palette — works on dark and light bg
// ─────────────────────────────────────────────────────────────
const COLORS = [
  "#22c55e", "#16a34a", "#4ade80", "#15803d",
  "#86efac", "#059669", "#65a30d", "#a3e635",
];


// ─────────────────────────────────────────────────────────────
// HELPER: Transform backend data into Recharts-compatible format
// ─────────────────────────────────────────────────────────────
const transformData = (chartType, data) => {
  if (!data) return [];

  // Multi-series response: data has { x, series: [{name, y}] }
  if (data.series) {
    return (data.x || []).map((val, i) => {
      const point = { name: val };
      data.series.forEach((s) => {
        point[s.name] = s.y?.[i] ?? 0;
      });
      return point;
    });
  }

  switch (chartType) {
    case "bar":
    case "line":
    case "area":
    case "histogram":
      return (data.x || []).map((val, i) => ({
        name: val,
        value: data.y?.[i] ?? 0,
      }));

    case "scatter":
      return (data.x || []).map((val, i) => ({
        x: val,
        y: data.y?.[i] ?? 0,
      }));

    case "pie":
      return (data.labels || []).map((label, i) => ({
        name: label,
        value: data.values?.[i] ?? 0,
      }));

    default:
      return [];
  }
};


// ─────────────────────────────────────────────────────────────
// CUSTOM TOOLTIP
// A styled tooltip that adapts to dark/light mode
// ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, darkMode, chartType }) => {
  if (!active || !payload || payload.length === 0) return null;

  const bg = darkMode ? "#1f2937" : "#ffffff";
  const border = darkMode ? "#374151" : "#e5e7eb";
  const textPrimary = darkMode ? "#f9fafb" : "#111827";
  const textSecondary = darkMode ? "#9ca3af" : "#6b7280";

  const isMultiSeries = payload.length > 1;

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "10px",
        padding: "10px 14px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {chartType === "pie" ? (
        <>
          <p style={{ color: textPrimary, fontWeight: 600, fontSize: 13, margin: 0 }}>
            {payload[0].name}
          </p>
          <p style={{ color: textSecondary, fontSize: 12, margin: "4px 0 0 0" }}>
            Value: <span style={{ color: payload[0].payload?.fill || COLORS[0], fontWeight: 600 }}>
              {payload[0].value?.toLocaleString()}
            </span>
          </p>
        </>
      ) : isMultiSeries ? (
        <>
          <p style={{ color: textSecondary, fontSize: 12, margin: 0 }}>{label}</p>
          {payload.map((entry, i) => (
            <p key={i} style={{ color: entry.color, fontSize: 12, margin: "4px 0 0 0", fontWeight: 600 }}>
              {entry.name}: {entry.value?.toLocaleString()}
            </p>
          ))}
        </>
      ) : (
        <>
          <p style={{ color: textSecondary, fontSize: 12, margin: 0 }}>
            {label}
          </p>
          <p style={{ color: textPrimary, fontWeight: 600, fontSize: 13, margin: "4px 0 0 0" }}>
            {payload[0].value?.toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
};

// Custom tooltip specifically for scatter (shows x, y)
const ScatterTooltip = ({ active, payload, darkMode }) => {
  if (!active || !payload || payload.length === 0) return null;

  const bg = darkMode ? "#1f2937" : "#ffffff";
  const border = darkMode ? "#374151" : "#e5e7eb";
  const textPrimary = darkMode ? "#f9fafb" : "#111827";
  const textSecondary = darkMode ? "#9ca3af" : "#6b7280";

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "10px",
        padding: "10px 14px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <p style={{ color: textSecondary, fontSize: 12, margin: 0 }}>
        x: <span style={{ color: textPrimary, fontWeight: 600 }}>{payload[0]?.value}</span>
      </p>
      <p style={{ color: textSecondary, fontSize: 12, margin: "4px 0 0 0" }}>
        y: <span style={{ color: textPrimary, fontWeight: 600 }}>{payload[1]?.value}</span>
      </p>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────
// CUSTOM PIE LABEL
// ─────────────────────────────────────────────────────────────
const renderPieLabel = ({ name, percent }) => {
  if (percent < 0.03) return null;
  return `${name} (${(percent * 100).toFixed(1)}%)`;
};


// ─────────────────────────────────────────────────────────────
// CHART RENDERERS
// Each returns the appropriate Recharts chart for chartType
// ─────────────────────────────────────────────────────────────
const renderChart = (chartType, rechartsData, darkMode, xCol, yCol, rawData) => {
  const textColor = darkMode ? "#9ca3af" : "#6b7280";
  const gridColor = darkMode ? "#1f2937" : "#f3f4f6";
  const axisLineColor = darkMode ? "#374151" : "#e5e7eb";

  const commonAxisProps = {
    tick: { fill: textColor, fontSize: 12, fontFamily: "'DM Sans', sans-serif" },
    axisLine: { stroke: axisLineColor },
    tickLine: { stroke: axisLineColor },
  };

  // Detect multi-series from raw API response
  const seriesList = rawData?.series || null;

  switch (chartType) {
    case "bar":
      // ── Multi-series bar ──
      if (seriesList) {
        return (
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={rechartsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" {...commonAxisProps}
                label={{ value: xCol, position: "insideBottom", offset: -10, fill: textColor, fontSize: 12 }}
              />
              <YAxis {...commonAxisProps}
                label={{ value: yCol || "Count", angle: -90, position: "insideLeft", offset: 0, fill: textColor, fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip darkMode={darkMode} chartType="bar" />} cursor={{ fill: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }} />
              <Legend formatter={(value) => <span style={{ color: textColor, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>{value}</span>} />
              {seriesList.map((s, idx) => (
                <Bar key={s.name} dataKey={s.name} fill={COLORS[idx % COLORS.length]}
                  radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={600} animationEasing="ease-out" fillOpacity={0.85}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      }
      // ── Single-series bar ──
      return (
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={rechartsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="name"
              {...commonAxisProps}
              label={{ value: xCol, position: "insideBottom", offset: -10, fill: textColor, fontSize: 12 }}
            />
            <YAxis
              {...commonAxisProps}
              label={{ value: yCol || "Count", angle: -90, position: "insideLeft", offset: 0, fill: textColor, fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip darkMode={darkMode} chartType="bar" />} cursor={{ fill: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }} />
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              maxBarSize={56}
              animationDuration={600}
              animationEasing="ease-out"
            >
              {rechartsData.map((_, index) => (
                <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );

    // ── Histogram — same as bar but no gap between bars ──
    case "histogram":
      return (
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={rechartsData} barCategoryGap={0} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="name"
              {...commonAxisProps}
              angle={-30}
              textAnchor="end"
              interval={0}
              height={60}
              label={{ value: xCol, position: "insideBottom", offset: -30, fill: textColor, fontSize: 12 }}
            />
            <YAxis
              {...commonAxisProps}
              label={{ value: "Count", angle: -90, position: "insideLeft", offset: 0, fill: textColor, fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip darkMode={darkMode} chartType="histogram" />} cursor={{ fill: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }} />
            <Bar
              dataKey="value"
              fill={COLORS[0]}
              fillOpacity={0.8}
              radius={[3, 3, 0, 0]}
              animationDuration={600}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      );

    case "line":
      // ── Multi-series line ──
      if (seriesList) {
        return (
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={rechartsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" {...commonAxisProps}
                label={{ value: xCol, position: "insideBottom", offset: -10, fill: textColor, fontSize: 12 }}
              />
              <YAxis {...commonAxisProps}
                label={{ value: yCol || "Value", angle: -90, position: "insideLeft", offset: 0, fill: textColor, fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip darkMode={darkMode} chartType="line" />} />
              <Legend formatter={(value) => <span style={{ color: textColor, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>{value}</span>} />
              {seriesList.map((s, idx) => (
                <Line key={s.name} type="monotone" dataKey={s.name} stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: COLORS[idx % COLORS.length], strokeWidth: 1.5, stroke: darkMode ? "#030712" : "#ffffff" }}
                  activeDot={{ r: 5 }}
                  animationDuration={700} animationEasing="ease-out"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      }
      // ── Single-series line ──
      return (
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={rechartsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="name"
              {...commonAxisProps}
              label={{ value: xCol, position: "insideBottom", offset: -10, fill: textColor, fontSize: 12 }}
            />
            <YAxis
              {...commonAxisProps}
              label={{ value: yCol || "Count", angle: -90, position: "insideLeft", offset: 0, fill: textColor, fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip darkMode={darkMode} chartType="line" />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={COLORS[0]}
              strokeWidth={3}
              dot={{ r: 4, fill: COLORS[0], strokeWidth: 2, stroke: darkMode ? "#030712" : "#ffffff" }}
              activeDot={{ r: 6, fill: COLORS[0], strokeWidth: 2, stroke: darkMode ? "#030712" : "#ffffff" }}
              animationDuration={700}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      );

    // ── Area chart — line with flat fill below ──
    case "area":
      if (seriesList) {
        return (
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={rechartsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" {...commonAxisProps}
                label={{ value: xCol, position: "insideBottom", offset: -10, fill: textColor, fontSize: 12 }}
              />
              <YAxis {...commonAxisProps}
                label={{ value: yCol || "Value", angle: -90, position: "insideLeft", offset: 0, fill: textColor, fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip darkMode={darkMode} chartType="area" />} />
              <Legend formatter={(value) => <span style={{ color: textColor, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>{value}</span>} />
              {seriesList.map((s, idx) => (
                <Area key={s.name} type="monotone" dataKey={s.name}
                  stroke={COLORS[idx % COLORS.length]} strokeWidth={2.5}
                  fill={COLORS[idx % COLORS.length]}
                  fillOpacity={0.12}
                  dot={false} activeDot={{ r: 5 }}
                  animationDuration={700} animationEasing="ease-out"
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      }
      // Single-series area
      return (
        <ResponsiveContainer width="100%" height={380}>
          <AreaChart data={rechartsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="name"
              {...commonAxisProps}
              label={{ value: xCol, position: "insideBottom", offset: -10, fill: textColor, fontSize: 12 }}
            />
            <YAxis
              {...commonAxisProps}
              label={{ value: yCol || "Count", angle: -90, position: "insideLeft", offset: 0, fill: textColor, fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip darkMode={darkMode} chartType="area" />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={COLORS[0]}
              strokeWidth={3}
              fill={COLORS[0]}
              fillOpacity={0.14}
              dot={{ r: 3, fill: COLORS[0], strokeWidth: 2, stroke: darkMode ? "#030712" : "#ffffff" }}
              activeDot={{ r: 5 }}
              animationDuration={700}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      );

    case "pie":
      return (
        <ResponsiveContainer width="100%" height={380}>
          <PieChart>
            <Pie
              data={rechartsData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={130}
              paddingAngle={3}
              dataKey="value"
              label={renderPieLabel}
              labelLine={{ stroke: textColor, strokeWidth: 1 }}
              animationDuration={600}
              animationEasing="ease-out"
              stroke={darkMode ? "#030712" : "#ffffff"}
              strokeWidth={2}
            >
              {rechartsData.map((_, index) => (
                <Cell key={`pie-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip darkMode={darkMode} chartType="pie" />} />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span style={{ color: textColor, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      );

    case "scatter":
      return (
        <ResponsiveContainer width="100%" height={380}>
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              type="number"
              dataKey="x"
              name={xCol}
              {...commonAxisProps}
              label={{ value: xCol, position: "insideBottom", offset: -10, fill: textColor, fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yCol}
              {...commonAxisProps}
              label={{ value: yCol || "Count", angle: -90, position: "insideLeft", offset: 0, fill: textColor, fontSize: 12 }}
            />
            <Tooltip content={<ScatterTooltip darkMode={darkMode} />} />
            <Scatter
              data={rechartsData}
              fill={COLORS[0]}
              fillOpacity={0.75}
              animationDuration={600}
              animationEasing="ease-out"
            >
              {rechartsData.map((_, index) => (
                <Cell
                  key={`scatter-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.75}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      );

    default:
      return null;
  }
};


// ─────────────────────────────────────────────────────────────
// CHART TYPE ICONS — SVG chart-type indicators
// ─────────────────────────────────────────────────────────────
const chartTypeEmoji = {
  bar: "📊",
  line: "📈",
  pie: "🥧",
  scatter: "🔵",
  histogram: "📉",
  area: "🌊",
};


// ─────────────────────────────────────────────────────────────
// CHART VIEW COMPONENT
// Props:
//   darkMode   — boolean for theme
//   chartData  — response from /chart API
//                { chart_type, x_col, y_col, data: { x, y } or { labels, values } }
//   isLoading  — boolean while chart is being fetched
//   error      — string error message or null
// ─────────────────────────────────────────────────────────────
const ChartView = ({ darkMode, chartData, isLoading, error }) => {
  const chartRef = useRef(null);
  const [showExport, setShowExport] = useState(false);

  // Transform backend data → Recharts format
  const rechartsData = useMemo(() => {
    if (!chartData) return [];
    return transformData(chartData.chart_type, chartData.data);
  }, [chartData]);

  // ── EXPORT HANDLERS ──
  const handleExportPNG = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: darkMode ? "#111827" : "#ffffff" });
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${chartData.chart_type}_chart.png`;
    link.href = url;
    link.click();
  };

  const handleExportPDF = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: darkMode ? "#111827" : "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [canvas.width, canvas.height]
    });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(`${chartData.chart_type}_chart.pdf`);
  };

  // ── Shared container styles — flat, no blur ──
  const containerClass = `
    relative w-full rounded-2xl overflow-hidden
    transition-colors duration-300
  `;

  const containerStyle = {
    background: darkMode ? "rgba(255,255,255,0.02)" : "#ffffff",
    border: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
  };

  // ── LOADING STATE ──
  if (isLoading) {
    return (
      <div className={containerClass} style={containerStyle}>
        <div className="flex flex-col items-center justify-center h-80 gap-5">
          {/* Simple flat ring loader */}
          <div
            className="w-12 h-12 rounded-full animate-spin"
            style={{ border: "3px solid rgba(34,197,94,0.2)", borderTop: "3px solid #22c55e" }}
          />
          <p
            className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Building your chart...
          </p>
        </div>
      </div>
    );
  }

  // ── ERROR STATE ──
  if (error) {
    return (
      <div className={containerClass} style={containerStyle}>
        <div className="flex flex-col items-center justify-center h-80 gap-4 px-8 text-center">
          {/* Flat error icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: darkMode ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <p
            className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Could not generate chart
          </p>
          <p
            className="text-sm max-w-sm"
            style={{
              color: "#f87171",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {error}
          </p>
        </div>
      </div>
    );
  }

  // ── EMPTY STATE ──
  if (!chartData) {
    return (
      <div className={containerClass} style={containerStyle}>
        <div className="flex flex-col items-center justify-center h-80 gap-4">
          <span className="text-4xl">📊</span>
          <p
            className={`text-sm font-medium ${darkMode ? "text-gray-500" : "text-gray-400"}`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Select columns and click Generate Chart
          </p>
        </div>
      </div>
    );
  }

  // ── CHART STATE ──
  return (
    <div className={containerClass} style={containerStyle}>

      {/* Chart header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{
          borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        }}
      >
        <div>
          <h2
            className={`text-base font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {chartData.x_col}
            {chartData.y_col ? ` vs ${chartData.y_col}` : " — Distribution"}
          </h2>
          <p
            className={`text-xs mt-1 capitalize ${darkMode ? "text-gray-500" : "text-gray-400"}`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {chartData.chart_type} chart
          </p>
        </div>

        {/* Chart type badge and Export */}
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold"
            style={{
              background: darkMode ? "rgba(34,197,94,0.10)" : "rgba(34,197,94,0.06)",
              color: darkMode ? "#4ade80" : "#16a34a",
              border: `1px solid ${darkMode ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.15)"}`,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <span>{chartTypeEmoji[chartData.chart_type] || "📊"}</span>
            <span className="capitalize">{chartData.chart_type}</span>
          </span>

          <div className="relative">
            <button
              onClick={() => setShowExport(!showExport)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors duration-200"
              style={{
                background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                color: darkMode ? "#e5e7eb" : "#374151",
                border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Export
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showExport && (
              <div
                className="absolute right-0 mt-2 w-32 rounded-xl shadow-lg z-50 overflow-hidden"
                style={{
                  background: darkMode ? "#111827" : "#ffffff",
                  border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                }}
              >
                <button
                  onClick={() => { handleExportPNG(); setShowExport(false); }}
                  className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${darkMode ? "hover:bg-white/10 text-gray-200" : "hover:bg-black/5 text-gray-700"}`}
                >
                  Save as PNG
                </button>
                <button
                  onClick={() => { handleExportPDF(); setShowExport(false); }}
                  className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${darkMode ? "hover:bg-white/10 text-gray-200" : "hover:bg-black/5 text-gray-700"}`}
                >
                  Save as PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recharts chart area */}
      <div className="w-full px-3 py-5" ref={chartRef}>
        {renderChart(
          chartData.chart_type,
          rechartsData,
          darkMode,
          chartData.x_col,
          chartData.y_col,
          chartData.data
        )}
      </div>

    </div>
  );
};

export default ChartView;
