# Name: DataViz Tool - Chart Builder Utility

import pandas as pd
import numpy as np
from fastapi import HTTPException
from utils.file_reader import validate_column


# ─────────────────────────────────────────────────────────────
# SUPPORTED CHART TYPES
# ─────────────────────────────────────────────────────────────
SUPPORTED_CHARTS = ("bar", "line", "pie", "scatter", "histogram", "area")


# ─────────────────────────────────────────────────────────────
# FUNCTION: build_chart_data
# Main entry point — call this from main.py /chart route
# Returns a dict ready to be sent as JSON to Plotly.js
# ─────────────────────────────────────────────────────────────
def build_chart_data(
    df: pd.DataFrame,
    x_col: str,
    chart_type: str,
    y_col: str = "",
    bins: int = 0
) -> dict:

    # Normalize chart type to lowercase
    chart_type = chart_type.strip().lower()

    # Validate chart type
    if chart_type not in SUPPORTED_CHARTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported chart type: '{chart_type}'. "
                   f"Supported types are: {', '.join(SUPPORTED_CHARTS)}."
        )

    # Validate x column always
    validate_column(df, x_col)

    # For multi-series charts, validate each comma-separated y column individually
    # Histogram only needs x_col; pie needs no y_col
    if chart_type not in ("pie", "histogram") and y_col:
        for col in [c.strip() for c in y_col.split(",") if c.strip()]:
            validate_column(df, col)

    # Route to the correct builder
    if chart_type == "bar":
        return _build_bar(df, x_col, y_col)
    elif chart_type == "line":
        return _build_line(df, x_col, y_col)
    elif chart_type == "pie":
        return _build_pie(df, x_col)
    elif chart_type == "scatter":
        return _build_scatter(df, x_col, y_col)
    elif chart_type == "histogram":
        return _build_histogram(df, x_col, bins)
    elif chart_type == "area":
        return _build_area(df, x_col, y_col)


# ─────────────────────────────────────────────────────────────
# INTERNAL: Build Bar Chart Data
# Groups by x_col if y_col is categorical
# Sums y_col values per x group if y_col is numeric
# ─────────────────────────────────────────────────────────────
def _build_bar(df: pd.DataFrame, x_col: str, y_col: str) -> dict:
    try:
        y_cols = [c.strip() for c in y_col.split(",") if c.strip()] if y_col else []

        if y_cols:
            # Validate all y columns are numeric
            for col in y_cols:
                if not pd.api.types.is_numeric_dtype(df[col]):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Y axis column '{col}' must be numeric for a bar chart."
                    )

            if len(y_cols) == 1:
                # Single series — group x and sum y
                col = y_cols[0]
                grouped = df.groupby(x_col)[col].sum().reset_index()
                x_data = grouped[x_col].astype(str).tolist()
                return {
                    "chart_type": "bar",
                    "x_col": x_col,
                    "y_col": col,
                    "data": {
                        "x": x_data,
                        "y": grouped[col].fillna(0).tolist()
                    }
                }
            else:
                # Multi-series — group x and sum each y, align on shared x
                grouped = df.groupby(x_col)[y_cols].sum().reset_index()
                x_data = grouped[x_col].astype(str).tolist()
                series = [
                    {"name": col, "y": grouped[col].fillna(0).tolist()}
                    for col in y_cols
                ]
                return {
                    "chart_type": "bar",
                    "x_col": x_col,
                    "y_col": ", ".join(y_cols),
                    "data": {"x": x_data, "series": series}
                }
        else:
            # No y_col — use value counts of x_col
            counts = df[x_col].value_counts().head(20)
            x_data = counts.index.astype(str).tolist()
            y_data = counts.values.tolist()
            return {
                "chart_type": "bar",
                "x_col": x_col,
                "y_col": "Count",
                "data": {
                    "x": x_data,
                    "y": y_data
                }
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error building bar chart: {str(e)}"
        )


