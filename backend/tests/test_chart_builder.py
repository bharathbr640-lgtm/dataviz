# Name: test_chart_builder.py
# Pytest suite for utils/chart_builder.py
#
# Run from the backend/ directory with:
#   pytest tests/test_chart_builder.py -v

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pandas as pd
import pytest
from fastapi import HTTPException

from utils.chart_builder import (
    build_chart_data,
    _build_bar,
    _build_line,
    _build_pie,
    _build_scatter,
    _build_histogram,
    _build_area,
    _adaptive_bin_count,
    get_chart_suggestions,
)


# ─────────────────────────────────────────────────────────────
# FIXTURES
# ─────────────────────────────────────────────────────────────
@pytest.fixture
def basic_df():
    return pd.DataFrame({
        "category": ["A", "B", "A", "C", "B", "A"],
        "region":   ["North", "South", "North", "East", "South", "West"],
        "sales":    [100, 200, 150, 300, 250, 120],
        "profit":   [10, 40, 20, 60, 45, 15],
        "date":     pd.to_datetime([
            "2024-01-01", "2024-01-05", "2024-01-03",
            "2024-01-10", "2024-01-07", "2024-01-02"
        ]),
    })


@pytest.fixture
def numeric_df():
    return pd.DataFrame({"value": [1, 2, 2, 3, 3, 3, 4, 4, 5, 100]})  # includes an outlier


@pytest.fixture
def constant_df():
    return pd.DataFrame({"value": [5, 5, 5, 5, 5]})


@pytest.fixture
def single_row_df():
    return pd.DataFrame({"value": [42]})


# ─────────────────────────────────────────────────────────────
# build_chart_data: validation / routing
# ─────────────────────────────────────────────────────────────
class TestBuildChartDataValidation:
    def test_unsupported_chart_type_raises_400(self, basic_df):
        with pytest.raises(HTTPException) as exc:
            build_chart_data(basic_df, "category", "pyramid")
        assert exc.value.status_code == 400

    def test_missing_x_col_raises_400(self, basic_df):
        with pytest.raises(HTTPException) as exc:
            build_chart_data(basic_df, "nonexistent", "bar")
        assert exc.value.status_code == 400

    def test_missing_y_col_in_multi_series_raises_400(self, basic_df):
        with pytest.raises(HTTPException):
            build_chart_data(basic_df, "category", "bar", y_col="sales,nonexistent")

    def test_chart_type_case_insensitive(self, basic_df):
        result = build_chart_data(basic_df, "category", "BAR")
        assert result["chart_type"] == "bar"

    def test_pie_does_not_require_y_col_validation(self, basic_df):
        # Should not raise even though y_col references a nonexistent column,
        # because pie charts ignore y_col entirely.
        result = build_chart_data(basic_df, "category", "pie", y_col="nonexistent")
        assert result["chart_type"] == "pie"


# ─────────────────────────────────────────────────────────────
# Bar chart
# ─────────────────────────────────────────────────────────────
class TestBarChart:
    def test_bar_no_y_col_uses_value_counts(self, basic_df):
        result = _build_bar(basic_df, "category", "")
        assert result["y_col"] == "Count"
        assert set(result["data"]["x"]) == {"A", "B", "C"}
        assert sum(result["data"]["y"]) == len(basic_df)

    def test_bar_single_numeric_y_groups_and_sums(self, basic_df):
        result = _build_bar(basic_df, "category", "sales")
        assert result["y_col"] == "sales"
        # category A rows: 100 + 150 + 120 = 370
        a_index = result["data"]["x"].index("A")
        assert result["data"]["y"][a_index] == 370

    def test_bar_multi_series_y(self, basic_df):
        result = _build_bar(basic_df, "category", "sales,profit")
        assert "series" in result["data"]
        assert len(result["data"]["series"]) == 2
        names = {s["name"] for s in result["data"]["series"]}
        assert names == {"sales", "profit"}

    def test_bar_non_numeric_y_raises_400(self, basic_df):
        with pytest.raises(HTTPException) as exc:
            _build_bar(basic_df, "category", "region")
        assert exc.value.status_code == 400


# ─────────────────────────────────────────────────────────────
# Line chart
# ─────────────────────────────────────────────────────────────
class TestLineChart:
    def test_line_requires_y_col(self, basic_df):
        with pytest.raises(HTTPException) as exc:
            _build_line(basic_df, "date", "")
        assert exc.value.status_code == 400

    def test_line_sorts_by_datetime_x(self, basic_df):
        result = _build_line(basic_df, "date", "sales")
        dates = result["data"]["x"]
        assert dates == sorted(dates)

    def test_line_non_numeric_y_raises_400(self, basic_df):
        with pytest.raises(HTTPException):
            _build_line(basic_df, "date", "region")

    def test_line_multi_series(self, basic_df):
        result = _build_line(basic_df, "date", "sales,profit")
        assert "series" in result["data"]
        assert len(result["data"]["series"]) == 2


