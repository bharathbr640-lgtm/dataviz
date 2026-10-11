// Name: DataViz Tool - Home Page (Landing + Upload)
// Minimal flat green theme

import { useState, useEffect, useRef } from "react";
import FileUpload from "../components/FileUpload";
import { uploadFile } from "../utils/api";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Area, AreaChart,
} from "recharts";

// ─────────────────────────────────────────────────────────────
// SAMPLE DATA for chart previews
// ─────────────────────────────────────────────────────────────
const SAMPLE_LINE = [
  { m: "Jan", v: 4200 }, { m: "Feb", v: 5800 }, { m: "Mar", v: 4900 },
  { m: "Apr", v: 7200 }, { m: "May", v: 6800 }, { m: "Jun", v: 8400 },
  { m: "Jul", v: 7600 }, { m: "Aug", v: 9100 },
];
const SAMPLE_BAR = [
  { n: "Product A", v: 4800 }, { n: "Product B", v: 7200 },
  { n: "Product C", v: 3600 }, { n: "Product D", v: 6100 },
  { n: "Product E", v: 5400 },
];
const SAMPLE_PIE = [
  { name: "Direct", value: 42 }, { name: "Organic", value: 28 },
  { name: "Referral", value: 18 }, { name: "Social", value: 12 },
];
const SAMPLE_SCATTER = [
  { x: 10, y: 30 }, { x: 20, y: 55 }, { x: 35, y: 45 }, { x: 40, y: 70 },
  { x: 55, y: 60 }, { x: 60, y: 85 }, { x: 70, y: 75 }, { x: 80, y: 95 },
  { x: 25, y: 40 }, { x: 45, y: 65 }, { x: 65, y: 50 }, { x: 75, y: 88 },
];
const PIE_COLORS = ["#22c55e", "#4ade80", "#16a34a", "#86efac"];
const BAR_COLORS = ["#22c55e", "#4ade80", "#16a34a", "#86efac", "#15803d"];
const SCATTER_COLORS = ["#22c55e", "#4ade80", "#16a34a", "#86efac"];


// ─────────────────────────────────────────────────────────────
// ANIMATED COUNTER HOOK
// ─────────────────────────────────────────────────────────────
const useCounter = (end, duration = 2000, startOnView = true) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    if (!startOnView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let start = 0;
          const step = end / (duration / 16);
          const timer = setInterval(() => {
            start += step;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration, startOnView]);

  return [ref, count];
};


// ─────────────────────────────────────────────────────────────
// SCROLL REVEAL HOOK
// ─────────────────────────────────────────────────────────────
const useReveal = (threshold = 0.15) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
};


