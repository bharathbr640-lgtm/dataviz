// Name: DataViz Tool - Axios API Utility
// All backend API calls are centralized here
// Import these functions in any component that needs data

import axios from "axios";

// ─────────────────────────────────────────────────────────────
// BASE URL — points to FastAPI backend
// Change this if your backend runs on a different port
// ─────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─────────────────────────────────────────────────────────────
// AXIOS INSTANCE
// All requests go through this instance
// Timeout set to 30s for large file uploads
// ─────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});


// ─────────────────────────────────────────────────────────────
// SESSION ID
// The backend now scopes each uploaded dataset to a session,
// returned as `session_id` from POST /upload. Every subsequent
// call (/chart, /summary, /filter, /reset-filter, /correlation,
// /export) must send it back via the "X-Session-Id" header.
//
// Kept as a module-level variable + a request interceptor so that
// every component using these API functions gets the header
// attached automatically — nobody has to remember to pass it in.
// setSessionId() is called once, right after a successful upload.
// ─────────────────────────────────────────────────────────────
let currentSessionId = null;

export const setSessionId = (sessionId) => {
  currentSessionId = sessionId || null;
};

export const getSessionId = () => currentSessionId;

api.interceptors.request.use((config) => {
  if (currentSessionId) {
    config.headers["X-Session-Id"] = currentSessionId;
  }
  return config;
});


// ─────────────────────────────────────────────────────────────
// HELPER: Build a FormData object with a file attached
// Used by routes that send a file to the backend (currently
// only /upload — /summary now reads from the session instead).
// ─────────────────────────────────────────────────────────────
const buildFormData = (file, extraFields = {}) => {
  const formData = new FormData();
  formData.append("file", file);
  Object.entries(extraFields).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
};


// ─────────────────────────────────────────────────────────────
// HELPER: Extract a clean error message from axios errors
// Returns a user-friendly string, not a raw axios error object
// ─────────────────────────────────────────────────────────────
const extractError = (error) => {
  if (error.response) {
    // Backend returned an error response (4xx, 5xx)
    const detail = error.response.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((d) => d.msg).join(", ");
    return `Server error: ${error.response.status}`;
  }
  if (error.request) {
    // Request was made but no response received
    return "No response from server. Make sure the backend is running on port 8000.";
  }
  // Something else went wrong
  return error.message || "An unexpected error occurred.";
};


// ─────────────────────────────────────────────────────────────
// API 1: uploadFile
// POST /upload
// Sends the file to the backend, then stores the returned
// session_id so all subsequent calls are scoped to this upload.
// Returns: session_id, filename, shape, columns, col_types,
//          preview, suggestions, overview
// ─────────────────────────────────────────────────────────────
export const uploadFile = async (file) => {
  try {
    const formData = buildFormData(file);
    const response = await api.post("/upload", formData);
    setSessionId(response.data?.session_id);
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: extractError(error) };
  }
};


// ─────────────────────────────────────────────────────────────
// API 2: getChartData
// POST /chart
// Sends x_col + y_col + chart_type (+ optional bins override and
// useFiltered flag) via the session identified by X-Session-Id.
// Returns: chart_type, x_col, y_col, data (x/y arrays or labels/values)
// ─────────────────────────────────────────────────────────────
export const getChartData = async (xCol, yCol, chartType, options = {}) => {
  try {
    const { bins = 0, useFiltered = false } = options;
    const response = await api.post("/chart", {
      x_col:        xCol,
      y_col:        yCol || "",
      chart_type:   chartType,
      bins,
      use_filtered: useFiltered,
    });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: extractError(error) };
  }
};


// ─────────────────────────────────────────────────────────────
// API 3: getSummary
// POST /summary
// No longer sends the file — the backend reads the dataframe
// already stored in the session from /upload, via X-Session-Id.
// Returns: summary array with text, stats, insights per column
// ─────────────────────────────────────────────────────────────
export const getSummary = async () => {
  try {
    const response = await api.post("/summary");
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: extractError(error) };
  }
};


// ─────────────────────────────────────────────────────────────
// API 4: checkHealth
// GET /health
// Checks if the backend is reachable before doing anything
// Call this on app load to show a connection status indicator
// ─────────────────────────────────────────────────────────────
export const checkHealth = async () => {
  try {
    const response = await api.get("/health");
    return { online: true, message: response.data.message };
  } catch (error) {
    return { online: false, message: extractError(error) };
  }
};


// ─────────────────────────────────────────────────────────────
// API 5: filterData
// POST /filter
// Accepts an array of { column, operator, value } conditions and
// sends them as { conditions: [...] }. Conditions are AND-composed
// and stacked server-side onto the session's current filtered_df —
// so calling this again narrows further rather than restarting
// from the original upload. Call resetFilter() to start over.
//
// For convenience this also accepts a single condition object
// (not wrapped in an array) and normalizes it, since most callers
// only apply one filter at a time.
// Returns: total_rows, filtered_rows, columns, preview (up to 50 rows)
// ─────────────────────────────────────────────────────────────
export const filterData = async (conditions) => {
  try {
    const conditionList = Array.isArray(conditions) ? conditions : [conditions];
    const response = await api.post("/filter", { conditions: conditionList });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: extractError(error) };
  }
};


// ─────────────────────────────────────────────────────────────
// API 5b: resetFilter
// POST /reset-filter
// Discards any stacked filter conditions and restores the
// session's working dataframe back to the original upload.
// Returns: total_rows, filtered_rows, columns, preview
// ─────────────────────────────────────────────────────────────
export const resetFilter = async () => {
  try {
    const response = await api.post("/reset-filter");
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: extractError(error) };
  }
};


// ─────────────────────────────────────────────────────────────
// API 6: getCorrelation
// GET /correlation
// Returns: { columns: [...], matrix: [[...]] }
// ─────────────────────────────────────────────────────────────
export const getCorrelation = async () => {
  try {
    const response = await api.get("/correlation");
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: extractError(error) };
  }
};


// ─────────────────────────────────────────────────────────────
// API 7: exportCsv
// GET /export
// Triggers a CSV file download of the session's current
// filtered_df (identical to the original upload if no filters
// have been applied). Sends X-Session-Id via fetch headers
// directly, since this bypasses the axios instance to get a Blob.
// Returns the raw fetch Response so the caller can call .blob()
// ─────────────────────────────────────────────────────────────
export const exportCsv = async () => {
  try {
    const res = await fetch(`${BASE_URL}/export`, {
      headers: currentSessionId ? { "X-Session-Id": currentSessionId } : {},
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { blob: null, error: body.detail || `Server error: ${res.status}` };
    }
    const blob = await res.blob();
    return { blob, error: null };
  } catch (error) {
    return { blob: null, error: error.message || "Export failed." };
  }
};
