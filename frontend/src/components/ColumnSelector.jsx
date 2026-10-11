// Name: DataViz Tool - Column Selector Component
// Minimal flat green theme — no blur/glow/shimmer

import { useState } from "react";

// ─────────────────────────────────────────────────────────────
// CHART TYPES CONFIG
// ─────────────────────────────────────────────────────────────
const CHART_TYPES = [
  { value: "bar",       label: "Bar Chart",       icon: "📊", needsY: true,  multiY: true  },
  { value: "line",      label: "Line Chart",      icon: "📈", needsY: true,  multiY: true  },
  { value: "area",      label: "Area Chart",      icon: "🌊", needsY: true,  multiY: true  },
  { value: "scatter",   label: "Scatter Chart",   icon: "🔵", needsY: true,  multiY: false },
  { value: "histogram", label: "Histogram",       icon: "📉", needsY: false, multiY: false },
  { value: "pie",       label: "Pie Chart",       icon: "🥧", needsY: false, multiY: false },
];


// ─────────────────────────────────────────────────────────────
// COLUMN SELECTOR COMPONENT
// Props:
//   darkMode    — boolean for theme
//   columns     — string[] of all column names
//   col_types   — { colName: "numeric" | "categorical" | "datetime" }
//   suggestions — array of { chart_type, reason } from backend (optional)
//   isLoading   — boolean, true while chart is being generated
//   onGenerate  — called with ({ xCol, yCol, chartType }) when user clicks Generate
// ─────────────────────────────────────────────────────────────
const ColumnSelector = ({
  darkMode,
  columns,
  col_types,
  suggestions = [],
  isLoading,
  onGenerate,
}) => {
  const [xCol,      setXCol]      = useState(() => columns[0] || "");
  // Single-select y for scatter; multi-select array for bar/line/area
  const [yCols,     setYCols]     = useState(() => {
    const firstNumeric = columns.find((c) => col_types?.[c] === "numeric");
    return firstNumeric ? [firstNumeric] : columns[1] ? [columns[1]] : [];
  });
  const [chartType, setChartType] = useState("bar");

  const selectedChart = CHART_TYPES.find((c) => c.value === chartType);
  const needsY        = selectedChart?.needsY ?? true;
  const isMultiY      = selectedChart?.multiY ?? false;

  // ── Toggle a y column in/out of multi-select ──
  const toggleYCol = (col) => {
    setYCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  // ── Apply a suggestion ──
  const applySuggestion = (suggestion) => {
    setChartType(suggestion.chart_type);
  };

  // ── Derive the effective single y value (for single-select charts) ──
  const singleYCol = yCols[0] || "";

  // ── Validate before generating ──
  const canGenerate = xCol && (needsY ? (isMultiY ? yCols.length > 0 : singleYCol) : true) && !isLoading;

  // ── Handle generate click ──
  const handleGenerate = () => {
    if (!canGenerate) return;
    let yColValue = "";
    if (needsY) {
      yColValue = isMultiY ? yCols.join(",") : singleYCol;
    }
    onGenerate({ xCol, yCol: yColValue, chartType });
  };

  // ── Shared select styles ──
  const selectClass = `
    w-full px-4 py-3 rounded-xl text-sm
    border transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/50
    appearance-none cursor-pointer
    ${darkMode
      ? "bg-white/[0.04] border-white/[0.08] text-white hover:border-white/[0.15]"
      : "bg-white border-gray-200 text-gray-900 hover:border-green-200"
    }
  `;

  const labelClass = `
    block text-xs font-semibold mb-2 uppercase tracking-wider
    ${darkMode ? "text-gray-500" : "text-gray-400"}
  `;


  return (
    <div className="w-full">

      {/* ── Title ── */}
      <div className="mb-6">
        <h2
          className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Build Your Chart
        </h2>
        <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
          Select columns and chart type, then click Generate
        </p>
      </div>

      {/* ── Smart Suggestions (if any) ── */}
      {suggestions.length > 0 && (
        <div className="mb-6">
          <p className={`text-xs font-semibold mb-2.5 uppercase tracking-wider ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
            Suggestions
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => {
              const chart = CHART_TYPES.find((c) => c.value === s.chart_type);
              const isActive = chartType === s.chart_type;
              return (
                <button
                  key={i}
                  onClick={() => applySuggestion(s)}
                  title={s.reason}
                  className={`
                    flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold
                    transition-colors duration-200
                    ${isActive
                      ? "text-white"
                      : darkMode
                        ? "border border-white/[0.08] bg-white/[0.04] text-gray-300 hover:border-green-500/30 hover:bg-green-500/5"
                        : "border border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50"
                    }
                  `}
                  style={isActive ? { background: "#16a34a" } : {}}
                >
                  <span>{chart?.icon}</span>
                  <span>{chart?.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Chart Type Selector ── */}
      <div className="mb-5">
        <p className={labelClass}>Chart type</p>
        <div className="grid grid-cols-3 gap-2.5">
          {CHART_TYPES.map((c) => {
            const isSelected = chartType === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setChartType(c.value)}
                className={`
                  flex flex-col items-center gap-2 px-2 py-4 rounded-2xl
                  text-xs font-semibold transition-colors duration-200
                  ${isSelected
                    ? "text-white"
                    : darkMode
                      ? "border border-white/[0.08] bg-white/[0.03] text-gray-400 hover:border-white/[0.15] hover:text-gray-200"
                      : "border border-gray-200 bg-white text-gray-500 hover:border-green-200 hover:text-gray-700"
                  }
                `}
                style={isSelected ? {
                  background: "#16a34a",
                  border: "1px solid #16a34a",
                } : {}}
              >
                <span className="text-2xl">{c.icon}</span>
                <span className="text-center leading-tight">{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Column Selectors ── */}
      <div className={`grid gap-4 ${needsY ? "grid-cols-2" : "grid-cols-1"}`}>

        {/* X Axis */}
        <div>
          <label className={labelClass}>
            X axis column
          </label>
          <div className="relative">
            <select
              value={xCol}
              onChange={(e) => setXCol(e.target.value)}
              className={selectClass}
            >
              <option value="" className={darkMode ? "bg-gray-900 text-gray-400" : "bg-white text-gray-500"}>Select column...</option>
              {columns.map((col) => (
                <option key={col} value={col} className={darkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"}>
                  {col} ({col_types?.[col] || "?"})
                </option>
              ))}
            </select>
            <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Y Axis — hidden for pie and histogram */}
        {needsY && (
          <div>
            <label className={labelClass}>
              {isMultiY ? "Y axis columns" : "Y axis column"}
              {isMultiY && (
                <span className={`ml-1.5 font-normal normal-case tracking-normal ${darkMode ? "text-gray-600" : "text-gray-400"}`}>
                  (multi-select)
                </span>
              )}
            </label>

            {/* Multi-select list for bar/line/area */}
            {isMultiY ? (
              <div
                className="rounded-xl overflow-y-auto"
                style={{
                  maxHeight: "140px",
                  border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                  background: darkMode ? "rgba(255,255,255,0.03)" : "#ffffff",
                }}
              >
                {columns.map((col) => {
                  const isChecked = yCols.includes(col);
                  return (
                    <button
                      key={col}
                      onClick={() => toggleYCol(col)}
                      className={`
                        w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left
                        transition-colors duration-150
                        ${isChecked
                          ? darkMode
                            ? "bg-green-500/15 text-green-300"
                            : "bg-green-50 text-green-700"
                          : darkMode
                            ? "text-gray-400 hover:bg-white/[0.04] hover:text-gray-200"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }
                      `}
                    >
                      {/* Checkbox indicator */}
                      <span
                        className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center"
                        style={{
                          background: isChecked
                            ? "#16a34a"
                            : darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                          border: `1px solid ${isChecked ? "transparent" : darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                        }}
                      >
                        {isChecked && (
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {col}
                        <span className={`ml-1 ${darkMode ? "text-gray-600" : "text-gray-400"}`}>({col_types?.[col] || "?"})</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Single select for scatter */
              <div className="relative">
                <select
                  value={singleYCol}
                  onChange={(e) => setYCols([e.target.value])}
                  className={selectClass}
                >
                  <option value="" className={darkMode ? "bg-gray-900 text-gray-400" : "bg-white text-gray-500"}>Select column...</option>
                  {columns.map((col) => (
                    <option key={col} value={col} className={darkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"}>
                      {col} ({col_types?.[col] || "?"})
                    </option>
                  ))}
                </select>
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Info notes for chart types ── */}
      {!needsY && chartType === "pie" && (
        <p className={`text-xs mt-2.5 ${darkMode ? "text-gray-600" : "text-gray-400"}`}>
          Pie chart uses value counts of the selected column automatically.
        </p>
      )}
      {!needsY && chartType === "histogram" && (
        <p className={`text-xs mt-2.5 ${darkMode ? "text-gray-600" : "text-gray-400"}`}>
          Histogram bucket count is chosen automatically based on your data's spread and size.
        </p>
      )}

      {/* ── Generate Button — flat, no shimmer/glow ── */}
      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className={`
          w-full mt-6 py-3.5 rounded-2xl text-sm font-bold
          transition-colors duration-200
          ${canGenerate
            ? "text-white cursor-pointer"
            : darkMode
              ? "bg-white/[0.05] border border-white/[0.08] text-gray-600 cursor-not-allowed"
              : "bg-gray-100 border border-gray-200 text-gray-300 cursor-not-allowed"
          }
        `}
        style={canGenerate ? { background: "#16a34a" } : {}}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2.5">
            <span
              className="rounded-full animate-spin"
              style={{
                width: "18px",
                height: "18px",
                border: "2.5px solid rgba(255,255,255,0.25)",
                borderTop: "2.5px solid #fff",
              }}
            />
            Generating chart...
          </span>
        ) : (
          <span>{`Generate ${selectedChart?.label || "Chart"}`}</span>
        )}
      </button>

    </div>
  );
};

export default ColumnSelector;
