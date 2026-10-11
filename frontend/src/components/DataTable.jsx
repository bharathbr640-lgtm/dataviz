// Name: DataViz Tool - Data Preview Table Component
// Minimal flat green theme

import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";

// ─────────────────────────────────────────────────────────────
// HELPER: Badge color per column type
// ─────────────────────────────────────────────────────────────
const TYPE_BADGE = {
  numeric:     { bg: "bg-green-100 text-green-700",     label: "123" },
  categorical: { bg: "bg-amber-100 text-amber-700",     label: "ABC" },
  datetime:    { bg: "bg-emerald-100 text-emerald-700", label: "DATE" },
};



// ─────────────────────────────────────────────────────────────
// Flat badge styles per type
// ─────────────────────────────────────────────────────────────
const getGlassBadgeDark = (type) => {
  const map = {
    numeric:     { bg: "rgba(34, 197, 94, 0.15)", text: "#4ade80", border: "rgba(34, 197, 94, 0.25)" },
    categorical: { bg: "rgba(245, 158, 11, 0.12)", text: "#fcd34d", border: "rgba(245, 158, 11, 0.2)" },
    datetime:    { bg: "rgba(16, 185, 129, 0.12)", text: "#6ee7b7", border: "rgba(16, 185, 129, 0.2)" },
  };
  return map[type] || { bg: "rgba(156,163,175,0.1)", text: "#9ca3af", border: "rgba(156,163,175,0.15)" };
};

const getGlassBadgeLight = (type) => {
  const map = {
    numeric:     { bg: "rgba(34, 197, 94, 0.08)", text: "#15803d", border: "rgba(34, 197, 94, 0.15)" },
    categorical: { bg: "rgba(245, 158, 11, 0.08)", text: "#b45309", border: "rgba(245, 158, 11, 0.15)" },
    datetime:    { bg: "rgba(16, 185, 129, 0.08)", text: "#047857", border: "rgba(16, 185, 129, 0.15)" },
  };
  return map[type] || { bg: "rgba(156,163,175,0.08)", text: "#6b7280", border: "rgba(156,163,175,0.15)" };
};


// ─────────────────────────────────────────────────────────────
// DATA TABLE COMPONENT
// Props:
//   darkMode  — boolean for theme
//   columns   — string[] of column names from /upload response
//   col_types — { colName: "numeric" | "categorical" | "datetime" }
//   preview   — array of row objects (first 10 rows)
//   shape     — { rows: number, columns: number }
// ─────────────────────────────────────────────────────────────
const DataTable = ({ darkMode, columns, col_types, preview, shape }) => {

  // ── Build TanStack column definitions from column names ──
  const tableColumns = useMemo(() => {
    return columns.map((col) => ({
      accessorKey: col,
      header: col,
      cell: (info) => {
        const val = info.getValue();
        if (val === "" || val === null || val === undefined) {
          return (
            <span className={`text-xs italic ${darkMode ? "text-gray-600" : "text-gray-300"}`}>
              empty
            </span>
          );
        }
        return <span>{String(val)}</span>;
      },
    }));
  }, [columns, darkMode]);

  // ── Build TanStack table instance ──
  const table = useReactTable({
    data:            preview,
    columns:         tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });


  return (
    <div className="w-full">

      {/* ── Header Row: Title + Shape Info ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2
            className="text-lg font-bold"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <span className={darkMode ? "text-white" : "text-gray-900"}>Data </span>
            <span style={{ color: "#22c55e" }}>Preview</span>
          </h2>
          <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
            Showing first {preview.length} of {shape.rows} rows · {shape.columns} columns
          </p>
        </div>

        {/* Column type legend */}
        <div className="flex items-center gap-2">
          {Object.entries(TYPE_BADGE).map(([type, badge]) => {
            const glassBadge = darkMode ? getGlassBadgeDark(type) : getGlassBadgeLight(type);
            return (
              <span
                key={type}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                style={{
                  background: glassBadge.bg,
                  color: glassBadge.text,
                  border: `1px solid ${glassBadge.border}`,
                }}
              >
                {badge.label} {type}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Table Wrapper — flat card ── */}
      <div
        className="w-full overflow-x-auto rounded-2xl transition-colors duration-300"
        style={{
          background: darkMode ? "rgba(255,255,255,0.02)" : "#ffffff",
          border: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        }}
      >
        <table className="w-full text-sm border-collapse">

          {/* ── Table Head ── */}
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                style={{
                  background: darkMode ? "rgba(34,197,94,0.05)" : "rgba(34,197,94,0.03)",
                }}
              >
                {/* Row number header */}
                <th
                  className={`
                    px-4 py-3.5 text-left text-xs font-bold w-12 uppercase tracking-wider
                  `}
                  style={{
                    color: darkMode ? "#6b7280" : "#9ca3af",
                    borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                  }}
                >
                  #
                </th>

                {headerGroup.headers.map((header) => {
                  const colType  = col_types?.[header.column.id] || "categorical";
                  const badge    = TYPE_BADGE[colType];
                  const glassBadge = darkMode ? getGlassBadgeDark(colType) : getGlassBadgeLight(colType);

                  return (
                    <th
                      key={header.id}
                      className="px-4 py-3.5 text-left font-bold whitespace-nowrap"
                      style={{
                        color: darkMode ? "#e5e7eb" : "#374151",
                        borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "0.8rem",
                        letterSpacing: "0.01em",
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Column name */}
                        <span className="truncate max-w-[120px]" title={header.column.id}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {/* Type badge */}
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 uppercase tracking-wider"
                          style={{
                            background: glassBadge.bg,
                            color: glassBadge.text,
                            border: `1px solid ${glassBadge.border}`,
                          }}
                        >
                          {badge.label}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          {/* ── Table Body ── */}
          <tbody>
            {table.getRowModel().rows.map((row, rowIndex) => (
              <tr
                key={row.id}
                className="transition-colors duration-150 group"
                style={{
                  background: darkMode
                    ? rowIndex % 2 === 0
                      ? "rgba(255,255,255,0.01)"
                      : "rgba(255,255,255,0.025)"
                    : rowIndex % 2 === 0
                      ? "#ffffff"
                      : "rgba(249,250,251,0.7)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = darkMode
                    ? "rgba(34,197,94,0.06)"
                    : "rgba(34,197,94,0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = darkMode
                    ? rowIndex % 2 === 0 ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.025)"
                    : rowIndex % 2 === 0 ? "#ffffff" : "rgba(249,250,251,0.7)";
                }}
              >
                {/* Row number cell */}
                <td
                  className="px-4 py-3 text-xs w-12 font-medium"
                  style={{
                    color: darkMode ? "#4b5563" : "#d1d5db",
                    borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"}`,
                  }}
                >
                  {rowIndex + 1}
                </td>

                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-3 whitespace-nowrap max-w-[200px] truncate"
                    style={{
                      color: darkMode ? "#d1d5db" : "#4b5563",
                      borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"}`,
                      fontSize: "0.8125rem",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                    title={String(cell.getValue() ?? "")}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

        </table>
      </div>

      {/* ── Footer: row count note ── */}
      {shape.rows > 10 && (
        <p
          className={`text-xs mt-3 text-right ${darkMode ? "text-gray-600" : "text-gray-400"}`}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Showing 10 of {shape.rows} rows. All rows are used for charts and summary.
        </p>
      )}

    </div>
  );
};

export default DataTable;
