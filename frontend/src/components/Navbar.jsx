// Name: DataViz Tool - Navbar Component

import { useState, useEffect } from "react";
import { checkHealth } from "../utils/api";

// ─────────────────────────────────────────────────────────────
// NAVBAR COMPONENT
// Shows: Logo + project name (left), health status + dark mode toggle (right)
// Checks backend health on mount
// Minimal flat style — no blur/glow, single green accent
// ─────────────────────────────────────────────────────────────
const Navbar = ({ darkMode, onToggleDarkMode }) => {
  const [backendStatus, setBackendStatus] = useState("checking"); // "checking" | "online" | "offline"

  // Check backend health on mount
  useEffect(() => {
    const checkBackend = async () => {
      const result = await checkHealth();
      setBackendStatus(result.online ? "online" : "offline");
    };
    checkBackend();
  }, []);

  return (
    <nav
      className={`
        fixed top-0 left-0 right-0 z-50
        flex items-center justify-between
        px-6 py-3
        border-b transition-colors duration-300
        ${darkMode
          ? "bg-gray-950 border-white/5 text-white"
          : "bg-white border-gray-200 text-gray-900"
        }
      `}
    >
      {/* ── LEFT: Logo + Name ── */}
      <div className="flex items-center gap-3">
        {/* Logo Icon — flat green square, no glow */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm tracking-tight text-white"
          style={{ background: "#16a34a" }}
        >
          DV
        </div>

        {/* Project Name */}
        <div className="flex flex-col leading-none">
          <span
            className={`text-base font-semibold tracking-tight ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
            style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}
          >
            Data
            <span style={{ color: "#22c55e" }}>Viz</span>
          </span>
          <span
            className={`text-[10px] font-medium tracking-wide mt-0.5 ${
              darkMode ? "text-gray-500" : "text-gray-400"
            }`}
          >
            CSV &amp; Excel Analyzer
          </span>
        </div>
      </div>

      {/* ── RIGHT: Backend Status + Dark Mode Toggle ── */}
      <div className="flex items-center gap-5">

        {/* Backend Status Indicator */}
        <div className="flex items-center gap-2.5">
          {/* Status dot — flat, no glow/ping */}
          <span
            className={`
              w-2 h-2 rounded-full
              ${backendStatus === "checking" ? "bg-amber-400" : ""}
              ${backendStatus === "online"   ? "bg-green-500" : ""}
              ${backendStatus === "offline"  ? "bg-red-400" : ""}
            `}
          />
          <span
            className={`text-[11px] font-medium tracking-wide ${
              darkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {backendStatus === "checking" && "Connecting…"}
            {backendStatus === "online"   && "Backend online"}
            {backendStatus === "offline"  && "Backend offline"}
          </span>
        </div>

        {/* Divider */}
        <div
          className={`w-px h-5 rounded-full ${
            darkMode ? "bg-white/10" : "bg-gray-300/60"
          }`}
        />

        {/* Dark Mode Toggle — flat pill */}
        <button
          onClick={onToggleDarkMode}
          aria-label="Toggle dark mode"
          className="relative w-14 h-7 rounded-full transition-colors duration-300 ease-in-out
            focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/70 focus-visible:ring-offset-2"
          style={{
            background: darkMode ? "#16a34a" : "#e5e7eb",
          }}
        >
          {/* Toggle thumb */}
          <span
            className={`
              absolute top-[3px]
              w-[22px] h-[22px] rounded-full
              flex items-center justify-center
              transition-all duration-300 ease-out
              ${darkMode
                ? "left-[29px] bg-gray-900"
                : "left-[3px] bg-white"
              }
            `}
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
          >
            {darkMode ? (
              /* Moon icon */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-3 h-3 text-green-300"
              >
                <path
                  fillRule="evenodd"
                  d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.967.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647 1.921a.75.75 0 0 1 .808.083Z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              /* Sun icon */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-3 h-3 text-amber-500"
              >
                <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 5.404a.75.75 0 1 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM6.464 14.596a.75.75 0 1 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM5 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 5 10ZM14.596 15.657a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.06 1.06l1.06 1.06ZM5.404 6.464a.75.75 0 0 0 1.06-1.06l-1.06-1.06a.75.75 0 1 0-1.06 1.06l1.06 1.06Z" />
              </svg>
            )}
          </span>
        </button>

      </div>
    </nav>
  );
};

export default Navbar;
