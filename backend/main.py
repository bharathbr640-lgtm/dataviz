# Name: DataViz Tool - FastAPI Backend Entry Point

import uuid
import time
import threading
from typing import Optional, List

from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import pandas as pd
import datetime
import json
import io
import numpy as np

# Import utility modules
from utils.file_reader import load_dataframe, get_column_types, get_preview, read_file_with_limit
from utils.chart_builder import build_chart_data, get_chart_suggestions
from utils.summarizer import get_summary, get_correlation_matrix, get_dataset_overview

app = FastAPI(title="DataViz Tool API", version="2.0.0")

# ─────────────────────────────────────────────────────────────
# CORS — Allow React frontend to communicate with this backend
# ─────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────
# SESSION-BASED DATAFRAME STORE
#
# Each /upload call creates a new session_id (uuid4) and returns
# it in the response body as "session_id". The frontend must send
# that value back on every subsequent call via the
# "X-Session-Id" request header — /chart, /summary, /filter,
# /reset-filter, /correlation, /export all require it.
#
# Each session holds:
#   df           — the original uploaded (cleaned) dataframe, never mutated
#   filtered_df  — the current working dataframe. /filter calls are
#                  AND-composed against this (each call filters further).
#                  /reset-filter restores it back to df.
#   last_access  — epoch seconds, used for TTL cleanup
#
# This replaces the old global `_store = {"df": None}` dict, which was
# shared across every request — meaning two browser tabs (or two users)
# uploading files at the same time would silently overwrite each other's
# data. Sessions isolate each upload.
#
# _sessions is guarded by a lock since uvicorn can serve requests
# concurrently (async event loop + potential multiple workers).
# ─────────────────────────────────────────────────────────────
SESSION_TTL_SECONDS = 60 * 60  # 1 hour of inactivity before a session expires

_sessions: dict = {}
_sessions_lock = threading.Lock()


def _cleanup_expired_sessions() -> None:
    """Remove sessions that haven't been touched in SESSION_TTL_SECONDS."""
    now = time.time()
    with _sessions_lock:
        expired = [
            sid for sid, s in _sessions.items()
            if now - s["last_access"] > SESSION_TTL_SECONDS
        ]
        for sid in expired:
            del _sessions[sid]


def _create_session(df: pd.DataFrame) -> str:
    _cleanup_expired_sessions()
    session_id = str(uuid.uuid4())
    with _sessions_lock:
        _sessions[session_id] = {
            "df": df,
            "filtered_df": df,
            "last_access": time.time(),
        }
    return session_id


def _get_session(session_id: Optional[str]) -> dict:
    """Fetch a session dict by id, raising a clean HTTP error if missing."""
    if not session_id:
        raise HTTPException(
            status_code=400,
            detail="Missing X-Session-Id header. Please upload a file first."
        )
    with _sessions_lock:
        session = _sessions.get(session_id)
        if session is None:
            raise HTTPException(
                status_code=404,
                detail="Session not found or expired. Please upload your file again."
            )
        session["last_access"] = time.time()
        return session


async def get_session_id(x_session_id: Optional[str] = Header(default=None, alias="X-Session-Id")) -> Optional[str]:
    """FastAPI dependency that extracts the X-Session-Id header."""
    return x_session_id


# ─────────────────────────────────────────────────────────────
# HELPER: Safely convert numpy types to native Python types
# ─────────────────────────────────────────────────────────────
def clean_for_json(obj):
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return None if np.isnan(obj) or np.isinf(obj) else float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)):
        return None
    if isinstance(obj, (pd.Timestamp, datetime.datetime, datetime.date)):
        return obj.isoformat()
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    return obj


def sanitize(data: dict) -> dict:
    return json.loads(json.dumps(data, default=clean_for_json))


