# Name: DataViz Tool - File Reader Utility

import pandas as pd
import io
from fastapi import HTTPException, UploadFile

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

# ─────────────────────────────────────────────────────────────
# FUNCTION: read_file_with_limit
# Reads an UploadFile in chunks and checks size to prevent OOM
# ─────────────────────────────────────────────────────────────
async def read_file_with_limit(file: UploadFile) -> bytes:
    # If the file size is known beforehand, check it
    if file.size is not None and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File is too large. Maximum allowed size is 50MB."
        )

    content = bytearray()
    chunk_size = 1024 * 1024  # 1MB chunks
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        content.extend(chunk)
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File is too large. Maximum allowed size is 50MB."
            )
    return bytes(content)


# ─────────────────────────────────────────────────────────────
# FUNCTION: load_dataframe
# Reads bytes from an uploaded file into a pandas DataFrame
# Supports: .csv, .xlsx, .xls
# ─────────────────────────────────────────────────────────────
def load_dataframe(file_bytes: bytes, filename: str) -> pd.DataFrame:
    filename_lower = filename.strip().lower()

    if filename_lower.endswith(".csv"):
        df = _read_csv(file_bytes, filename)
    elif filename_lower.endswith((".xlsx", ".xls")):
        df = _read_excel(file_bytes, filename)
    else:
        raise HTTPException(
            status_code=400,
            detail="Only CSV and Excel files are supported. Please upload a .csv, .xlsx, or .xls file."
        )

    df = _clean(df)
    _validate(df, filename)
    return df


# ─────────────────────────────────────────────────────────────
# INTERNAL: Read CSV file
# ─────────────────────────────────────────────────────────────
def _read_csv(file_bytes: bytes, filename: str) -> pd.DataFrame:
    try:
        return pd.read_csv(io.BytesIO(file_bytes))
    except pd.errors.EmptyDataError:
        raise HTTPException(
            status_code=400,
            detail=f"'{filename}' is empty or has no readable data."
        )
    except pd.errors.ParserError:
        raise HTTPException(
            status_code=400,
            detail=f"'{filename}' could not be parsed. Make sure it is a valid CSV file."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error reading CSV '{filename}': {str(e)}"
        )


# ─────────────────────────────────────────────────────────────
# INTERNAL: Read Excel file
# ─────────────────────────────────────────────────────────────
def _read_excel(file_bytes: bytes, filename: str) -> pd.DataFrame:
    try:
        return pd.read_excel(io.BytesIO(file_bytes))
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"'{filename}' could not be read as an Excel file. Make sure it is a valid .xlsx or .xls file. Error: {str(e)}"
        )


# ─────────────────────────────────────────────────────────────
# INTERNAL: Clean the DataFrame
# Drops fully empty rows and columns
# Strips whitespace from column names
# ─────────────────────────────────────────────────────────────
def _clean(df: pd.DataFrame) -> pd.DataFrame:
    # Strip whitespace from column names
    df.columns = df.columns.astype(str).str.strip()

    # Drop fully empty rows
    df.dropna(how="all", inplace=True)

    # Drop fully empty columns
    df.dropna(axis=1, how="all", inplace=True)

    # Reset index after dropping rows
    df.reset_index(drop=True, inplace=True)

    return df


# ─────────────────────────────────────────────────────────────
# INTERNAL: Validate the DataFrame after cleaning
# ─────────────────────────────────────────────────────────────
def _validate(df: pd.DataFrame, filename: str):
    if df.empty:
        raise HTTPException(
            status_code=400,
            detail=f"'{filename}' appears to be empty after cleaning. Please upload a file with actual data."
        )

    if len(df.columns) < 1:
        raise HTTPException(
            status_code=400,
            detail=f"'{filename}' has no readable columns."
        )

    if len(df) < 1:
        raise HTTPException(
            status_code=400,
            detail=f"'{filename}' has no readable rows."
        )


# ─────────────────────────────────────────────────────────────
# FUNCTION: get_column_types
# Returns a dictionary mapping each column to its data type
# Types: "numeric", "datetime", "categorical"
# ─────────────────────────────────────────────────────────────
def get_column_types(df: pd.DataFrame) -> dict:
    col_types = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            col_types[col] = "numeric"
        elif pd.api.types.is_datetime64_any_dtype(df[col]):
            col_types[col] = "datetime"
        else:
            col_types[col] = "categorical"
    return col_types


# ─────────────────────────────────────────────────────────────
# FUNCTION: get_preview
# Returns the first N rows of the DataFrame as a list of dicts
# Fills NaN values with empty string for safe JSON serialization
# ─────────────────────────────────────────────────────────────
def get_preview(df: pd.DataFrame, rows: int = 10) -> list:
    return df.head(rows).fillna("").to_dict(orient="records")


# ─────────────────────────────────────────────────────────────
# FUNCTION: get_numeric_columns
# Returns list of column names that are numeric only
# Used by summarizer.py
# ─────────────────────────────────────────────────────────────
def get_numeric_columns(df: pd.DataFrame) -> list:
    return df.select_dtypes(include="number").columns.tolist()


# ─────────────────────────────────────────────────────────────
# FUNCTION: validate_column
# Checks if a given column name exists in the DataFrame
# Raises a clean 400 error if not found
# ─────────────────────────────────────────────────────────────
def validate_column(df: pd.DataFrame, col_name: str):
    if col_name not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Column '{col_name}' not found in the uploaded file. "
                   f"Available columns: {', '.join(df.columns.tolist())}"
        )