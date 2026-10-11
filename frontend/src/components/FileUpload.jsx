// Name: DataViz Tool - File Upload Component
// Minimal flat green theme — no blur/glow/shimmer/confetti

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { uploadFile } from "../utils/api";

// ─────────────────────────────────────────────────────────────
// ACCEPTED FILE TYPES
// ─────────────────────────────────────────────────────────────
const ACCEPTED_TYPES = {
  "text/csv":                                                    [".csv"],
  "application/vnd.ms-excel":                                    [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
};

const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;


// ─────────────────────────────────────────────────────────────
// HELPER: Format bytes into readable string
// ─────────────────────────────────────────────────────────────
const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};


// ─────────────────────────────────────────────────────────────
// FILE UPLOAD COMPONENT
// Props:
//   darkMode   — boolean for theme
//   onSuccess  — called with (fileObject, uploadResponseData) after successful upload
// ─────────────────────────────────────────────────────────────
const FileUpload = ({ darkMode, onSuccess }) => {
  const [status, setStatus]       = useState("idle");    // "idle" | "uploading" | "success" | "error"
  const [errorMsg, setErrorMsg]   = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);

  // ── Handle file drop ──
  const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const reason = rejectedFiles[0].errors[0];
      if (reason.code === "file-too-large") {
        setErrorMsg(`File is too large. Maximum size is ${MAX_SIZE_MB}MB.`);
      } else if (reason.code === "file-invalid-type") {
        setErrorMsg("Only CSV and Excel files are supported (.csv, .xlsx, .xls).");
      } else {
        setErrorMsg("Invalid file. Please try again.");
      }
      setStatus("error");
      return;
    }

    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploadedFile(file);
    setStatus("uploading");
    setErrorMsg("");

    // Send file to backend
    const { data, error } = await uploadFile(file);

    if (error) {
      setErrorMsg(error);
      setStatus("error");
      return;
    }

    setStatus("success");
    onSuccess(file, data);
  }, [onSuccess]);


  // ── React Dropzone setup ──
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:   ACCEPTED_TYPES,
    maxSize:  MAX_SIZE_BYTES,
    multiple: false,
  });


  // ── Reset to idle ──
  const handleReset = () => {
    setStatus("idle");
    setErrorMsg("");
    setUploadedFile(null);
  };


  // ── Border color per state ──
  const borderColor = status === "error"
    ? "#ef4444"
    : status === "success"
      ? "#22c55e"
      : isDragActive
        ? "#22c55e"
        : darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";

  const bgColor = status === "error"
    ? (darkMode ? "rgba(239,68,68,0.04)" : "rgba(239,68,68,0.03)")
    : status === "success"
      ? (darkMode ? "rgba(34,197,94,0.05)" : "rgba(34,197,94,0.03)")
      : isDragActive
        ? (darkMode ? "rgba(34,197,94,0.06)" : "rgba(34,197,94,0.04)")
        : (darkMode ? "rgba(255,255,255,0.02)" : "#ffffff");


  return (
    <div className="w-full max-w-2xl mx-auto">

      {/* ── Dropzone Area — flat dashed border, no blur/glow ── */}
      <div
        {...getRootProps()}
        className="relative w-full rounded-2xl cursor-pointer transition-colors duration-200
          flex flex-col items-center justify-center px-8 py-16 gap-4 select-none"
        style={{
          background: bgColor,
          border: `2px dashed ${borderColor}`,
        }}
      >
        <input {...getInputProps()} />

        {/* ── IDLE STATE ── */}
        {status === "idle" && (
          <>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{
                background: darkMode ? "rgba(34,197,94,0.10)" : "rgba(34,197,94,0.08)",
              }}
            >
              {isDragActive ? "📂" : "📁"}
            </div>

            <div className="text-center">
              <p
                className={`text-lg font-semibold mb-1 ${
                  darkMode ? "text-white" : "text-gray-800"
                }`}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {isDragActive ? "Drop your file here" : "Drag & Drop your CSV or Excel file here"}
              </p>
              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                or{" "}
                <span
                  className="font-semibold cursor-pointer"
                  style={{ color: "#22c55e", textDecoration: "underline", textUnderlineOffset: "3px" }}
                >
                  click to browse
                </span>
              </p>
            </div>

            {/* Accepted formats — flat pills */}
            <div className="flex items-center gap-2 mt-3">
              {[".csv", ".xlsx", ".xls"].map((ext) => (
                <span
                  key={ext}
                  className={`
                    px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors duration-200
                    ${darkMode
                      ? "bg-white/[0.04] border-white/[0.08] text-gray-300 hover:border-green-500/30"
                      : "bg-white border-gray-200 text-gray-600 hover:border-green-300"
                    }
                  `}
                >
                  {ext}
                </span>
              ))}
              <span
                className={`text-xs font-medium ${darkMode ? "text-gray-500" : "text-gray-400"}`}
              >
                · Max {MAX_SIZE_MB}MB
              </span>
            </div>
          </>
        )}

        {/* ── UPLOADING STATE — simple flat spinner ── */}
        {status === "uploading" && (
          <>
            <div
              className="w-12 h-12 rounded-full animate-spin"
              style={{ border: "3px solid rgba(34,197,94,0.2)", borderTop: "3px solid #22c55e" }}
            />
            <div className="text-center">
              <p
                className={`text-base font-semibold ${
                  darkMode ? "text-white" : "text-gray-800"
                }`}
              >
                Uploading...
              </p>
              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                {uploadedFile?.name}
              </p>
            </div>
          </>
        )}

        {/* ── SUCCESS STATE — flat checkmark, no confetti ── */}
        {status === "success" && (
          <>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "#16a34a" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <div className="text-center">
              <p
                className={`text-lg font-semibold mb-1 ${
                  darkMode ? "text-white" : "text-gray-800"
                }`}
              >
                File uploaded successfully
              </p>
              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                {uploadedFile?.name} · {formatBytes(uploadedFile?.size || 0)}
              </p>
            </div>

            {/* Upload another file button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleReset(); }}
              className={`
                mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                transition-colors duration-200 border
                ${darkMode
                  ? "bg-white/[0.04] border-white/[0.08] text-gray-300 hover:border-green-500/30"
                  : "bg-white border-gray-200 text-gray-600 hover:border-green-300"
                }
              `}
            >
              Upload another file
            </button>
          </>
        )}

        {/* ── ERROR STATE — flat, no shake animation ── */}
        {status === "error" && (
          <>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
              style={{ background: "#dc2626" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <div className="text-center">
              <p
                className={`text-lg font-semibold mb-1 ${
                  darkMode ? "text-white" : "text-gray-800"
                }`}
              >
                Upload failed
              </p>
              <p className="text-sm text-red-500 max-w-sm">
                {errorMsg}
              </p>
            </div>

            {/* Try again button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleReset(); }}
              className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors duration-200"
              style={{ background: "#dc2626" }}
            >
              Try again
            </button>
          </>
        )}
      </div>

    </div>
  );
};

export default FileUpload;