# ─────────────────────────────────────────────────────────────
# INTERNAL: Build Line Chart Data
# Best used when x_col is a date or ordered sequence
# y_col should be numeric
# ─────────────────────────────────────────────────────────────
def _build_line(df: pd.DataFrame, x_col: str, y_col: str) -> dict:
    try:
        y_cols = [c.strip() for c in y_col.split(",") if c.strip()] if y_col else []

        if not y_cols:
            raise HTTPException(
                status_code=400,
                detail="Line chart requires a Y axis column."
            )

        # Validate all y columns are numeric
        for col in y_cols:
            if not pd.api.types.is_numeric_dtype(df[col]):
                raise HTTPException(
                    status_code=400,
                    detail=f"Y axis column '{col}' must be numeric for a line chart."
                )

        if len(y_cols) == 1:
            col = y_cols[0]
            working_df = df[[x_col, col]].dropna()
            if pd.api.types.is_datetime64_any_dtype(working_df[x_col]):
                working_df = working_df.sort_values(by=x_col)
            return {
                "chart_type": "line",
                "x_col": x_col,
                "y_col": col,
                "data": {
                    "x": working_df[x_col].astype(str).tolist(),
                    "y": working_df[col].fillna(0).tolist()
                }
            }
        else:
            # Multi-series — build on shared x, drop rows where x is null
            cols_needed = [x_col] + y_cols
            working_df = df[cols_needed].dropna(subset=[x_col])
            if pd.api.types.is_datetime64_any_dtype(working_df[x_col]):
                working_df = working_df.sort_values(by=x_col)
            x_data = working_df[x_col].astype(str).tolist()
            series = [
                {"name": col, "y": working_df[col].fillna(0).tolist()}
                for col in y_cols
            ]
            return {
                "chart_type": "line",
                "x_col": x_col,
                "y_col": ", ".join(y_cols),
                "data": {"x": x_data, "series": series}
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error building line chart: {str(e)}"
        )