# ─────────────────────────────────────────────────────────────
# Pie chart
# ─────────────────────────────────────────────────────────────
class TestPieChart:
    def test_pie_returns_labels_and_values(self, basic_df):
        result = _build_pie(basic_df, "category")
        assert len(result["data"]["labels"]) == len(result["data"]["values"])
        assert sum(result["data"]["values"]) == len(basic_df)

    def test_pie_caps_at_10_categories(self):
        df = pd.DataFrame({"cat": [f"c{i}" for i in range(15)]})
        result = _build_pie(df, "cat")
        assert len(result["data"]["labels"]) <= 10

    def test_pie_empty_column_raises_400(self):
        df = pd.DataFrame({"cat": pd.Series([], dtype="object")})
        with pytest.raises(HTTPException) as exc:
            _build_pie(df, "cat")
        assert exc.value.status_code == 400


# ─────────────────────────────────────────────────────────────
# Scatter chart
# ─────────────────────────────────────────────────────────────
class TestScatterChart:
    def test_scatter_requires_y_col(self, basic_df):
        with pytest.raises(HTTPException) as exc:
            _build_scatter(basic_df, "sales", "")
        assert exc.value.status_code == 400

    def test_scatter_requires_numeric_x(self, basic_df):
        with pytest.raises(HTTPException):
            _build_scatter(basic_df, "region", "sales")

    def test_scatter_requires_numeric_y(self, basic_df):
        with pytest.raises(HTTPException):
            _build_scatter(basic_df, "sales", "region")

    def test_scatter_returns_paired_xy(self, basic_df):
        result = _build_scatter(basic_df, "sales", "profit")
        assert len(result["data"]["x"]) == len(result["data"]["y"]) == len(basic_df)

    def test_scatter_drops_nulls(self):
        df = pd.DataFrame({"x": [1, 2, None, 4], "y": [10, None, 30, 40]})
        result = _build_scatter(df, "x", "y")
        # only rows where BOTH x and y are non-null survive: rows 0 and 3
        assert len(result["data"]["x"]) == 2


# ─────────────────────────────────────────────────────────────
# Histogram — this is the branch that changed (adaptive binning)
# ─────────────────────────────────────────────────────────────
class TestHistogram:
    def test_histogram_requires_numeric_column(self, basic_df):
        with pytest.raises(HTTPException):
            _build_histogram(basic_df, "region")

    def test_histogram_empty_column_raises_400(self):
        df = pd.DataFrame({"value": pd.Series([], dtype="float64")})
        with pytest.raises(HTTPException):
            _build_histogram(df, "value")

    def test_histogram_explicit_bins_overrides_adaptive(self, numeric_df):
        result = _build_histogram(numeric_df, "value", bins=3)
        assert result["bin_count"] == 3
        assert len(result["data"]["x"]) == 3

    def test_histogram_auto_bin_count_within_clamp_range(self, numeric_df):
        result = _build_histogram(numeric_df, "value", bins=0)
        assert 5 <= result["bin_count"] <= 50

    def test_histogram_constant_column_single_bin(self, constant_df):
        # All values identical -> range is 0 -> adaptive count should degrade to 1 bin
        result = _build_histogram(constant_df, "value", bins=0)
        assert result["bin_count"] == 1

    def test_histogram_counts_sum_to_row_count(self, numeric_df):
        result = _build_histogram(numeric_df, "value", bins=0)
        assert sum(result["data"]["y"]) == len(numeric_df)

    def test_adaptive_bin_count_single_row(self, single_row_df):
        assert _adaptive_bin_count(single_row_df["value"]) == 1

    def test_adaptive_bin_count_clamped_upper_bound(self):
        # Large n with wide spread should not exceed the clamp ceiling of 50
        series = pd.Series(range(0, 100000, 7))
        assert _adaptive_bin_count(series) <= 50

    def test_adaptive_bin_count_clamped_lower_bound(self):
        # Small n should not fall below the clamp floor of 5 (unless degenerate)
        series = pd.Series([1, 5, 9, 14, 20, 25])
        assert _adaptive_bin_count(series) >= 5


# ─────────────────────────────────────────────────────────────
# Area chart
# ─────────────────────────────────────────────────────────────
class TestAreaChart:
    def test_area_requires_y_col(self, basic_df):
        with pytest.raises(HTTPException):
            _build_area(basic_df, "date", "")

    def test_area_chart_type_label(self, basic_df):
        result = _build_area(basic_df, "date", "sales")
        assert result["chart_type"] == "area"

    def test_area_multi_series(self, basic_df):
        result = _build_area(basic_df, "date", "sales,profit")
        assert len(result["data"]["series"]) == 2


# ─────────────────────────────────────────────────────────────
# get_chart_suggestions
# ─────────────────────────────────────────────────────────────
class TestChartSuggestions:
    def test_suggests_scatter_for_two_numeric_columns(self, basic_df):
        suggestions = get_chart_suggestions(basic_df)
        types = {s["chart_type"] for s in suggestions}
        assert "scatter" in types  # sales + profit are both numeric

    def test_suggests_bar_for_categorical_and_numeric(self, basic_df):
        suggestions = get_chart_suggestions(basic_df)
        types = {s["chart_type"] for s in suggestions}
        assert "bar" in types

    def test_suggests_line_and_area_for_datetime_and_numeric(self, basic_df):
        suggestions = get_chart_suggestions(basic_df)
        types = {s["chart_type"] for s in suggestions}
        assert "line" in types
        assert "area" in types

    def test_fallback_when_no_columns_match_any_rule(self):
        # An empty dataframe should not crash and should return the bar fallback
        df = pd.DataFrame()
        suggestions = get_chart_suggestions(df)
        assert len(suggestions) == 1
        assert suggestions[0]["chart_type"] == "bar"
