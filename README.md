# DataViz — Data Exploration & Visualization

DataViz is a web application for exploring tabular datasets. Upload a CSV or Excel file, inspect its structure, generate visualizations, filter records, review statistical summaries, and explore correlations.

> **Project status:** This is the current non-AI baseline. The conversational **Ask Your Data** assistant is planned as a future enhancement and is not implemented in this version.

## Features

- Upload CSV and Excel files (maximum 50 MB per file).
- Preview rows, columns, detected data types, and a dataset overview.
- Get chart suggestions and generate bar, line, area, pie, scatter, and histogram visualizations.
- Review statistical summaries and rule-based data-quality indicators such as missing values, skew, and potential outliers.
- Filter records and reset filters.
- Explore Pearson correlations between numeric columns.
- Export filtered data as CSV and download charts as images or PDF.

## Architecture

```text
React + Vite frontend
        |
        | HTTP requests (Axios)
        v
FastAPI backend
        |
        +-- file_reader.py   — file loading, size checks, previews, column types
        +-- chart_builder.py — chart data and chart suggestions
        +-- summarizer.py    — descriptive statistics and correlation matrix
        |
        v
Pandas + NumPy
```

Uploaded datasets are stored in backend memory under a temporary session ID. Inactive sessions expire after one hour. This is a learning/portfolio project, not a production deployment for sensitive data: it currently does not provide user authentication or persistent storage.

## Tech stack

- **Frontend:** React, Vite, Axios, Recharts
- **Backend:** Python, FastAPI, Pandas, NumPy, OpenPyXL
- **Tests:** Pytest for backend chart-building behavior

## Prerequisites

- Python 3.11 or newer (Python 3.12/3.13 is a sensible starting point)
- Node.js 22 or a compatible supported Node.js release
- npm

## Run locally

### 1. Start the backend

Open Terminal in the project root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The API health check is available at <http://127.0.0.1:8000/health>, and interactive API documentation is at <http://127.0.0.1:8000/docs>.

Keep this Terminal window running.

### 2. Start the frontend

Open a second Terminal window and run:

```bash
cd path/to/dataviz-github-ready/frontend
npm install
npm run dev
```

Replace `path/to/dataviz-github-ready` with the actual path to the project folder. Vite will print the local frontend URL (usually <http://localhost:5173>).

If the backend runs at a different URL, create `frontend/.env` with:

```dotenv
VITE_API_URL=http://localhost:8000
```

Do not commit `.env` files, API keys, or credentials.

## Run backend tests

From the project root:

```bash
cd backend
source .venv/bin/activate
pip install -r requirements-dev.txt
pytest -q tests
```

## Sample data

- `sample.csv` — small monthly revenue example.
- `demo.csv` — sample sales records for testing uploads, filters, and charts.

## Planned next step: Ask Your Data

The next development phase is to add a chatbot that lets users ask natural-language questions about their uploaded dataset. The intended design is to let an LLM interpret the question and choose from approved backend analysis operations, while Pandas/NumPy perform the actual calculations. Numerical answers should be grounded in calculated results and validated before display. Local Ollama and cloud model providers can then be compared against the same evaluation dataset.

## Known limitations

- Uploaded data lives in process memory and is not persisted to a database.
- Sessions are temporary and expire after one hour of inactivity.
- The current CORS configuration is intended for local development.
- No AI chatbot or LLM integration is included in this baseline yet.
- Do not upload private or sensitive datasets to an internet-exposed deployment.
