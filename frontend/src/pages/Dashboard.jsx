// Name: DataViz Tool - Dashboard Page (Main Analysis View)
// Minimal flat green theme — no blur/glow/shimmer

import { useState } from "react";
import DataTable          from "../components/DataTable";
import ColumnSelector      from "../components/ColumnSelector";
import ChartView          from "../components/ChartView";
import SummaryCard        from "../components/SummaryCard";
import FilterPanel        from "../components/FilterPanel";
import CorrelationHeatmap from "../components/CorrelationHeatmap";
import { getChartData }   from "../utils/api";

// ─────────────────────────────────────────────────────────────
// TAB CONFIG
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "preview",     label: "Data Preview",  icon: "📋" },
  { id: "chart",       label: "Charts",         icon: "📊" },
  { id: "summary",     label: "Summary",        icon: "📝" },
  { id: "filter",      label: "Filter",         icon: "🔍" },
  { id: "correlation", label: "Correlation",    icon: "🌡️" },
];

// ─────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
// DASHBOARD PAGE
// Props:
//   darkMode    — boolean for theme
//   file        — raw File object from upload (kept for any
//                 future client-side-only use; API calls no
//                 longer need it since the backend now scopes
//                 data by session_id, not by re-uploading)
//   uploadData  — response from /upload API
//                 { session_id, filename, shape, columns,
//                   col_types, preview, suggestions, overview }
//   onReset     — called when user clicks "Upload new file"
// ─────────────────────────────────────────────────────────────
const Dashboard = ({ darkMode, file, uploadData, onReset }) => {
  const [activeTab,   setActiveTab]   = useState("preview");
  const [chartData,   setChartData]   = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError,  setChartError]  = useState(null);

  // ── Handle Generate Chart from ColumnSelector ──
  const handleGenerate = async ({ xCol, yCol, chartType }) => {
    setChartLoading(true);
    setChartError(null);
    setChartData(null);
    setActiveTab("chart");

    const { data, error } = await getChartData(xCol, yCol, chartType);

    if (error) {
      setChartError(error);
    } else {
      setChartData(data);
    }

    setChartLoading(false);
  };

  return (
    <div
      className={`
        relative min-h-screen pt-16 pb-12 px-4 md:px-8
        transition-colors duration-300
        ${darkMode ? "bg-gray-950" : "bg-gray-50"}
      `}
    >
      <div className="relative z-10 max-w-7xl mx-auto">

        {/* ══════════════════════════════════════════════════════
            DASHBOARD HEADER
        ══════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-8 gap-4">

          {/* Left: File info */}
          <div className="flex items-center gap-4">
            {/* Flat file icon */}
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl"
              style={{
                background: darkMode ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.08)",
              }}
            >
              <span className="text-xl">📄</span>
            </div>

            <div>
              <h1
                className={`text-xl md:text-2xl font-bold tracking-tight ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
                style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}
              >
                {uploadData.filename}
              </h1>

              {/* Row / Column badges */}
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    background: darkMode ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.10)",
                    color: darkMode ? "#4ade80" : "#16a34a",
                    border: `1px solid ${darkMode ? "rgba(34,197,94,0.25)" : "rgba(34,197,94,0.18)"}`,
                  }}
                >
                  <span style={{ fontSize: "10px" }}>▸</span>
                  {uploadData.shape.rows.toLocaleString()} rows
                </span>
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    background: darkMode ? "rgba(107,114,128,0.16)" : "rgba(107,114,128,0.10)",
                    color: darkMode ? "#d1d5db" : "#4b5563",
                    border: `1px solid ${darkMode ? "rgba(107,114,128,0.25)" : "rgba(107,114,128,0.18)"}`,
                  }}
                >
                  <span style={{ fontSize: "10px" }}>▸</span>
                  {uploadData.shape.columns} columns
                </span>
              </div>
            </div>
          </div>

          {/* Right: Upload new file button — flat, bordered */}
          <button
            onClick={onReset}
            className={`
              flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold
              transition-colors duration-200 cursor-pointer
              ${darkMode
                ? "bg-white/[0.04] border border-white/[0.08] text-green-300 hover:bg-white/[0.07] hover:border-green-500/30"
                : "bg-white border border-gray-200 text-green-700 hover:bg-green-50 hover:border-green-300"
              }
            `}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 12V4M8 4L5 7M8 4L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 14H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Upload new file
          </button>
        </div>


        {/* ══════════════════════════════════════════════════════
            MAIN GRID: Left (controls) + Right (output)
        ══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN: Column Selector — flat card ── */}
          <div className="lg:col-span-1">
            <div
              className="rounded-2xl p-5 transition-colors duration-300"
              style={{
                background: darkMode ? "rgba(17,24,39,0.9)" : "#ffffff",
                border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              }}
            >
              <ColumnSelector
                key={uploadData.session_id || uploadData.filename}
                darkMode={darkMode}
                columns={uploadData.columns}
                col_types={uploadData.col_types}
                suggestions={uploadData.suggestions || []}
                isLoading={chartLoading}
                onGenerate={handleGenerate}
              />
            </div>
          </div>

          {/* ── RIGHT COLUMN: Tabs + Content ── */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Webkit scrollbar hide */}
            <style>{`
              .tab-bar-scroll::-webkit-scrollbar { display: none; }
            `}</style>

            {/* ── Segmented Tab Bar — flat, per-tab active pill ── */}
            <div
              className="tab-bar-scroll flex items-center gap-1 p-1.5 rounded-2xl overflow-x-auto"
              style={{
                background: darkMode ? "rgba(17,24,39,0.9)" : "#ffffff",
                border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                               transition-colors duration-200 cursor-pointer whitespace-nowrap flex-shrink-0"
                    style={{
                      fontFamily: "'Inter', 'DM Sans', sans-serif",
                      background: isActive
                        ? darkMode ? "rgba(34,197,94,0.16)" : "#f0fdf4"
                        : "transparent",
                      border: isActive
                        ? `1px solid ${darkMode ? "rgba(34,197,94,0.30)" : "rgba(34,197,94,0.25)"}`
                        : "1px solid transparent",
                      color: isActive
                        ? darkMode ? "#4ade80" : "#16a34a"
                        : darkMode ? "#6b7280" : "#9ca3af",
                    }}
                  >
                    <span style={{ fontSize: "14px" }}>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ── TAB CONTENT AREA ── */}

            {/* ── TAB: Data Preview ── */}
            {activeTab === "preview" && (
              <div
                className="rounded-2xl p-5 transition-colors duration-300"
                style={{
                  background: darkMode ? "rgba(17,24,39,0.9)" : "#ffffff",
                  border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                }}
              >
                <DataTable
                  darkMode={darkMode}
                  columns={uploadData.columns}
                  col_types={uploadData.col_types}
                  preview={uploadData.preview}
                  shape={uploadData.shape}
                />
              </div>
            )}

            {/* ── TAB: Charts ── */}
            {activeTab === "chart" && (
              <ChartView
                darkMode={darkMode}
                chartData={chartData}
                isLoading={chartLoading}
                error={chartError}
              />
            )}

            {/* ── TAB: Summary ── */}
            {activeTab === "summary" && (
              <div
                className="rounded-2xl p-5 transition-colors duration-300"
                style={{
                  background: darkMode ? "rgba(17,24,39,0.9)" : "#ffffff",
                  border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                }}
              >
                <SummaryCard
                  darkMode={darkMode}
                  uploadKey={uploadData.session_id || uploadData.filename}
                />
              </div>
            )}

            {/* ── TAB: Filter ── */}
            {activeTab === "filter" && (
              <div
                className="rounded-2xl p-5 transition-colors duration-300"
                style={{
                  background: darkMode ? "rgba(17,24,39,0.9)" : "#ffffff",
                  border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                }}
              >
                <FilterPanel
                  darkMode={darkMode}
                  columns={uploadData.columns}
                  col_types={uploadData.col_types}
                  fileUploaded={!!uploadData}
                />
              </div>
            )}

            {/* ── TAB: Correlation Heatmap ── */}
            {activeTab === "correlation" && (
              <div
                className="rounded-2xl p-5 transition-colors duration-300"
                style={{
                  background: darkMode ? "rgba(17,24,39,0.9)" : "#ffffff",
                  border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                }}
              >
                <CorrelationHeatmap
                  darkMode={darkMode}
                  fileUploaded={!!uploadData}
                  uploadKey={uploadData.session_id || uploadData.filename}
                />
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