// ─────────────────────────────────────────────────────────────
// MINI CHART CARD COMPONENT — flat card, no blur
// ─────────────────────────────────────────────────────────────
const MiniChartCard = ({ darkMode, title, delay, children }) => {
  const [ref, visible] = useReveal(0.2);
  return (
    <div
      ref={ref}
      className={`
        rounded-2xl overflow-hidden border transition-colors duration-300
        ${darkMode
          ? "bg-white/[0.03] border-white/[0.06] hover:border-green-500/30"
          : "bg-white border-gray-200 hover:border-green-300"
        }
      `}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
    >
      <div className={`px-4 pt-4 pb-1 text-xs font-semibold tracking-wide uppercase ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
        {title}
      </div>
      <div className="px-2 pb-3 h-[160px]">
        {children}
      </div>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────
// FEATURE CARD COMPONENT — flat card
// ─────────────────────────────────────────────────────────────
const FeatureCard = ({ darkMode, icon, title, desc, delay }) => {
  const [ref, visible] = useReveal(0.2);
  return (
    <div
      ref={ref}
      className={`
        rounded-2xl p-6 border transition-colors duration-300 cursor-default
        ${darkMode
          ? "bg-white/[0.02] border-white/[0.06] hover:border-green-500/25 hover:bg-white/[0.04]"
          : "bg-white border-gray-200 hover:border-green-300 hover:bg-gray-50"
        }
      `}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `all 0.5s ease ${delay}ms`,
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4"
        style={{ background: darkMode ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.08)" }}
      >
        {icon}
      </div>
      <h3
        className={`text-sm font-bold mb-1.5 ${darkMode ? "text-white" : "text-gray-900"}`}
        style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}
      >
        {title}
      </h3>
      <p className={`text-xs leading-relaxed ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
        {desc}
      </p>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────
// STEP CARD COMPONENT (How It Works) — flat, no glow
// ─────────────────────────────────────────────────────────────
const StepCard = ({ darkMode, num, icon, title, desc, delay, isLast }) => {
  const [ref, visible] = useReveal(0.2);
  return (
    <div className="flex flex-col items-center relative" ref={ref}>
      {/* Connector line to next step */}
      {!isLast && (
        <div
          className={`hidden md:block absolute top-7 left-[calc(50%+32px)] w-[calc(100%-64px)] h-px
            ${darkMode ? "bg-green-500/25" : "bg-green-300/40"}
          `}
          style={{
            opacity: visible ? 1 : 0,
            transition: `opacity 0.6s ease ${delay + 300}ms`,
          }}
        />
      )}
      <div
        className="flex flex-col items-center text-center"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: `all 0.5s ease ${delay}ms`,
        }}
      >
        {/* Step circle */}
        <div className="relative mb-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl
              ${darkMode ? "bg-white/[0.05] border border-white/[0.08]" : "bg-white border border-gray-200"}
            `}
          >
            {icon}
          </div>
          {/* Step number */}
          <div
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: "#16a34a" }}
          >
            {num}
          </div>
        </div>
        <h3
          className={`text-sm font-bold mb-1 ${darkMode ? "text-white" : "text-gray-900"}`}
          style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}
        >
          {title}
        </h3>
        <p className={`text-xs leading-relaxed max-w-[180px] ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
          {desc}
        </p>
      </div>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────
// HOME PAGE COMPONENT
// ─────────────────────────────────────────────────────────────
const Home = ({ darkMode, onUploadSuccess }) => {
  const [stats1Ref, stats1Count] = useCounter(10, 1500);
  const [stats2Ref, stats2Count] = useCounter(50, 1800);
  const [stats3Ref, stats3Count] = useCounter(99, 1200);
  const [chartsRef] = useReveal(0.1);
  const [trustRef, trustVisible] = useReveal(0.15);
  const [stepsRef] = useReveal(0.1);

  // Demo CSV data loader
  const handleLoadDemo = () => {
    const csvContent = `Month,Revenue,Expenses,Profit,Customers
Jan,42000,28000,14000,320
Feb,58000,32000,26000,410
Mar,49000,30000,19000,380
Apr,72000,35000,37000,520
May,68000,33000,35000,490
Jun,84000,38000,46000,610
Jul,76000,36000,40000,560
Aug,91000,40000,51000,680
Sep,85000,39000,46000,640
Oct,97000,42000,55000,720
Nov,103000,45000,58000,780
Dec,115000,48000,67000,850`;
    const blob = new Blob([csvContent], { type: "text/csv" });
    const file = new File([blob], "sample_revenue_data.csv", { type: "text/csv" });

    // Simulate upload via API
    const simulateUpload = async () => {
      const { data, error } = await uploadFile(file);
      if (!error && data) {
        onUploadSuccess(file, data);
      }
    };
    simulateUpload();
  };

  return (
    <div
      className={`relative min-h-screen transition-colors duration-300
        ${darkMode ? "bg-gray-950" : "bg-gray-50"}
      `}
    >

      {/* ══════════════════════════════════════════════════════
          SECTION 1 — HERO + UPLOAD
          ══════════════════════════════════════════════════════ */}
      <section className="relative z-10 flex flex-col items-center pt-28 pb-8 px-4">
        <div className="w-full max-w-3xl">

          {/* Badge */}
          <div className="flex justify-center mb-5">
            <span
              className={`
                inline-flex items-center gap-2.5 px-5 py-2
                rounded-full text-xs font-semibold tracking-wide
                border
                ${darkMode
                  ? "bg-green-950/40 border-green-500/20 text-green-300"
                  : "bg-green-50 border-green-200 text-green-700"
                }
              `}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
              Automated Data Analysis — No Code Required
            </span>
          </div>

          {/* Headline */}
          <div className="text-center mb-5">
            <h1
              className={`
                text-5xl md:text-[3.5rem] lg:text-6xl font-extrabold tracking-tight leading-[1.08]
                ${darkMode ? "text-white" : "text-gray-900"}
              `}
              style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}
            >
              Turn your data into{" "}
              <span style={{ color: "#22c55e" }}>beautiful</span>{" "}
              charts
            </h1>
          </div>

          {/* Subtitle */}
          <p
            className={`text-center text-base md:text-lg leading-relaxed max-w-xl mx-auto mb-8
              ${darkMode ? "text-gray-400" : "text-gray-500"}
            `}
          >
            Upload CSV or Excel files and instantly generate interactive charts,
            detailed summaries, trend analysis, and actionable data insights.
          </p>

          {/* Upload Area */}
          <div className="w-full max-w-2xl mx-auto mb-4">
            <FileUpload darkMode={darkMode} onSuccess={onUploadSuccess} />
          </div>

          {/* Try Demo Button */}
          <div className="flex justify-center mt-3 mb-2">
            <button
              onClick={handleLoadDemo}
              className={`
                inline-flex items-center gap-2.5 px-6 py-2.5
                rounded-xl text-sm font-semibold transition-colors duration-200
                border
                ${darkMode
                  ? "bg-white/[0.04] border-white/[0.08] text-gray-300 hover:border-green-500/30 hover:bg-white/[0.07]"
                  : "bg-white border-gray-200 text-gray-600 hover:border-green-300"
                }
              `}
            >
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Try with Sample Dataset
            </button>
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          SECTION 2 — PRODUCT STATS
          ══════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className={`
            grid grid-cols-3 gap-4 rounded-2xl p-5 border
            ${darkMode
              ? "bg-white/[0.02] border-white/[0.05]"
              : "bg-white border-gray-200"
            }
          `}>
            {[
              { ref: stats1Ref, count: stats1Count, suffix: "K+", label: "Files Analyzed", icon: "📄" },
              { ref: stats2Ref, count: stats2Count, suffix: "K+", label: "Charts Generated", icon: "📊" },
              { ref: stats3Ref, count: stats3Count, suffix: ".9%", label: "Uptime", icon: "⚡" },
            ].map((stat, i) => (
              <div key={i} ref={stat.ref} className="flex flex-col items-center text-center py-2">
                <span className="text-lg mb-1">{stat.icon}</span>
                <span
                  className={`text-2xl md:text-3xl font-extrabold tracking-tight ${darkMode ? "text-white" : "text-gray-900"}`}
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {stat.count}{stat.suffix}
                </span>
                <span className={`text-xs font-medium mt-0.5 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          SECTION 3 — WHAT YOU'LL GET
          ══════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2
              className={`text-2xl md:text-3xl font-extrabold tracking-tight mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
              style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}
            >
              What you'll <span style={{ color: "#22c55e" }}>get</span>
            </h2>
            <p className={`text-sm max-w-md mx-auto ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
              Every upload instantly generates a complete analysis suite
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard
              darkMode={darkMode}
              icon={<svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>}
              title="Interactive Charts"
              desc="Bar, line, pie & scatter plots with hover tooltips and smooth animations"
              delay={0}
            />
            <FeatureCard
              darkMode={darkMode}
              icon={<svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>}
              title="Smart Data Summary"
              desc="Detailed statistical analysis and insights for every column"
              delay={100}
            />
            <FeatureCard
              darkMode={darkMode}
              icon={<svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>}
              title="Trend Detection"
              desc="Automatically spots patterns, outliers, and growth trends in your data"
              delay={200}
            />
            <FeatureCard
              darkMode={darkMode}
              icon={<svg className="w-5 h-5 text-lime-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>}
              title="Export Reports"
              desc="Download charts as high-resolution PNGs for presentations and docs"
              delay={300}
            />
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          SECTION 4 — CHART PREVIEW SHOWCASE
          ══════════════════════════════════════════════════════ */}
      <section ref={chartsRef} className="relative z-10 py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2
              className={`text-2xl md:text-3xl font-extrabold tracking-tight mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
              style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}
            >
              Beautiful charts, <span style={{ color: "#22c55e" }}>instantly</span>
            </h2>
            <p className={`text-sm max-w-md mx-auto ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
              See what your data could look like — all generated automatically
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Line Chart */}
            <MiniChartCard darkMode={darkMode} title="Line Chart" delay={0}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={SAMPLE_LINE} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#ffffff08" : "#00000008"} />
                  <XAxis dataKey="m" tick={{ fontSize: 9, fill: darkMode ? "#6b7280" : "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: darkMode ? "#6b7280" : "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Area type="monotone" dataKey="v" stroke="#22c55e" strokeWidth={2} fill="#22c55e" fillOpacity={0.15} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </MiniChartCard>

            {/* Bar Chart */}
            <MiniChartCard darkMode={darkMode} title="Bar Chart" delay={100}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SAMPLE_BAR} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#ffffff08" : "#00000008"} vertical={false} />
                  <XAxis dataKey="n" tick={{ fontSize: 8, fill: darkMode ? "#6b7280" : "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: darkMode ? "#6b7280" : "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Bar dataKey="v" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {SAMPLE_BAR.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </MiniChartCard>

            {/* Pie Chart */}
            <MiniChartCard darkMode={darkMode} title="Pie Chart" delay={200}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={SAMPLE_PIE}
                    cx="50%" cy="50%"
                    innerRadius={30} outerRadius={55}
                    paddingAngle={4}
                    dataKey="value"
                    stroke={darkMode ? "#030712" : "#f9fafb"}
                    strokeWidth={2}
                  >
                    {SAMPLE_PIE.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </MiniChartCard>

            {/* Scatter Plot */}
            <MiniChartCard darkMode={darkMode} title="Scatter Plot" delay={300}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#ffffff08" : "#00000008"} />
                  <XAxis type="number" dataKey="x" tick={{ fontSize: 9, fill: darkMode ? "#6b7280" : "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis type="number" dataKey="y" tick={{ fontSize: 9, fill: darkMode ? "#6b7280" : "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Scatter data={SAMPLE_SCATTER} fillOpacity={0.7}>
                    {SAMPLE_SCATTER.map((_, i) => (
                      <Cell key={i} fill={SCATTER_COLORS[i % 4]} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </MiniChartCard>
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          SECTION 5 — HOW IT WORKS
          ══════════════════════════════════════════════════════ */}
      <section ref={stepsRef} className="relative z-10 py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2
              className={`text-2xl md:text-3xl font-extrabold tracking-tight mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
              style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}
            >
              How it <span style={{ color: "#22c55e" }}>works</span>
            </h2>
            <p className={`text-sm max-w-md mx-auto ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
              From file to insights in under 10 seconds
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard
              darkMode={darkMode}
              num="1"
              icon="📤"
              title="Upload Your File"
              desc="Drag & drop any CSV or Excel file — up to 10MB supported"
              delay={0}
              isLast={false}
            />
            <StepCard
              darkMode={darkMode}
              num="2"
              icon="🧠"
              title="System Analyzes Data"
              desc="Columns are auto-detected and statistical analysis begins instantly"
              delay={200}
              isLast={false}
            />
            <StepCard
              darkMode={darkMode}
              num="3"
              icon="✨"
              title="Explore Insights"
              desc="Interactive charts, data tables, and detailed summaries ready to explore"
              delay={400}
              isLast={true}
            />
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          SECTION 6 — TRUST BADGES
          ══════════════════════════════════════════════════════ */}
      <section ref={trustRef} className="relative z-10 py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>, label: "Secure Processing" },
              { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>, label: "Excel & CSV Support" },
              { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>, label: "Fast Analysis" },
              { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>, label: "Interactive Visuals" },
            ].map((badge, i) => (
              <div
                key={i}
                className={`
                  flex flex-col items-center gap-2 py-5 px-3 rounded-2xl border text-center
                  transition-colors duration-300
                  ${darkMode
                    ? "bg-green-500/5 border-green-500/15"
                    : "bg-green-50/60 border-green-200/60"
                  }
                `}
                style={{
                  opacity: trustVisible ? 1 : 0,
                  transform: trustVisible ? "translateY(0)" : "translateY(16px)",
                  transition: `all 0.5s ease ${i * 100}ms`,
                }}
              >
                <div className={darkMode ? "text-green-400" : "text-green-600"}>{badge.icon}</div>
                <span className={`text-xs font-semibold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          SECTION 7 — BOTTOM CTA
          ══════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className={`text-2xl md:text-3xl font-extrabold tracking-tight mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}
            style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}
          >
            Ready to visualize your <span style={{ color: "#22c55e" }}>data</span>?
          </h2>
          <p className={`text-sm mb-6 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
            No sign-up, no credit card, no limits. Just upload and explore.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="px-8 py-3 rounded-xl text-sm font-bold tracking-wide text-white"
              style={{ background: "#16a34a" }}
            >
              Start Analyzing →
            </button>
            <button
              onClick={handleLoadDemo}
              className={`
                px-6 py-3 rounded-xl text-sm font-semibold border
                transition-colors duration-200
                ${darkMode
                  ? "bg-white/[0.04] border-white/[0.08] text-gray-300 hover:border-green-500/30"
                  : "bg-white border-gray-200 text-gray-600 hover:border-green-300"
                }
              `}
            >
              Load Demo
            </button>
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          FOOTER
          ══════════════════════════════════════════════════════ */}
      <footer className={`relative z-10 py-6 px-4 border-t ${darkMode ? "border-white/[0.04]" : "border-gray-200"}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className={`text-xs ${darkMode ? "text-gray-600" : "text-gray-400"}`}>
            © 2026 DataViz Tool. Built with React & FastAPI.
          </span>
          <div className="flex items-center gap-1">
            <span
              className="text-xs font-bold tracking-tight"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <span className={darkMode ? "text-gray-500" : "text-gray-400"}>Data</span>
              <span style={{ color: "#22c55e" }}>Viz</span>
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Home;
