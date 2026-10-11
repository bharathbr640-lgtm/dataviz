// Name: DataViz Tool - Root App Component

import { useState } from "react";
import Navbar    from "./components/Navbar";
import Home      from "./pages/Home";
import Dashboard from "./pages/Dashboard";

// ─────────────────────────────────────────────────────────────
// APP COMPONENT
// Controls two things:
//   1. Dark mode state — passed down to all components
//   2. Page state      — "home" or "dashboard"
// ─────────────────────────────────────────────────────────────
const App = () => {
  const [darkMode,    setDarkMode]    = useState(true);
  const [page,        setPage]        = useState("home");  // "home" | "dashboard"
  const [file,        setFile]        = useState(null);
  const [uploadData,  setUploadData]  = useState(null);

  // ── Called by FileUpload after successful /upload response ──
  const handleUploadSuccess = (uploadedFile, data) => {
    setFile(uploadedFile);
    setUploadData(data);
    setPage("dashboard");
  };

  // ── Called by Dashboard when user clicks "Upload new file" ──
  const handleReset = () => {
    setFile(null);
    setUploadData(null);
    setPage("home");
  };

  return (
    <div className={darkMode ? "dark" : ""}>
      <div
        className={`min-h-screen transition-colors duration-500 ${
          darkMode ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"
        }`}
        style={{ fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif" }}
      >
        {/* ── Navbar — always visible ── */}
        <Navbar
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        />

        {/* ── Pages ── */}
        {page === "home" && (
          <Home
            darkMode={darkMode}
            onUploadSuccess={handleUploadSuccess}
          />
        )}

        {page === "dashboard" && file && uploadData && (
          <Dashboard
            darkMode={darkMode}
            file={file}
            uploadData={uploadData}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
};

export default App;
