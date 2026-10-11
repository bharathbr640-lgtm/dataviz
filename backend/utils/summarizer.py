# Name: DataViz Tool - Summarizer Utility

import pandas as pd
from fastapi import HTTPException
from utils.file_reader import get_numeric_columns


# ─────────────────────────────────────────────────────────────
# FUNCTION: get_summary
# Main entry point — call this from main.py /summary route
# Uses pandas .describe() to generate stats
# Returns a list of dicts, one per numeric column
# ─────────────────────────────────────────────────────────────
def get_summary(df: pd.DataFrame) -> dict:
    try:
        numeric_cols = get_numeric_columns(df)

        if not numeric_cols:
            return {
                "summary": [],
                "message": "No numeric columns found in this dataset.",
                "total_columns": len(df.columns),
                "total_rows": len(df)
            }

        desc = df[numeric_cols].describe().to_dict()

        summary = []
        for col in numeric_cols:
            stats = desc[col]
            summary.append({
                "column":   col,
                "text":     _build_sentence(col, stats),
                "stats":    _format_stats(stats),
                "insights": _build_insights(col, stats, df)
            })

        return {
            "summary": summary,
            "message": f"Summary generated for {len(numeric_cols)} numeric column(s).",
            "total_columns": len(df.columns),
            "total_rows": len(df)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating summary: {str(e)}"
        )


# ─────────────────────────────────────────────────────────────
# INTERNAL: Build a human-readable sentence from .describe()
# ─────────────────────────────────────────────────────────────
def _build_sentence(col: str, stats: dict) -> str:
    return (
        f"'{col}' has {int(stats['count'])} entries. "
        f"The average is {stats['mean']:.2f}, "
        f"with a minimum of {stats['min']:.2f} "
        f"and a maximum of {stats['max']:.2f}. "
        f"50% of values fall below {stats['50%']:.2f}."
    )


# ─────────────────────────────────────────────────────────────
# INTERNAL: Format raw stats dict for clean JSON output
# Rounds all floats to 2 decimal places
# ─────────────────────────────────────────────────────────────
def _format_stats(stats: dict) -> dict:
    return {
        "count": int(stats["count"]),
        "mean":  round(float(stats["mean"]),  2),
        "std":   round(float(stats["std"]),   2),
        "min":   round(float(stats["min"]),   2),
        "25%":   round(float(stats["25%"]),   2),
        "50%":   round(float(stats["50%"]),   2),
        "75%":   round(float(stats["75%"]),   2),
        "max":   round(float(stats["max"]),   2),
    }


# ─────────────────────────────────────────────────────────────
# INTERNAL: Build extra insights beyond basic .describe()
# Checks for: missing values, skew, outliers, zero-heavy columns
# ─────────────────────────────────────────────────────────────
def _build_insights(col: str, stats: dict, df: pd.DataFrame) -> list:
    insights = []

    total_rows   = len(df)
    missing      = int(df[col].isna().sum())
    missing_pct  = round((missing / total_rows) * 100, 1) if total_rows > 0 else 0

    # Missing values check
    if missing > 0:
        insights.append(
            f"{missing} missing value(s) found ({missing_pct}% of rows)."
        )

    # Skewness check
    try:
        skew = df[col].skew()
        if skew > 1:
            insights.append(
                f"Data is positively skewed ({skew:.2f}) — most values are on the lower end."
            )
        elif skew < -1:
            insights.append(
                f"Data is negatively skewed ({skew:.2f}) — most values are on the higher end."
            )
    except Exception:
        pass

    # Outlier check using IQR method
    try:
        q1  = stats["25%"]
        q3  = stats["75%"]
        iqr = q3 - q1

        if iqr > 0:
            lower_bound = q1 - (1.5 * iqr)
            upper_bound = q3 + (1.5 * iqr)
            outliers    = df[(df[col] < lower_bound) | (df[col] > upper_bound)][col].count()

            if outliers > 0:
                insights.append(
                    f"{outliers} potential outlier(s) detected outside the expected range "
                    f"({lower_bound:.2f} to {upper_bound:.2f})."
                )
    except Exception:
        pass

    # Zero-heavy column check
    try:
        zero_count = int((df[col] == 0).sum())
        zero_pct   = round((zero_count / total_rows) * 100, 1) if total_rows > 0 else 0

        if zero_pct > 30:
            insights.append(
                f"{zero_pct}% of values are zero — column may have sparse data."
            )
    except Exception:
        pass

    # Constant column check
    if stats["min"] == stats["max"]:
        insights.append(
            f"All values in '{col}' are the same ({stats['min']:.2f}) — column has no variation."
        )

    return insights


# ─────────────────────────────────────────────────────────────
# FUNCTION: get_dataset_overview
# Returns a high-level overview of the entire dataset
# Called from /upload to give the user a quick snapshot
# ─────────────────────────────────────────────────────────────
def get_dataset_overview(df: pd.DataFrame) -> dict:
    try:
        numeric_cols     = df.select_dtypes(include="number").columns.tolist()
        categorical_cols = df.select_dtypes(exclude="number").columns.tolist()
        total_missing    = int(df.isna().sum().sum())
        missing_pct      = round((total_missing / df.size) * 100, 1) if df.size > 0 else 0

        return {
            "total_rows":        len(df),
            "total_columns":     len(df.columns),
            "numeric_columns":   len(numeric_cols),
            "categorical_columns": len(categorical_cols),
            "total_missing":     total_missing,
            "missing_pct":       missing_pct,
            "overview_text": (
                f"Your dataset has {len(df)} rows and {len(df.columns)} columns. "
                f"{len(numeric_cols)} column(s) are numeric and "
                f"{len(categorical_cols)} are categorical. "
                f"There are {total_missing} missing value(s) across the entire dataset "
                f"({missing_pct}% of all cells)."
            )
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating dataset overview: {str(e)}"
        )


# ─────────────────────────────────────────────────────────────
# FUNCTION: get_correlation_matrix
# Computes Pearson correlation for all numeric columns
# Returns column names and the 2D matrix as lists of rounded floats
# If fewer than 2 numeric columns exist, returns empty structure
# ─────────────────────────────────────────────────────────────
def get_correlation_matrix(df: pd.DataFrame) -> dict:
    try:
        numeric_cols = df.select_dtypes(include="number").columns.tolist()

        if len(numeric_cols) < 2:
            return {"columns": [], "matrix": []}

        corr = df[numeric_cols].corr()

        matrix = [
            [round(float(corr.loc[row, col]), 2) for col in numeric_cols]
            for row in numeric_cols
        ]

        return {
            "columns": numeric_cols,
            "matrix":  matrix
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error computing correlation matrix: {str(e)}"
        )