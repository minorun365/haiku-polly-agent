"""ツールのユニットテスト"""

import re
from tools.time_tool import get_current_time
from tools.calculator import simple_calculator


class TestGetCurrentTime:
    def test_returns_japanese_time_string(self):
        result = get_current_time()
        assert "JST" in result

    def test_contains_year_month_day(self):
        result = get_current_time()
        assert "年" in result
        assert "月" in result
        assert "日" in result

    def test_contains_weekday(self):
        result = get_current_time()
        weekdays = ["月", "火", "水", "木", "金", "土", "日"]
        assert any(f"({w})" in result for w in weekdays)

    def test_contains_time(self):
        result = get_current_time()
        # HH:MM 形式のチェック
        assert re.search(r"\d{2}:\d{2}", result) is not None


class TestSimpleCalculator:
    def test_addition(self):
        result = simple_calculator("2 + 3")
        assert "= 5" in result

    def test_subtraction(self):
        result = simple_calculator("10 - 3")
        assert "= 7" in result

    def test_multiplication(self):
        result = simple_calculator("4 * 5")
        assert "= 20" in result

    def test_division(self):
        result = simple_calculator("10 / 2")
        assert "= 5" in result

    def test_complex_expression(self):
        result = simple_calculator("(2 + 3) * 4")
        assert "= 20" in result

    def test_decimal(self):
        result = simple_calculator("7 / 3")
        assert "=" in result

    def test_invalid_characters_rejected(self):
        result = simple_calculator("import os")
        assert "エラー" in result

    def test_division_by_zero(self):
        result = simple_calculator("1 / 0")
        assert "エラー" in result