# ─────────────────────────────────────────────────────────────
# ROUTE 1: POST /upload
# Accepts a CSV or Excel file
# Returns session_id, filename, shape, column names, column types,
# preview, chart suggestions, and a dataset overview.
# Creates a brand-new session (fresh filtered_df = df).
# ─────────────────────────────────────────────────────────────
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        file_bytes = await read_file_with_limit(file)
        df = load_dataframe(file_bytes, file.filename)

        session_id = _create_session(df)

        col_types = get_column_types(df)
        preview = get_preview(df)
        suggestions = get_chart_suggestions(df)
        overview = get_dataset_overview(df)

        return sanitize({
            "session_id": session_id,
            "filename": file.filename,
            "shape": {
                "rows": int(df.shape[0]),
                "columns": int(df.shape[1])
            },
            "columns": df.columns.tolist(),
            "col_types": col_types,
            "preview": preview,
            "suggestions": suggestions,
            "overview": overview
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")


# ─────────────────────────────────────────────────────────────
# CHART REQUEST SCHEMA
# ─────────────────────────────────────────────────────────────
class ChartRequest(BaseModel):
    x_col: str
    y_col: str = ""
    chart_type: str = "bar"
    use_filtered: bool = False  # if True, chart is built from filtered_df instead of df
    bins: int = 0  # optional manual bin count override for histograms; 0 = auto (adaptive)


# ─────────────────────────────────────────────────────────────
# ROUTE 2: POST /chart
# Accepts x_col, y_col, chart_type in JSON body + X-Session-Id header
# Returns chart data as JSON ready for Recharts / Plotly.js
# ─────────────────────────────────────────────────────────────
@app.post("/chart")
async def get_chart(req: ChartRequest, session_id: Optional[str] = Header(default=None, alias="X-Session-Id")):
    try:
        session = _get_session(session_id)
        df = session["filtered_df"] if req.use_filtered else session["df"]

        chart_result = build_chart_data(df, req.x_col, req.chart_type, req.y_col, req.bins)
        return sanitize(chart_result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chart generation error: {str(e)}")


# ─────────────────────────────────────────────────────────────
# ROUTE 3: POST /summary
# Accepts X-Session-Id header only — no file re-upload needed.
# Reads the dataframe already stored in the session from /upload,
# so /summary can never disagree with /upload about which file
# is being described.
# ─────────────────────────────────────────────────────────────
@app.post("/summary")
async def get_summary_route(session_id: Optional[str] = Header(default=None, alias="X-Session-Id")):
    try:
        session = _get_session(session_id)
        summary_result = get_summary(session["df"])
        return sanitize(summary_result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summary error: {str(e)}")


# ─────────────────────────────────────────────────────────────
# ROUTE 4: GET /health
# Simple health check to confirm backend is running
# ─────────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {"status": "ok", "message": "DataViz Tool backend is running."}


# ─────────────────────────────────────────────────────────────
# FILTER REQUEST SCHEMA
# ─────────────────────────────────────────────────────────────
class FilterCondition(BaseModel):
    column: str
    operator: str   # "gt" | "lt" | "eq" | "contains" | "gte" | "lte"
    value: str


class FilterRequest(BaseModel):
    conditions: List[FilterCondition]


def _apply_condition(df: pd.DataFrame, condition: FilterCondition) -> pd.DataFrame:
    """Apply a single filter condition to a dataframe and return the filtered result."""
    column = condition.column
    operator = condition.operator.strip().lower()
    value = condition.value

    if column not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Column '{column}' not found. Available: {', '.join(df.columns.tolist())}"
        )

    valid_operators = {"gt", "lt", "eq", "contains", "gte", "lte"}
    if operator not in valid_operators:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported operator '{operator}'. Valid operators: {', '.join(sorted(valid_operators))}"
        )

    is_numeric = pd.api.types.is_numeric_dtype(df[column])

    if operator in ("gt", "lt", "gte", "lte"):
        if not is_numeric:
            raise HTTPException(
                status_code=400,
                detail=f"Operator '{operator}' requires a numeric column. '{column}' is not numeric."
            )
        try:
            num_value = float(value)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Value '{value}' cannot be cast to a number for operator '{operator}'."
            )

        if operator == "gt":
            mask = df[column] > num_value
        elif operator == "lt":
            mask = df[column] < num_value
        elif operator == "gte":
            mask = df[column] >= num_value
        else:  # lte
            mask = df[column] <= num_value

    elif operator == "eq":
        if is_numeric:
            try:
                num_value = float(value)
                mask = df[column] == num_value
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Value '{value}' cannot be cast to a number for numeric column '{column}'."
                )
        else:
            mask = df[column].astype(str) == value

    else:  # operator == "contains"
        if is_numeric:
            raise HTTPException(
                status_code=400,
                detail=f"Operator 'contains' works on string columns only. '{column}' is numeric."
            )
        mask = df[column].astype(str).str.contains(value, case=False, na=False)

    return df[mask]


