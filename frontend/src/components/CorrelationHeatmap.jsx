// Name: DataViz Tool - Correlation Heatmap Component
// Minimal flat green theme

import { useEffect, useState } from "react";
import { getCorrelation } from "../utils/api";

// ─────────────────────────────────────────────────────────────
// HELPER: Map a correlation value (-1 to 1) to a cell background color
// 1.0       → dark green   (strong positive)
// 0.5–0.99  → light green  (moderate positive)
// -0.5–0.49 → neutral gray
// -1.0–-0.51→ light red    (negative)
// Opacity is scaled to the absolute value for gradation
// ─────────────────────────────────────────────────────────────
const getCellStyle = (value, isDiag, darkMode) => {
  const abs = Math.abs(value);

  // Diagonal is always full dark green
  if (isDiag) {
    return {
      background: darkMode ? "rgba(34,197,94,0.35)" : "rgba(34,197,94,0.22)",
      color: darkMode ? "#4ade80" : "#15803d",
      fontWeight: 700,
    };
  }

  if (value >= 1.0) {
    return {
      background: darkMode ? `rgba(34,197,94,${0.15 + abs * 0.35})` : `rgba(34,197,94,${0.10 + abs * 0.30})`,
      color: darkMode ? "#4ade80" : "#15803d",
    };
  }
  if (value >= 0.5) {
    return {
      background: darkMode ? `rgba(74,222,128,${0.10 + abs * 0.25})` : `rgba(74,222,128,${0.07 + abs * 0.20})`,
      color: darkMode ? "#86efac" : "#166534",
    };
  }
  if (value <= -0.51) {
    return {
      background: darkMode ? `rgba(239,68,68,${0.10 + abs * 0.25})` : `rgba(239,68,68,${0.07 + abs * 0.20})`,
      color: darkMode ? "#fca5a5" : "#991b1b",
    };
  }
  // Neutral
  return {
    background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
    color: darkMode ? "#9ca3af" : "#6b7280",
  };
};


// ─────────────────────────────────────────────────────────────
// LEGEND ITEM — shows what each color means
// ─────────────────────────────────────────────────────────────
const LegendItem = ({ color, label, darkMode }) => (
  <div className="flex items-center gap-2">
    <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ background: color }} />
    <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
      style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {label}
    </span>
  </div>
);


// ─────────────────────────────────────────────────────────────
// CORRELATION HEATMAP COMPONENT
// Props:
//   darkMode     — boolean for theme
//   fileUploaded — boolean, true if a file has been uploaded
//   uploadKey    — unique key to trigger refresh on file upload
// ─────────────────────────────────────────────────────────────
const CorrelationHeatmap = ({ darkMode, fileUploaded, uploadKey }) => {
  const [matrix,  setMatrix]  = useState(null);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetchCorrelation = async () => {
    setLoading(true);
    setError(null);
    setMatrix(null);
    setColumns([]);

    const { data, error: err } = await getCorrelation();

    if (err) {
      setError(err);
    } else {
      setColumns(data.columns || []);
      setMatrix(data.matrix || []);
    }
    setLoading(false);
  };

  // ── Fetch on mount (if file is already uploaded) or when a new file is uploaded ──
  useEffect(() => {
    if (!fileUploaded) return;
    fetchCorrelation();
  }, [fileUploaded, uploadKey]);


  // ── LOADING ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5">
        <div
          className="w-10 h-10 rounded-full animate-spin"
          style={{ border: "3px solid rgba(34,197,94,0.2)", borderTop: "3px solid #22c55e" }}
        />
        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
          style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Computing correlations...
        </p>
      </div>
    );
  }

  // ── ERROR ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{
            background: darkMode ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.20)",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <p className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
          Could not load correlation
        </p>
        <p className="text-sm text-red-400 max-w-sm">{error}</p>

        {/* Retry Button */}
        <button
          onClick={fetchCorrelation}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold
            transition-colors duration-200 cursor-pointer
            ${darkMode
              ? "border border-white/[0.08] bg-white/[0.04] text-gray-400 hover:border-white/[0.15] hover:text-gray-200"
              : "border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }
          `}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
          Retry
        </button>
      </div>
    );
  }

  // ── NOT UPLOADED ──
  if (!fileUploaded) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <span className="text-4xl">📊</span>
        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
          style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Upload a file to see the correlation heatmap.
        </p>
      </div>
    );
  }

  // ── NO NUMERIC COLUMNS ──
  if (matrix !== null && columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <span className="text-4xl">📭</span>
        <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>
          Not enough numeric columns
        </p>
        <p className={`text-sm max-w-sm text-center ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
          Correlation requires at least 2 numeric columns. This dataset has fewer.
        </p>
      </div>
    );
  }

  if (!matrix) return null;

  return (
    <div className="w-full flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2
            className={`text-base font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Correlation Heatmap
          </h2>
          <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
            Pearson correlation between {columns.length} numeric column{columns.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          <LegendItem
            color={darkMode ? "rgba(34,197,94,0.50)"  : "rgba(34,197,94,0.40)"}
            label="Strong positive (≥ 0.5)"
            darkMode={darkMode}
          />
          <LegendItem
            color={darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}
            label="Neutral (−0.5 to 0.49)"
            darkMode={darkMode}
          />
          <LegendItem
            color={darkMode ? "rgba(239,68,68,0.40)"   : "rgba(239,68,68,0.30)"}
            label="Negative (≤ −0.5)"
            darkMode={darkMode}
          />
        </div>
      </div>

      {/* ── Heatmap Table ── */}
      <div className="overflow-x-auto rounded-xl"
        style={{
          border: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        }}
      >
        <table
          className="border-collapse"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            minWidth: "100%",
          }}
        >
          <thead>
            <tr>
              {/* Top-left empty cell */}
              <th
                className="px-3 py-3"
                style={{
                  background: darkMode ? "rgba(17,24,39,0.95)" : "rgba(249,250,251,0.95)",
                  minWidth: "120px",
                }}
              />
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-3 text-xs font-semibold text-center whitespace-nowrap"
                  style={{
                    background: darkMode ? "rgba(17,24,39,0.95)" : "rgba(249,250,251,0.95)",
                    color: darkMode ? "#9ca3af" : "#6b7280",
                    borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                    maxWidth: "120px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {/* Row header */}
                <td
                  className="px-4 py-3 text-xs font-semibold whitespace-nowrap"
                  style={{
                    background: darkMode ? "rgba(17,24,39,0.95)" : "rgba(249,250,251,0.95)",
                    color: darkMode ? "#9ca3af" : "#6b7280",
                    borderRight: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                    borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"}`,
                    maxWidth: "120px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {columns[rowIdx]}
                </td>

                {/* Correlation cells */}
                {row.map((val, colIdx) => {
                  const isDiag = rowIdx === colIdx;
                  const cellStyle = getCellStyle(val, isDiag, darkMode);

                  return (
                    <td
                      key={colIdx}
                      className="px-3 py-3 text-xs text-center font-medium"
                      title={`${columns[rowIdx]} vs ${columns[colIdx]}: ${val}`}
                      style={{
                        ...cellStyle,
                        borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"}`,
                        minWidth: "80px",
                        cursor: "default",
                      }}
                    >
                      {val.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Interpretation note ── */}
      <p
        className={`text-xs ${darkMode ? "text-gray-600" : "text-gray-400"}`}
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        Values range from −1 (perfect negative correlation) to +1 (perfect positive correlation). Values near 0 indicate little to no linear relationship.
      </p>

    </div>
  );
};

export default CorrelationHeatmap;