# ─────────────────────────────────────────────────────────────
# INTERNAL: Build Pie Chart Data
# Uses value_counts of x_col
# Top 10 categories only to keep chart readable
# ─────────────────────────────────────────────────────────────
def _build_pie(df: pd.DataFrame, x_col: str) -> dict:
    try:
        counts = df[x_col].value_counts().head(10)

        if counts.empty:
            raise HTTPException(
                status_code=400,
                detail=f"Column '{x_col}' has no data to build a pie chart."
            )

        labels = counts.index.astype(str).tolist()
        values = counts.values.tolist()

        return {
            "chart_type": "pie",
            "x_col": x_col,
            "y_col": "Count",
            "data": {
                "labels": labels,
                "values": values
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error building pie chart: {str(e)}"
        )


# ─────────────────────────────────────────────────────────────
# INTERNAL: Build Scatter Chart Data
# Both x_col and y_col must be numeric
# ─────────────────────────────────────────────────────────────
def _build_scatter(df: pd.DataFrame, x_col: str, y_col: str) -> dict:
    try:
        if not y_col:
            raise HTTPException(
                status_code=400,
                detail="Scatter chart requires a Y axis column."
            )

        if not pd.api.types.is_numeric_dtype(df[x_col]):
            raise HTTPException(
                status_code=400,
                detail=f"X axis column '{x_col}' must be numeric for a scatter chart."
            )

        if not pd.api.types.is_numeric_dtype(df[y_col]):
            raise HTTPException(
                status_code=400,
                detail=f"Y axis column '{y_col}' must be numeric for a scatter chart."
            )

        working_df = df[[x_col, y_col]].dropna()

        x_data = working_df[x_col].tolist()
        y_data = working_df[y_col].tolist()

        return {
            "chart_type": "scatter",
            "x_col": x_col,
            "y_col": y_col,
            "data": {
                "x": x_data,
                "y": y_data
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error building scatter chart: {str(e)}"
        )


# ─────────────────────────────────────────────────────────────
# INTERNAL: Compute adaptive bin count using the Freedman-Diaconis rule
#
# FD bin width = 2 * IQR * n^(-1/3)
# bin count    = range / bin width
#
# Falls back to Sturges' rule (ceil(log2(n)) + 1) when the FD rule
# degenerates (e.g. IQR is 0 because most values are identical),
# and finally to a fixed value of 10 if the data is too small/degenerate
# for either formula to produce something sane.
#
# Bin count is always clamped to [5, 50] so the chart never renders
# an unreadable number of bars.
# ─────────────────────────────────────────────────────────────
def _adaptive_bin_count(series: pd.Series) -> int:
    n = len(series)
    if n < 2:
        return 1

    q1, q3 = series.quantile(0.25), series.quantile(0.75)
    iqr = q3 - q1
    data_range = series.max() - series.min()

    if data_range == 0:
        return 1  # every value identical — a single bin is correct

    if iqr > 0:
        bin_width = 2 * iqr * (n ** (-1 / 3))
        if bin_width > 0:
            fd_bins = int(np.ceil(data_range / bin_width))
            if fd_bins > 0:
                return int(np.clip(fd_bins, 5, 50))

    # Fallback: Sturges' rule
    sturges_bins = int(np.ceil(np.log2(n) + 1))
    if sturges_bins > 0:
        return int(np.clip(sturges_bins, 5, 50))

    # Last resort fixed default
    return 10


# ─────────────────────────────────────────────────────────────
# INTERNAL: Build Histogram Data
# Buckets a numeric x_col into bins using pd.cut().
#
# If `bins` is explicitly passed (> 0) that value is used directly,
# letting the frontend offer a manual override. Otherwise the bin
# count is chosen adaptively per-dataset via _adaptive_bin_count(),
# rather than always defaulting to a fixed 10 — a fixed bin count
# looks fine on medium datasets but is misleading on very small or
# very large ones (e.g. 20 rows in 10 bins is mostly empty bars;
# 500,000 rows in 10 bins hides the actual distribution shape).
# ─────────────────────────────────────────────────────────────
def _build_histogram(df: pd.DataFrame, x_col: str, bins: int = 0) -> dict:
    try:
        if not pd.api.types.is_numeric_dtype(df[x_col]):
            raise HTTPException(
                status_code=400,
                detail=f"Column '{x_col}' must be numeric for a histogram."
            )

        series = df[x_col].dropna()

        if series.empty:
            raise HTTPException(
                status_code=400,
                detail=f"Column '{x_col}' has no data to build a histogram."
            )

        bin_count = bins if bins and bins > 0 else _adaptive_bin_count(series)

        cut_bins = pd.cut(series, bins=bin_count)
        bin_counts = cut_bins.value_counts().sort_index()

        # Format bin labels as readable range strings
        bin_labels = [str(interval) for interval in bin_counts.index]
        bin_values = bin_counts.values.tolist()

        return {
            "chart_type": "histogram",
            "x_col": x_col,
            "y_col": "Count",
            "bin_count": bin_count,
            "data": {
                "x": bin_labels,
                "y": bin_values
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error building histogram: {str(e)}"
        )


# ─────────────────────────────────────────────────────────────
# INTERNAL: Build Area Chart Data
# Identical to line chart but returns chart_type = "area"
# Frontend renders with fill = "tozeroy" in Plotly / area fill in Recharts
# ─────────────────────────────────────────────────────────────
def _build_area(df: pd.DataFrame, x_col: str, y_col: str) -> dict:
    try:
        y_cols = [c.strip() for c in y_col.split(",") if c.strip()] if y_col else []

        if not y_cols:
            raise HTTPException(
                status_code=400,
                detail="Area chart requires a Y axis column."
            )

        # Validate all y columns are numeric
        for col in y_cols:
            if not pd.api.types.is_numeric_dtype(df[col]):
                raise HTTPException(
                    status_code=400,
                    detail=f"Y axis column '{col}' must be numeric for an area chart."
                )

        if len(y_cols) == 1:
            col = y_cols[0]
            working_df = df[[x_col, col]].dropna()
            if pd.api.types.is_datetime64_any_dtype(working_df[x_col]):
                working_df = working_df.sort_values(by=x_col)
            return {
                "chart_type": "area",
                "x_col": x_col,
                "y_col": col,
                "data": {
                    "x": working_df[x_col].astype(str).tolist(),
                    "y": working_df[col].fillna(0).tolist()
                }
            }
        else:
            # Multi-series area
            cols_needed = [x_col] + y_cols
            working_df = df[cols_needed].dropna(subset=[x_col])
            if pd.api.types.is_datetime64_any_dtype(working_df[x_col]):
                working_df = working_df.sort_values(by=x_col)
            x_data = working_df[x_col].astype(str).tolist()
            series = [
                {"name": col, "y": working_df[col].fillna(0).tolist()}
                for col in y_cols
            ]
            return {
                "chart_type": "area",
                "x_col": x_col,
                "y_col": ", ".join(y_cols),
                "data": {"x": x_data, "series": series}
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error building area chart: {str(e)}"
        )


# ─────────────────────────────────────────────────────────────
# FUNCTION: get_chart_suggestions
# Looks at column types and suggests best chart types
# Called from /upload route to help frontend guide the user
# ─────────────────────────────────────────────────────────────
def get_chart_suggestions(df: pd.DataFrame) -> list:
    suggestions = []

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    categorical_cols = df.select_dtypes(exclude="number").columns.tolist()
    datetime_cols = df.select_dtypes(include="datetime").columns.tolist()

    if len(numeric_cols) >= 2:
        suggestions.append({
            "chart_type": "scatter",
            "reason": "Two or more numeric columns detected — scatter chart works well."
        })

    if categorical_cols and numeric_cols:
        suggestions.append({
            "chart_type": "bar",
            "reason": "Categorical and numeric columns detected — bar chart works well."
        })

    if datetime_cols and numeric_cols:
        suggestions.append({
            "chart_type": "line",
            "reason": "Date and numeric columns detected — line chart works well."
        })
        suggestions.append({
            "chart_type": "area",
            "reason": "Date and numeric columns detected — area chart shows trends clearly."
        })

    if numeric_cols:
        suggestions.append({
            "chart_type": "histogram",
            "reason": "Numeric column detected — histogram shows value distribution."
        })

    if categorical_cols:
        suggestions.append({
            "chart_type": "pie",
            "reason": "Categorical column detected — pie chart works well for distribution."
        })

    # Default fallback
    if not suggestions:
        suggestions.append({
            "chart_type": "bar",
            "reason": "Bar chart is a safe default for most datasets."
        })

    return suggestions
