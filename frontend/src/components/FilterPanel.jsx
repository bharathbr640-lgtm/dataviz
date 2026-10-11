// Name: DataViz Tool - Filter Panel Component
// Minimal flat green theme

import { useState } from "react";
import { filterData, resetFilter, exportCsv } from "../utils/api";

// ─────────────────────────────────────────────────────────────
// OPERATOR CONFIG
// Human-readable labels for each operator
// ─────────────────────────────────────────────────────────────
const OPERATORS = [
  { value: "eq",       label: "Equals (=)"          },
  { value: "gt",       label: "Greater than (>)"     },
  { value: "gte",      label: "Greater or equal (≥)" },
  { value: "lt",       label: "Less than (<)"        },
  { value: "lte",      label: "Less or equal (≤)"   },
  { value: "contains", label: "Contains"             },
];


// ─────────────────────────────────────────────────────────────
// HELPER: Count badge — "Showing X of Y rows"
// ─────────────────────────────────────────────────────────────
const CountBadge = ({ filteredRows, totalRows, darkMode }) => {
  const hasFilter = filteredRows !== null && totalRows !== null;
  if (!hasFilter) return null;

  const pct   = totalRows > 0 ? Math.round((filteredRows / totalRows) * 100) : 0;
  const color = filteredRows === 0
    ? { bg: darkMode ? "rgba(239,68,68,0.12)"  : "rgba(239,68,68,0.08)",  text: "#f87171", border: "rgba(239,68,68,0.25)"  }
    : { bg: darkMode ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.08)", text: darkMode ? "#4ade80" : "#16a34a", border: "rgba(34,197,94,0.25)" };

  return (
    <div
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
      style={{
        background: color.bg,
        border: `1px solid ${color.border}`,
        color: color.text,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 3H2l8 9.46V19l4 2V12.46L22 3z"/>
      </svg>
      Showing {filteredRows.toLocaleString()} of {totalRows.toLocaleString()} rows
      <span
        className="px-1.5 py-0.5 rounded-md text-xs font-bold"
        style={{
          background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          color: color.text,
        }}
      >
        {pct}%
      </span>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────
// FILTERED RESULTS TABLE
// ─────────────────────────────────────────────────────────────
const FilteredTable = ({ columns, preview, darkMode }) => {
  if (!preview || preview.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <span className="text-4xl">🔍</span>
        <p
          className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          No rows match the filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl" style={{ maxHeight: "360px", overflowY: "auto" }}>
      <table className="w-full text-xs border-collapse" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="text-left px-4 py-3 font-semibold whitespace-nowrap sticky top-0 z-10"
                style={{
                  background: darkMode ? "rgba(17,24,39,0.98)" : "rgba(249,250,251,0.98)",
                  color: darkMode ? "#9ca3af" : "#6b7280",
                  borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              style={{
                background:
                  rowIdx % 2 === 0
                    ? darkMode ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)"
                    : "transparent",
                borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"}`,
              }}
            >
              {columns.map((col) => (
                <td
                  key={col}
                  className="px-4 py-2.5 whitespace-nowrap max-w-[200px] truncate"
                  style={{ color: darkMode ? "#d1d5db" : "#374151" }}
                  title={String(row[col] ?? "")}
                >
                  {row[col] !== null && row[col] !== undefined ? String(row[col]) : (
                    <span style={{ color: darkMode ? "#4b5563" : "#9ca3af" }}>—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────
// FILTER PANEL COMPONENT
// Props:
//   darkMode  — boolean for theme
//   columns   — string[] of all column names from uploaded file
//   col_types — { colName: "numeric" | "categorical" | "datetime" }
//   fileUploaded — boolean, true once a file has been uploaded
//
// Filters are stacked server-side: each "Apply Filter" call
// AND-composes onto whatever filter is already active in the
// session, rather than always filtering the original upload.
// "Reset filters" clears all of them and goes back to the
// full dataset.
// ─────────────────────────────────────────────────────────────
const FilterPanel = ({ darkMode, columns, col_types, fileUploaded }) => {
  const [column,       setColumn]       = useState(columns[0] || "");
  const [operator,     setOperator]     = useState("eq");
  const [value,        setValue]        = useState("");
  const [result,       setResult]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [resetting,    setResetting]    = useState(false);
  const [exporting,    setExporting]    = useState(false);
  const [exportError,  setExportError]  = useState(null);
  const [appliedCount, setAppliedCount] = useState(0);

  // ── Apply filter — stacks onto any already-active filters ──
  const handleApply = async () => {
    if (!column || !operator || value === "") return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await filterData({ column, operator, value });

    if (err) {
      setError(err);
    } else {
      setResult(data);
      setAppliedCount((c) => c + 1);
      setValue("");
    }
    setLoading(false);
  };

  // ── Clear the current input only (does not touch server-side filter state) ──
  const handleClear = () => {
    setValue("");
    setError(null);
  };

  // ── Reset all stacked filters back to the full dataset ──
  const handleResetFilters = async () => {
    setResetting(true);
    setError(null);

    const { data, error: err } = await resetFilter();

    if (err) {
      setError(err);
    } else {
      setResult(data);
      setAppliedCount(0);
    }
    setResetting(false);
  };

  // ── Export CSV (exports the current filtered view) ──
  const handleExport = async () => {
    setExporting(true);
    setExportError(null);

    const { blob, error: err } = await exportCsv();

    if (err) {
      setExportError(err);
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dataviz_export.csv";
      a.click();
      URL.revokeObjectURL(url);
    }
    setExporting(false);
  };

  // ── Shared select style ──
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

  const inputClass = `
    w-full px-4 py-3 rounded-xl text-sm
    border transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/50
    ${darkMode
      ? "bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-600 hover:border-white/[0.15]"
      : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 hover:border-green-200"
    }
  `;

  const canApply = column && operator && value.trim() !== "" && !loading;

  return (
    <div className="w-full flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2
            className={`text-base font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Filter Data
          </h2>
          <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
            {appliedCount > 0
              ? `${appliedCount} filter${appliedCount !== 1 ? "s" : ""} applied — each new filter narrows further`
              : "Filter rows by column value and operator"}
          </p>
        </div>

        {/* Reset filters — only shown once at least one filter is active */}
        {appliedCount > 0 && (
          <button
            onClick={handleResetFilters}
            disabled={resetting}
            className={`
              flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold
              transition-colors duration-200
              ${darkMode
                ? "border border-white/[0.08] bg-white/[0.04] text-gray-400 hover:border-white/[0.15] hover:text-gray-200"
                : "border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }
            `}
          >
            {resetting ? (
              <span
                className="w-3 h-3 rounded-full animate-spin"
                style={{ border: "2px solid rgba(148,163,184,0.3)", borderTop: "2px solid currentColor" }}
              />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
            )}
            Reset filters
          </button>
        )}
      </div>

      {/* ── Controls Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Column select */}
        <div>
          <label className={labelClass}>Column</label>
          <div className="relative">
            <select
              value={column}
              onChange={(e) => setColumn(e.target.value)}
              className={selectClass}
            >
              {columns.map((col) => (
                <option
                  key={col}
                  value={col}
                  className={darkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"}
                >
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

        {/* Operator select */}
        <div>
          <label className={labelClass}>Operator</label>
          <div className="relative">
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className={selectClass}
            >
              {OPERATORS.map((op) => (
                <option
                  key={op.value}
                  value={op.value}
                  className={darkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"}
                >
                  {op.label}
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

        {/* Value input */}
        <div>
          <label className={labelClass}>Value</label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleApply(); }}
            placeholder="Enter filter value..."
            className={inputClass}
          />
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex items-center gap-3 flex-wrap">

        {/* Apply Filter — flat green */}
        <button
          onClick={handleApply}
          disabled={!canApply}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
            transition-colors duration-200
            ${canApply
              ? "text-white cursor-pointer"
              : darkMode
                ? "bg-white/[0.05] border border-white/[0.08] text-gray-600 cursor-not-allowed"
                : "bg-gray-100 border border-gray-200 text-gray-300 cursor-not-allowed"
            }
          `}
          style={canApply ? { background: "#16a34a" } : {}}
        >
          {loading ? (
            <>
              <span
                className="w-4 h-4 rounded-full animate-spin"
                style={{
                  border: "2px solid rgba(255,255,255,0.25)",
                  borderTop: "2px solid #fff",
                }}
              />
              Filtering...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 3H2l8 9.46V19l4 2V12.46L22 3z"/>
              </svg>
              Apply Filter
            </>
          )}
        </button>

        {/* Clear input */}
        <button
          onClick={handleClear}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
            transition-colors duration-200
            ${darkMode
              ? "border border-white/[0.08] bg-white/[0.04] text-gray-400 hover:border-white/[0.15] hover:text-gray-200"
              : "border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }
          `}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          Clear
        </button>

        {/* Download CSV — always visible when file is uploaded */}
        {fileUploaded && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
              transition-colors duration-200
              ${darkMode
                ? "border border-green-500/25 bg-green-500/10 text-green-400 hover:border-green-500/40 hover:bg-green-500/15"
                : "border border-green-200 bg-green-50 text-green-700 hover:border-green-300 hover:bg-green-100/60"
              }
            `}
          >
            {exporting ? (
              <>
                <span
                  className="w-3.5 h-3.5 rounded-full animate-spin"
                  style={{
                    border: "2px solid rgba(34,197,94,0.25)",
                    borderTop: "2px solid #22c55e",
                  }}
                />
                Exporting...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download CSV
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Export error ── */}
      {exportError && (
        <p className="text-sm text-red-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          ⚠ Export failed: {exportError}
        </p>
      )}

      {/* ── Filter Error ── */}
      {error && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{
            background: darkMode ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.20)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-sm text-red-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div className="flex flex-col gap-4">

          {/* Count badge */}
          <CountBadge
            filteredRows={result.filtered_rows}
            totalRows={result.total_rows}
            darkMode={darkMode}
          />

          {/* Table */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              border: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
              background: darkMode ? "rgba(17,24,39,0.6)" : "#ffffff",
            }}
          >
            <FilteredTable
              columns={result.columns}
              preview={result.preview}
              darkMode={darkMode}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default FilterPanel;