# ─────────────────────────────────────────────────────────────
# ROUTE 5: POST /filter
# Accepts a LIST of filter conditions (column, operator, value).
# Conditions are AND-composed and stacked onto the session's
# current filtered_df — so calling /filter repeatedly narrows
# the result further each time, rather than always filtering the
# original upload. Call /reset-filter to start over.
# ─────────────────────────────────────────────────────────────
@app.post("/filter")
async def filter_data(req: FilterRequest, session_id: Optional[str] = Header(default=None, alias="X-Session-Id")):
    try:
        session = _get_session(session_id)

        if not req.conditions:
            raise HTTPException(status_code=400, detail="At least one filter condition is required.")

        working_df = session["filtered_df"]
        for condition in req.conditions:
            working_df = _apply_condition(working_df, condition)

        session["filtered_df"] = working_df

        return sanitize({
            "total_rows":    int(len(session["df"])),
            "filtered_rows": int(len(working_df)),
            "columns":       working_df.columns.tolist(),
            "preview":       working_df.head(50).fillna("").to_dict(orient="records")
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Filter error: {str(e)}")


# ─────────────────────────────────────────────────────────────
# ROUTE 5b: POST /reset-filter
# Resets the session's filtered_df back to the original uploaded
# dataframe, discarding any stacked filter conditions.
# ─────────────────────────────────────────────────────────────
@app.post("/reset-filter")
async def reset_filter(session_id: Optional[str] = Header(default=None, alias="X-Session-Id")):
    try:
        session = _get_session(session_id)
        session["filtered_df"] = session["df"]

        return sanitize({
            "total_rows":    int(len(session["df"])),
            "filtered_rows": int(len(session["df"])),
            "columns":       session["df"].columns.tolist(),
            "preview":       session["df"].head(50).fillna("").to_dict(orient="records")
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset filter error: {str(e)}")


# ─────────────────────────────────────────────────────────────
# ROUTE 6: GET /correlation
# Returns Pearson correlation matrix for all numeric columns
# in the session's original dataframe.
# ─────────────────────────────────────────────────────────────
@app.get("/correlation")
async def get_correlation(session_id: Optional[str] = Header(default=None, alias="X-Session-Id")):
    try:
        session = _get_session(session_id)
        result = get_correlation_matrix(session["df"])
        return sanitize(result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Correlation error: {str(e)}")


# ─────────────────────────────────────────────────────────────
# ROUTE 7: GET /export
# Streams the session's current filtered_df as a downloadable CSV.
# Exports the filtered view (not the raw upload) since that's what
# the user is currently looking at; if no filters were applied,
# filtered_df is identical to df.
# ─────────────────────────────────────────────────────────────
@app.get("/export")
async def export_csv(session_id: Optional[str] = Header(default=None, alias="X-Session-Id")):
    try:
        session = _get_session(session_id)
        df = session["filtered_df"]

        buf = io.StringIO()
        df.to_csv(buf, index=False)
        buf.seek(0)

        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=\"dataviz_export.csv\""}
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export error: {str(e)}")
