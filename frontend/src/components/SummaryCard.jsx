// Name: DataViz Tool - Summary Card Component
// Minimal flat green theme

import { useEffect, useState } from "react";
import { getSummary } from "../utils/api";

// ─────────────────────────────────────────────────────────────
// HELPER: Format a number cleanly
// ─────────────────────────────────────────────────────────────
const fmt = (val) => {
  if (val === null || val === undefined) return "—";
  return Number(val).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};


// ─────────────────────────────────────────────────────────────
// STAT PILL — small metric badge inside each card
// ─────────────────────────────────────────────────────────────
const StatPill = ({ label, value, darkMode, color = "green" }) => {
  const colorMap = {
    green:   darkMode ? "bg-green-900/40 text-green-300"   : "bg-green-50 text-green-700",
    emerald: darkMode ? "bg-emerald-900/40 text-emerald-300": "bg-emerald-50 text-emerald-700",
    amber:   darkMode ? "bg-amber-900/40 text-amber-300"    : "bg-amber-50 text-amber-700",
    red:     darkMode ? "bg-red-900/40 text-red-300"        : "bg-red-50 text-red-700",
  };

  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-lg ${colorMap[color]}`}>
      <span className="text-xs font-medium opacity-70">{label}</span>
      <span className="text-sm font-semibold mt-0.5">{value}</span>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────
// SINGLE COLUMN CARD
// ─────────────────────────────────────────────────────────────
const ColumnCard = ({ item, darkMode }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`
        rounded-xl border transition-colors duration-200
        ${darkMode
          ? "bg-gray-900 border-gray-800 hover:border-gray-700"
          : "bg-white border-gray-200 hover:border-gray-300"
        }
      `}
    >
      {/* ── Card Header ── */}
      <div className="px-5 py-4">

        {/* Column name + expand toggle */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`
                px-2 py-0.5 rounded text-xs font-medium
                ${darkMode ? "bg-green-900/40 text-green-300" : "bg-green-50 text-green-700"}
              `}
            >
              123
            </span>
            <h3
              className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {item.column}
            </h3>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className={`text-xs px-2 py-1 rounded-lg transition-colors ${
              darkMode
                ? "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            }`}
          >
            {expanded ? "Less ▲" : "More ▼"}
          </button>
        </div>

        {/* Human-readable sentence */}
        <p
          className={`text-sm leading-relaxed mb-4 ${
            darkMode ? "text-gray-400" : "text-gray-600"
          }`}
        >
          {item.text}
        </p>

        {/* ── Stat Pills Row ── */}
        <div className="grid grid-cols-4 gap-2">
          <StatPill label="Mean"  value={fmt(item.stats.mean)} darkMode={darkMode} color="green"  />
          <StatPill label="Min"   value={fmt(item.stats.min)}  darkMode={darkMode} color="emerald" />
          <StatPill label="Max"   value={fmt(item.stats.max)}  darkMode={darkMode} color="amber"   />
          <StatPill label="Count" value={fmt(item.stats.count)} darkMode={darkMode} color="green" />
        </div>
      </div>

      {/* ── Expanded: Full Stats Table ── */}
      {expanded && (
        <div
          className={`
            px-5 pb-4 pt-2 border-t
            ${darkMode ? "border-gray-800" : "border-gray-100"}
          `}
        >
          <p className={`text-xs font-medium mb-3 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
            Full statistics
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {[
              { label: "Standard deviation", key: "std"  },
              { label: "25th percentile",    key: "25%"  },
              { label: "Median (50%)",        key: "50%"  },
              { label: "75th percentile",    key: "75%"  },
            ].map(({ label, key }) => (
              <div key={key} className="flex items-center justify-between">
                <span className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                  {label}
                </span>
                <span className={`text-xs font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  {fmt(item.stats[key])}
                </span>
              </div>
            ))}
          </div>

          {/* ── Insights ── */}
          {item.insights?.length > 0 && (
            <div className="mt-4">
              <p className={`text-xs font-medium mb-2 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                Insights
              </p>
              <ul className="flex flex-col gap-1.5">
                {item.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 text-xs mt-0.5">⚠</span>
                    <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                      {insight}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


// ─────────────────────────────────────────────────────────────
// SUMMARY CARD COMPONENT
// Props:
//   darkMode  — boolean for theme
//   uploadKey — a value that changes whenever a new file is
//               uploaded (e.g. uploadData.session_id), used to
//               retrigger the fetch. The summary itself is read
//               from the session server-side — no file object
//               needs to be passed in anymore.
// ─────────────────────────────────────────────────────────────
const SummaryCard = ({ darkMode, uploadKey }) => {
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  // ── Fetch summary whenever the active session changes ──
  useEffect(() => {
    if (!uploadKey) return;

    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      setSummary(null);

      const { data, error: err } = await getSummary();

      if (err) {
        setError(err);
      } else {
        setSummary(data);
      }

      setLoading(false);
    };

    fetchSummary();
  }, [uploadKey]);


  // ── LOADING STATE ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          Generating summary...
        </p>
      </div>
    );
  }

  // ── ERROR STATE ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <span className="text-4xl">⚠️</span>
        <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>
          Could not generate summary
        </p>
        <p className="text-sm text-red-400 max-w-sm">{error}</p>
      </div>
    );
  }

  // ── NO NUMERIC COLUMNS ──
  if (summary && summary.summary.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <span className="text-4xl">📭</span>
        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          {summary.message}
        </p>
      </div>
    );
  }

  // ── EMPTY STATE ──
  if (!summary) return null;

  return (
    <div className="w-full">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2
            className={`text-base font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Data Summary
          </h2>
          <p className={`text-xs mt-0.5 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
            {summary.message}
          </p>
        </div>

        {/* Dataset overview pills */}
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            darkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"
          }`}>
            {summary.total_rows?.toLocaleString()} rows
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            darkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"
          }`}>
            {summary.total_columns} columns
          </span>
        </div>
      </div>

      {/* ── Column Cards ── */}
      <div className="flex flex-col gap-4">
        {summary.summary.map((item) => (
          <ColumnCard
            key={item.column}
            item={item}
            darkMode={darkMode}
          />
        ))}
      </div>

    </div>
  );
};

export default SummaryCard;
